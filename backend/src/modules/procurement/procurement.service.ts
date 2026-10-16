// backend/src/modules/procurement/procurement.service.ts
// added BadRequestException import
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository, Not } from 'typeorm';
import { Procurement, ProcurementStatus } from './entities/procurement.entity';
import { CreateProcurementDto } from './dto/create-procurement.dto';
import { UpdateProcurementDto } from './dto/update-procurement.dto';
import { AdminProcurementQueryDto } from './dto/admin-query.dto';
// CHANGED: status audit log (spec 003)
import { AuditActor } from '../audit/audit-actor';
import { AuditedEntityType } from '../audit/audit-entity-type';
import { EntityAuditService } from '../audit/entity-audit.service';

export interface PaginatedProcurements {
  data: Procurement[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class ProcurementService {
  constructor(
    @InjectRepository(Procurement)
    private readonly repo: Repository<Procurement>,
    // CHANGED: status changes and their audit entries share one transaction
    private readonly dataSource: DataSource,
    private readonly audit: EntityAuditService,
  ) {}

  // Returns every non-draft record so users see full history (cancelled, completed, etc.)
  findAllPublic(): Promise<Procurement[]> {
    return this.repo.find({
      where: { status: Not(ProcurementStatus.DRAFT) },
      order: { publicationDate: 'DESC', createdAt: 'DESC' },
    });
  }

  // replaces findAll() — paginated + filtered for admin grid
  async findAllForAdmin(
    query: AdminProcurementQueryDto,
  ): Promise<PaginatedProcurements> {
    const qb = this.repo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.createdBy', 'createdBy')
      .orderBy('p.createdAt', 'DESC');

    if (query.status) {
      qb.andWhere('p.status = :status', { status: query.status });
    }
    if (query.category) {
      qb.andWhere('p.procurementCategory = :category', {
        category: query.category,
      });
    }
    if (query.method) {
      qb.andWhere('p.procurementMethod = :method', { method: query.method });
    }
    if (query.search) {
      // ILIKE = case-insensitive search across title (UA/EN), referenceNumber and donor
      qb.andWhere(
        '(p.tenderTitleUa ILIKE :s OR p.tenderTitleEn ILIKE :s OR p.referenceNumber ILIKE :s OR p.donor::text ILIKE :s)',
        { s: `%${query.search}%` },
      );
    }

    const [data, total] = await qb
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();

    return { data, total, page: query.page, limit: query.limit };
  }

  async findById(id: string): Promise<Procurement> {
    const item = await this.repo.findOne({
      where: { id },
      relations: ['createdBy'],
    });
    if (!item) throw new NotFoundException('Procurement not found');
    return item;
  }

  async create(
    dto: CreateProcurementDto,
    userId: string,
    actor: AuditActor,
  ): Promise<Procurement> {
    const isPublishing = dto.status === ProcurementStatus.PUBLISHED;

    const item = this.repo.create({
      ...dto,
      createdById: userId,
      publicationDate: dto.publicationDate
        ? new Date(dto.publicationDate)
        : isPublishing
          ? new Date()
          : null,
      clarificationDeadline: dto.clarificationDeadline
        ? new Date(dto.clarificationDeadline)
        : null,
      bidSubmissionDeadline: dto.bidSubmissionDeadline
        ? new Date(dto.bidSubmissionDeadline)
        : null,
      expectedStartDate: dto.expectedStartDate
        ? new Date(dto.expectedStartDate)
        : null,
    });

    // CHANGED: a staff-created record is audited in the same transaction as the insert
    return this.dataSource.transaction(async (manager) => {
      const saved = await manager.save(item);
      const status =
        saved.status ??
        (await manager.findOneByOrFail(Procurement, { id: saved.id })).status;
      await this.audit.recordCreated(
        manager,
        AuditedEntityType.PROCUREMENT,
        saved.id,
        actor,
        status,
      );
      return saved;
    });
  }

  // CHANGED: transaction + row lock; also serves the legacy PATCH :id/publish wrapper
  async update(
    id: string,
    dto: UpdateProcurementDto,
    actor: AuditActor,
  ): Promise<Procurement> {
    await this.dataSource.transaction(async (manager) => {
      const item = await this.lockById(manager, id);
      const oldStatus = item.status;
      const isPublishing =
        dto.status === ProcurementStatus.PUBLISHED &&
        item.status === ProcurementStatus.DRAFT;

      Object.assign(item, {
        ...dto,
        publicationDate: dto.publicationDate
          ? new Date(dto.publicationDate)
          : isPublishing && !item.publicationDate
            ? new Date()
            : item.publicationDate,
        clarificationDeadline: dto.clarificationDeadline
          ? new Date(dto.clarificationDeadline)
          : item.clarificationDeadline,
        bidSubmissionDeadline: dto.bidSubmissionDeadline
          ? new Date(dto.bidSubmissionDeadline)
          : item.bidSubmissionDeadline,
        expectedStartDate: dto.expectedStartDate
          ? new Date(dto.expectedStartDate)
          : item.expectedStartDate,
      });

      await manager.save(item);
      await this.audit.recordUpdate(
        manager,
        AuditedEntityType.PROCUREMENT,
        id,
        actor,
        { oldStatus, newStatus: dto.status },
      );
    });
    return this.findById(id);
  }

  async updateStatus(
    id: string,
    status: ProcurementStatus,
    actor: AuditActor,
  ): Promise<Procurement> {
    await this.dataSource.transaction(async (manager) => {
      const item = await this.lockById(manager, id);
      const oldStatus = item.status;

      const isFirstPublication =
        item.status === ProcurementStatus.DRAFT &&
        status !== ProcurementStatus.DRAFT &&
        !item.publicationDate;

      item.status = status;
      if (isFirstPublication) {
        item.publicationDate = new Date();
      }

      await manager.save(item);
      await this.audit.recordUpdate(
        manager,
        AuditedEntityType.PROCUREMENT,
        id,
        actor,
        { oldStatus, newStatus: status },
      );
    });
    return this.findById(id);
  }

  // enforce draft-only delete; non-drafts must be cancelled via status change
  async remove(id: string, actor: AuditActor): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const item = await this.lockById(manager, id);

      if (item.status !== ProcurementStatus.DRAFT) {
        throw new BadRequestException(
          'Only draft procurements can be deleted. To remove a published procurement, change its status to "cancelled".',
        );
      }

      const status = item.status;
      await manager.remove(item);
      await this.audit.recordDeleted(
        manager,
        AuditedEntityType.PROCUREMENT,
        id,
        actor,
        status,
      );
    });
  }

  // CHANGED: FOR UPDATE keeps the recorded old status truthful under concurrent edits.
  // Deliberately loaded WITHOUT `relations: ['createdBy']`: PostgreSQL rejects
  // FOR UPDATE across the nullable side of an outer join. findById() re-reads with
  // the relation after the transaction, so callers still get `createdBy`.
  private async lockById(
    manager: EntityManager,
    id: string,
  ): Promise<Procurement> {
    const item = await manager.findOne(Procurement, {
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
    if (!item) throw new NotFoundException('Procurement not found');
    return item;
  }
}
