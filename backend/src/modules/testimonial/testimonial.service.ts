// backend/src/modules/testimonial/testimonial.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Testimonial, TestimonialStatus } from './entities/testimonial.entity';
import { CreateTestimonialDto } from './dto/create-testimonial.dto';
import { UpdateTestimonialDto } from './dto/update-testimonial.dto';
import { AdminTestimonialQueryDto } from './dto/admin-query.dto';

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

  async update(id: string, dto: UpdateTestimonialDto): Promise<Testimonial> {
    const existing = await this.findById(id);

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

    await this.repo.update(id, updates);
    return this.findById(id);
  }

  async updateStatus(
    id: string,
    status: TestimonialStatus,
    managerNotes?: string,
  ): Promise<Testimonial> {
    const existing = await this.findById(id);

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

    await this.repo.update(id, updates);
    return this.findById(id);
  }

  async setVerified(id: string, isVerified: boolean): Promise<Testimonial> {
    await this.findById(id);
    await this.repo.update(id, { isVerified });
    return this.findById(id);
  }

  // any testimonial can be hard-deleted (admin confirms in UI)
  async remove(id: string): Promise<void> {
    await this.findById(id);
    await this.repo.delete(id);
  }
}
