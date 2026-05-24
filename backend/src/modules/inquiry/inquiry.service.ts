// backend/src/modules/inquiry/inquiry.service.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Inquiry, InquiryStatus } from './entities/inquiry.entity';
import { CreateInquiryDto } from './dto/create-inquiry.dto';
import { AdminInquiryQueryDto } from './dto/admin-query.dto';

export interface PaginatedInquiries {
  data: Inquiry[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class InquiryService {
  constructor(
    @InjectRepository(Inquiry)
    private readonly repo: Repository<Inquiry>,
  ) {}

  // Public contact-form submission
  async create(dto: CreateInquiryDto): Promise<Inquiry> {
    const entity = this.repo.create(dto);
    return this.repo.save(entity);
  }

  // Paginated + filtered admin grid
  async findAllForAdmin(
    query: AdminInquiryQueryDto,
  ): Promise<PaginatedInquiries> {
    const qb = this.buildFilterQuery(query);
    qb.orderBy('i.createdAt', 'DESC');

    const [data, total] = await qb
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();

    return { data, total, page: query.page, limit: query.limit };
  }

  async findById(id: string): Promise<Inquiry> {
    const record = await this.repo.findOne({ where: { id } });
    if (!record) throw new NotFoundException(`Inquiry ${id} not found`);
    return record;
  }

  async updateStatus(
    id: string,
    status: InquiryStatus,
    managerNotes?: string,
  ): Promise<Inquiry> {
    await this.findById(id);

    const updates: Partial<Inquiry> = { status };
    if (managerNotes !== undefined) {
      updates.managerNotes = managerNotes;
    }

    await this.repo.update(id, updates);
    return this.findById(id);
  }

  // Only ARCHIVED inquiries can be hard-deleted (mirror complaint CLOSED-only rule)
  async remove(id: string): Promise<void> {
    const existing = await this.findById(id);

    if (existing.status !== InquiryStatus.ARCHIVED) {
      throw new BadRequestException(
        'Only archived inquiries can be deleted. Archive it first to remove.',
      );
    }

    await this.repo.delete(id);
  }

  // ── Private helpers ──

  private buildFilterQuery(
    query: AdminInquiryQueryDto,
  ): SelectQueryBuilder<Inquiry> {
    const qb = this.repo.createQueryBuilder('i');

    if (query.status)
      qb.andWhere('i.status = :status', { status: query.status });
    if (query.reason)
      qb.andWhere('i.reason = :reason', { reason: query.reason });
    if (query.search) {
      // Search on message + reasonOther ONLY — never PII fields
      qb.andWhere('(i.message ILIKE :s OR i.reasonOther ILIKE :s)', {
        s: `%${query.search}%`,
      });
    }

    return qb;
  }
}
