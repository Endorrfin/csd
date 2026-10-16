// backend/src/modules/complaint/complaint.service.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import { Complaint, ComplaintStatus } from './entities/complaint.entity';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { UpdateComplaintDto } from './dto/update-complaint.dto';
import { AdminComplaintQueryDto } from './dto/admin-query.dto';
import { ExportComplaintsQueryDto } from './dto/export-query.dto';
// CHANGED: status audit log (spec 003)
import { AuditActor } from '../audit/audit-actor';
import { AuditedEntityType } from '../audit/audit-entity-type';
import { EntityAuditService } from '../audit/entity-audit.service';

export interface PaginatedComplaints {
  data: Complaint[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class ComplaintService {
  constructor(
    @InjectRepository(Complaint)
    private readonly repo: Repository<Complaint>,
    // CHANGED: status changes and their audit entries share one transaction
    private readonly dataSource: DataSource,
    private readonly audit: EntityAuditService,
  ) {}

  findAll(): Promise<Complaint[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  // paginated + filtered admin grid
  async findAllForAdmin(
    query: AdminComplaintQueryDto,
  ): Promise<PaginatedComplaints> {
    const qb = this.buildFilterQuery(query);
    qb.orderBy('c.createdAt', 'DESC');

    const [data, total] = await qb
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();

    return { data, total, page: query.page, limit: query.limit };
  }

  // CSV export for donor reporting (GIZ/UNICEF audit requirements)
  async exportCsv(query: ExportComplaintsQueryDto): Promise<string> {
    const qb = this.buildFilterQuery(query);
    qb.orderBy('c.createdAt', 'DESC');
    const records = await qb.getMany();

    const isUa = query.lang === 'ua';
    const headers = isUa
      ? [
          '#',
          'Дата створення',
          'Статус',
          'Категорія',
          'Опис',
          'Очікуване вирішення',
          'Телефон',
          'Email',
          'Область',
          'Громада',
          'Кількість вкладень',
          'Примітки менеджера',
        ]
      : [
          '#',
          'Created',
          'Status',
          'Category',
          'Description',
          'Expected resolution',
          'Phone',
          'Email',
          'Region',
          'Community',
          'Attachments count',
          'Manager notes',
        ];

    const rows = records.map((c, idx) => [
      idx + 1,
      c.createdAt.toISOString().slice(0, 10),
      c.status,
      c.category,
      c.description,
      c.expectedResolution ?? '',
      c.phone ?? '',
      c.email ?? '',
      (isUa ? c.region : c.regionEn) ?? '',
      (isUa ? c.community : c.communityEn) ?? '',
      c.attachments?.length ?? 0,
      c.managerNotes ?? '',
    ]);

    return this.toCsv([headers, ...rows]);
  }

  async findById(id: string): Promise<Complaint> {
    const record = await this.repo.findOne({ where: { id } });
    if (!record) throw new NotFoundException(`Complaint ${id} not found`);
    return record;
  }

  async create(dto: CreateComplaintDto): Promise<Complaint> {
    const entity = this.repo.create({
      ...dto,
      submittedAt: dto.submittedAt ? new Date(dto.submittedAt) : new Date(),
    });
    return this.repo.save(entity);
  }

  // CHANGED: runs in a transaction under a row lock; the audit entry commits with the change
  async update(
    id: string,
    dto: UpdateComplaintDto,
    actor: AuditActor,
  ): Promise<Complaint> {
    await this.dataSource.transaction(async (manager) => {
      const existing = await this.lockById(manager, id);
      await manager.update(Complaint, id, dto);
      await this.audit.recordUpdate(
        manager,
        AuditedEntityType.COMPLAINT,
        id,
        actor,
        {
          oldStatus: existing.status,
          newStatus: dto.status,
          oldNotes: existing.managerNotes,
          newNotes: dto.managerNotes,
        },
      );
    });
    return this.findById(id);
  }

  async updateStatus(
    id: string,
    status: ComplaintStatus,
    managerNotes: string | undefined,
    actor: AuditActor,
  ): Promise<Complaint> {
    await this.dataSource.transaction(async (manager) => {
      const existing = await this.lockById(manager, id);

      const updates: Partial<Complaint> = { status };
      if (managerNotes !== undefined) {
        updates.managerNotes = managerNotes;
      }

      await manager.update(Complaint, id, updates);
      await this.audit.recordUpdate(
        manager,
        AuditedEntityType.COMPLAINT,
        id,
        actor,
        {
          oldStatus: existing.status,
          newStatus: status,
          oldNotes: existing.managerNotes,
          newNotes: managerNotes,
        },
      );
    });
    return this.findById(id);
  }

  // CHANGED: only CLOSED complaints can be hard-deleted (initial stage — test complaints)
  async remove(id: string, actor: AuditActor): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const existing = await this.lockById(manager, id);

      if (existing.status !== ComplaintStatus.CLOSED) {
        throw new BadRequestException(
          'Only closed complaints can be deleted. Close it first to remove.',
        );
      }

      await manager.delete(Complaint, id);
      await this.audit.recordDeleted(
        manager,
        AuditedEntityType.COMPLAINT,
        id,
        actor,
        existing.status,
      );
    });
  }

  // ── Private helpers ──

  // CHANGED: FOR UPDATE keeps the recorded old status truthful under concurrent edits.
  // Complaint has no relations, so the lock cannot span a join.
  private async lockById(
    manager: EntityManager,
    id: string,
  ): Promise<Complaint> {
    const record = await manager.findOne(Complaint, {
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
    if (!record) throw new NotFoundException(`Complaint ${id} not found`);
    return record;
  }

  // Shared filter logic for paginated admin grid + CSV export
  private buildFilterQuery(
    query: AdminComplaintQueryDto | ExportComplaintsQueryDto,
  ): SelectQueryBuilder<Complaint> {
    const qb = this.repo.createQueryBuilder('c');

    if (query.status)
      qb.andWhere('c.status = :status', { status: query.status });
    if (query.category)
      qb.andWhere('c.category = :category', { category: query.category });
    if (query.search) {
      // Search on description + expectedResolution ONLY — never PII fields
      qb.andWhere('(c.description ILIKE :s OR c.expectedResolution ILIKE :s)', {
        s: `%${query.search}%`,
      });
    }

    return qb;
  }

  // Minimal RFC 4180 CSV serializer — escape quotes + wrap any field containing , " or newline
  private toCsv(rows: (string | number)[][]): string {
    return rows
      .map((row) =>
        row
          .map((cell) => {
            const s = String(cell ?? '');
            return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
          })
          .join(','),
      )
      .join('\n');
  }
}
