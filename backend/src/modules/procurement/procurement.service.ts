import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Procurement, ProcurementStatus } from './entities/procurement.entity';
import { CreateProcurementDto } from './dto/create-procurement.dto';
import { UpdateProcurementDto } from './dto/update-procurement.dto';

@Injectable()
export class ProcurementService {
  constructor(
    @InjectRepository(Procurement)
    private readonly repo: Repository<Procurement>,
  ) {}

  // Public endpoint: only published records, sorted by publicationDate DESC
  findAllPublished(): Promise<Procurement[]> {
    return this.repo.find({
      where: { status: ProcurementStatus.PUBLISHED },
      order: { publicationDate: 'DESC', createdAt: 'DESC' },
    });
  }

  // Admin endpoint: all records including drafts
  findAll(): Promise<Procurement[]> {
    return this.repo.find({
      order: { createdAt: 'DESC' },
      relations: ['createdBy'],
    });
  }

  async findById(id: string): Promise<Procurement> {
    const item = await this.repo.findOne({
      where: { id },
      relations: ['createdBy'],
    });
    if (!item) throw new NotFoundException('Procurement not found');
    return item;
  }

  create(dto: CreateProcurementDto, userId: string): Promise<Procurement> {
    const isPublishing = dto.status === ProcurementStatus.PUBLISHED;

    const item = this.repo.create({
      ...dto,
      createdById: userId,
      // Use provided historical date, or set to now when publishing
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

    return this.repo.save(item);
  }

  async update(id: string, dto: UpdateProcurementDto): Promise<Procurement> {
    const item = await this.findById(id);
    const isPublishing =
      dto.status === ProcurementStatus.PUBLISHED &&
      item.status === ProcurementStatus.DRAFT;

    Object.assign(item, {
      ...dto,
      // Set publicationDate on first publish if not explicitly provided
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

    return this.repo.save(item);
  }

  // ── dedicated status transition with side effects ──
  async updateStatus(id: string, status: ProcurementStatus): Promise<Procurement> {
    const item = await this.findById(id);

    // Auto-set publicationDate on first transition out of DRAFT
    const isFirstPublication =
      item.status === ProcurementStatus.DRAFT &&
      status !== ProcurementStatus.DRAFT &&
      !item.publicationDate;

    item.status = status;
    if (isFirstPublication) {
      item.publicationDate = new Date();
    }

    return this.repo.save(item);
  }

  async remove(id: string): Promise<void> {
    const item = await this.findById(id);
    await this.repo.remove(item);
  }
}
