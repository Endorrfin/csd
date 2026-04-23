import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Testimonial, TestimonialStatus } from './entities/testimonial.entity';
import { CreateTestimonialDto } from './dto/create-testimonial.dto';
import { UpdateTestimonialDto } from './dto/update-testimonial.dto';

@Injectable()
export class TestimonialService {
  constructor(
    @InjectRepository(Testimonial)
    private readonly repo: Repository<Testimonial>,
  ) {}

  // Public: approved only
  findAllApproved(): Promise<Testimonial[]> {
    return this.repo.find({
      where: { status: TestimonialStatus.APPROVED },
      order: { publishedAt: 'DESC' },
    });
  }

  // Manager+: all statuses
  findAll(): Promise<Testimonial[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
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

    // publishedAt mapped inline to avoid string→Date type mismatch
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

  // ── dedicated status transition with side effects ──
  async updateStatus(
    id: string,
    status: TestimonialStatus,
    managerNotes?: string,
  ): Promise<Testimonial> {
    const existing = await this.findById(id);

    const updates: Partial<Testimonial> = { status };

    // Set publishedAt only when transitioning into APPROVED for the first time
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

  async remove(id: string): Promise<void> {
    await this.findById(id);
    await this.repo.delete(id);
  }
}
