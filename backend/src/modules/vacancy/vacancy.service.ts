// backend/src/modules/vacancy/vacancy.service.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Not, Repository } from 'typeorm';
import { Vacancy, VacancyStatus } from './entities/vacancy.entity';
import { CreateVacancyDto } from './dto/create-vacancy.dto';
import { UpdateVacancyDto } from './dto/update-vacancy.dto';
import { AdminVacancyQueryDto } from './dto/admin-query.dto';
// CHANGED: status audit log (spec 003)
import { AuditActor } from '../audit/audit-actor';
import { AuditedEntityType } from '../audit/audit-entity-type';
import { EntityAuditService } from '../audit/entity-audit.service';

// paginated shape mirrors PaginatedProcurements
export interface PaginatedVacancies {
  data: Vacancy[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class VacancyService {
  constructor(
    @InjectRepository(Vacancy)
    private readonly repo: Repository<Vacancy>,
    // CHANGED: status changes and their audit entries share one transaction
    private readonly dataSource: DataSource,
    private readonly audit: EntityAuditService,
  ) {}

  // renamed from findAllPublished — now returns every non-draft record
  // so that users see the full history (cancelled, hired, suspended, etc.)
  findAllPublic(): Promise<Vacancy[]> {
    return this.repo.find({
      where: { status: Not(VacancyStatus.DRAFT) },
      order: { publishedAt: 'DESC', createdAt: 'DESC' },
    });
  }

  // paginated + filtered admin grid
  async findAllForAdmin(
    query: AdminVacancyQueryDto,
  ): Promise<PaginatedVacancies> {
    const qb = this.repo.createQueryBuilder('v').orderBy('v.createdAt', 'DESC');

    if (query.status) {
      qb.andWhere('v.status = :status', { status: query.status });
    }
    if (query.employmentType) {
      qb.andWhere('v.employmentType = :et', { et: query.employmentType });
    }
    if (query.search) {
      qb.andWhere('(v.titleUa ILIKE :s OR v.titleEn ILIKE :s)', {
        s: `%${query.search}%`,
      });
    }
    if (query.hasActiveDeadline === 'true') {
      qb.andWhere(
        'v.applicationDeadline IS NOT NULL AND v.applicationDeadline > NOW()',
      );
    }

    const [data, total] = await qb
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();

    return { data, total, page: query.page, limit: query.limit };
  }

  async findById(id: string): Promise<Vacancy> {
    const record = await this.repo.findOne({ where: { id } });
    if (!record) throw new NotFoundException(`Vacancy ${id} not found`);
    return record;
  }

  // === ADDED: spec 004 — full record for the guarded GET admin/:id route. Deliberately loads
  // NO relations (no `createdBy` user), and is independent of the public findById. ===
  async findByIdForAdmin(id: string): Promise<Vacancy> {
    const record = await this.repo.findOne({ where: { id } });
    if (!record) throw new NotFoundException(`Vacancy ${id} not found`);
    return record;
  }

  async create(
    dto: CreateVacancyDto,
    userId: string,
    actor: AuditActor,
  ): Promise<Vacancy> {
    const entity = this.repo.create({
      ...dto,
      applicationDeadline: dto.applicationDeadline
        ? new Date(dto.applicationDeadline)
        : null,
      publishedAt: dto.publishedAt
        ? new Date(dto.publishedAt)
        : dto.status === VacancyStatus.PUBLISHED
          ? new Date()
          : null,
      createdById: userId,
    });
    // CHANGED: a staff-created record is audited in the same transaction as the insert
    return this.dataSource.transaction(async (manager) => {
      const saved = await manager.save(entity);
      const status =
        saved.status ??
        (await manager.findOneByOrFail(Vacancy, { id: saved.id })).status;
      await this.audit.recordCreated(
        manager,
        AuditedEntityType.VACANCY,
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
    dto: UpdateVacancyDto,
    actor: AuditActor,
  ): Promise<Vacancy> {
    await this.dataSource.transaction(async (manager) => {
      const existing = await this.lockById(manager, id);

      const updates: Partial<Vacancy> = {
        ...dto,
        applicationDeadline: dto.applicationDeadline
          ? new Date(dto.applicationDeadline)
          : existing.applicationDeadline,
        publishedAt: dto.publishedAt
          ? new Date(dto.publishedAt)
          : existing.publishedAt,
      };

      if (dto.status === VacancyStatus.PUBLISHED && !existing.publishedAt) {
        updates.publishedAt = dto.publishedAt
          ? new Date(dto.publishedAt)
          : new Date();
      }

      await manager.update(Vacancy, id, updates);
      await this.audit.recordUpdate(
        manager,
        AuditedEntityType.VACANCY,
        id,
        actor,
        { oldStatus: existing.status, newStatus: dto.status },
      );
    });
    return this.findById(id);
  }

  async updateStatus(
    id: string,
    status: VacancyStatus,
    actor: AuditActor,
  ): Promise<Vacancy> {
    await this.dataSource.transaction(async (manager) => {
      const existing = await this.lockById(manager, id);
      const updates: Partial<Vacancy> = { status };

      const isFirstPublication =
        existing.status === VacancyStatus.DRAFT &&
        status !== VacancyStatus.DRAFT &&
        !existing.publishedAt;

      if (isFirstPublication) {
        updates.publishedAt = new Date();
      }

      await manager.update(Vacancy, id, updates);
      await this.audit.recordUpdate(
        manager,
        AuditedEntityType.VACANCY,
        id,
        actor,
        { oldStatus: existing.status, newStatus: status },
      );
    });
    return this.findById(id);
  }

  // enforce draft-only delete (non-drafts must be cancelled via status change)
  async remove(id: string, actor: AuditActor): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const existing = await this.lockById(manager, id);

      if (existing.status !== VacancyStatus.DRAFT) {
        throw new BadRequestException(
          'Only draft vacancies can be deleted. To remove a published vacancy, change its status to "cancelled".',
        );
      }

      await manager.delete(Vacancy, id);
      await this.audit.recordDeleted(
        manager,
        AuditedEntityType.VACANCY,
        id,
        actor,
        existing.status,
      );
    });
  }

  // CHANGED: FOR UPDATE keeps the recorded old status truthful under concurrent edits.
  // Vacancy has no relations loaded here, so the lock cannot span a join.
  private async lockById(manager: EntityManager, id: string): Promise<Vacancy> {
    const record = await manager.findOne(Vacancy, {
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
    if (!record) throw new NotFoundException(`Vacancy ${id} not found`);
    return record;
  }
}
