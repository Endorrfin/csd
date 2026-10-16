// backend/src/modules/testimonial/testimonial.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Testimonial, TestimonialStatus } from './entities/testimonial.entity';
import { CreateTestimonialDto } from './dto/create-testimonial.dto';
import { UpdateTestimonialDto } from './dto/update-testimonial.dto';
import { AdminTestimonialQueryDto } from './dto/admin-query.dto';
// CHANGED: status audit log (spec 003)
import { AuditActor } from '../audit/audit-actor';
import { AuditedEntityType } from '../audit/audit-entity-type';
import { EntityAuditService } from '../audit/entity-audit.service';

export interface PaginatedTestimonials {
  data: Testimonial[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class TestimonialService {
  constructor(
    @InjectRepository(Testimonial)
    private readonly repo: Repository<Testimonial>,
    // CHANGED: status changes and their audit entries share one transaction
    private readonly dataSource: DataSource,
    private readonly audit: EntityAuditService,
  ) {}

  // newest submissions first (display date = createdAt)
  findAllApproved(): Promise<Testimonial[]> {
    return this.repo.find({
      where: { status: TestimonialStatus.APPROVED },
      order: { createdAt: 'DESC' },
    });
  }

  // paginated + filtered admin grid
  async findAllForAdmin(
    query: AdminTestimonialQueryDto,
  ): Promise<PaginatedTestimonials> {
    // honor query.sort direction (default 'desc') instead of hardcoded DESC
    const direction = query.sort === 'asc' ? 'ASC' : 'DESC';
    const qb = this.repo
      .createQueryBuilder('t')
      .orderBy('t.createdAt', direction);

    if (query.status) {
      qb.andWhere('t.status = :status', { status: query.status });
    }
    if (query.verifiedOnly === 'true') {
      qb.andWhere('t.isVerified = true');
    }
    if (query.search) {
      qb.andWhere(
        '(t.authorName ILIKE :s OR t.organization ILIKE :s OR t.text ILIKE :s)',
        { s: `%${query.search}%` },
      );
    }

    const [data, total] = await qb
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();

    return { data, total, page: query.page, limit: query.limit };
  }

  async findById(id: string): Promise<Testimonial> {
    const record = await this.repo.findOne({ where: { id } });
    if (!record) throw new NotFoundException(`Testimonial ${id} not found`);
    return record;
  }

  async create(dto: CreateTestimonialDto): Promise<Testimonial> {
    const entity = this.repo.create({
      ...dto,
      status: TestimonialStatus.PENDING,
      publishedAt: null,
      isVerified: false,
    });
    return this.repo.save(entity);
  }

  // CHANGED: transaction + row lock; also serves the legacy /approve and /reject wrappers.
  // `isVerified` is a separate flag and is deliberately not audited (spec decision D6).
  async update(
    id: string,
    dto: UpdateTestimonialDto,
    actor: AuditActor,
  ): Promise<Testimonial> {
    await this.dataSource.transaction(async (manager) => {
      const existing = await this.lockById(manager, id);

      const updates: Partial<Testimonial> = {
        ...dto,
        publishedAt:
          dto.status === TestimonialStatus.APPROVED &&
          existing.status !== TestimonialStatus.APPROVED
            ? dto.publishedAt
              ? new Date(dto.publishedAt)
              : new Date()
            : existing.publishedAt,
      };

      await manager.update(Testimonial, id, updates);
      await this.audit.recordUpdate(
        manager,
        AuditedEntityType.TESTIMONIAL,
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
    status: TestimonialStatus,
    managerNotes: string | undefined,
    actor: AuditActor,
  ): Promise<Testimonial> {
    await this.dataSource.transaction(async (manager) => {
      const existing = await this.lockById(manager, id);

      const updates: Partial<Testimonial> = { status };

      if (
        status === TestimonialStatus.APPROVED &&
        existing.status !== TestimonialStatus.APPROVED &&
        !existing.publishedAt
      ) {
        updates.publishedAt = new Date();
      }

      if (managerNotes !== undefined) {
        updates.managerNotes = managerNotes;
      }

      await manager.update(Testimonial, id, updates);
      await this.audit.recordUpdate(
        manager,
        AuditedEntityType.TESTIMONIAL,
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

  async setVerified(id: string, isVerified: boolean): Promise<Testimonial> {
    await this.findById(id);
    await this.repo.update(id, { isVerified });
    return this.findById(id);
  }

  // any testimonial can be hard-deleted (admin confirms in UI)
  async remove(id: string, actor: AuditActor): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const existing = await this.lockById(manager, id);
      await manager.delete(Testimonial, id);
      await this.audit.recordDeleted(
        manager,
        AuditedEntityType.TESTIMONIAL,
        id,
        actor,
        existing.status,
      );
    });
  }

  // CHANGED: FOR UPDATE keeps the recorded old status truthful under concurrent edits.
  // Testimonial has no relations loaded here, so the lock cannot span a join.
  private async lockById(
    manager: EntityManager,
    id: string,
  ): Promise<Testimonial> {
    const record = await manager.findOne(Testimonial, {
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
    if (!record) throw new NotFoundException(`Testimonial ${id} not found`);
    return record;
  }
}
