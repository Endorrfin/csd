// backend/src/modules/procurement/procurement.service.ts
// added BadRequestException import
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Procurement, ProcurementStatus } from './entities/procurement.entity';
import { CreateProcurementDto } from './dto/create-procurement.dto';
import { UpdateProcurementDto } from './dto/update-procurement.dto';
import { AdminProcurementQueryDto } from './dto/admin-query.dto';

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
  ) {}

  // Public endpoint: only published records, sorted by publicationDate DESC
  findAllPublished(): Promise<Procurement[]> {
    return this.repo.find({
      where: { status: ProcurementStatus.PUBLISHED },
      order: { publicationDate: 'DESC', createdAt: 'DESC' },
    });
  }

  // replaces findAll() — paginated + filtered for admin grid
  async findAllForAdmin(query: AdminProcurementQueryDto): Promise<PaginatedProcurements> {
    const qb = this.repo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.createdBy', 'createdBy')
      .orderBy('p.createdAt', 'DESC');

    if (query.status) {
      qb.andWhere('p.status = :status', { status: query.status });
    }
    if (query.category) {
      qb.andWhere('p.procurementCategory = :category', { category: query.category });
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

  create(dto: CreateProcurementDto, userId: string): Promise<Procurement> {
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

    return this.repo.save(item);
  }

  async update(id: string, dto: UpdateProcurementDto): Promise<Procurement> {
    const item = await this.findById(id);
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

    return this.repo.save(item);
  }

  async updateStatus(id: string, status: ProcurementStatus): Promise<Procurement> {
    const item = await this.findById(id);

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

  // enforce draft-only delete; non-drafts must be cancelled via status change
  async remove(id: string): Promise<void> {
    const item = await this.findById(id);

    if (item.status !== ProcurementStatus.DRAFT) {
      throw new BadRequestException(
        'Only draft procurements can be deleted. To remove a published procurement, change its status to "cancelled".',
      );
    }

    await this.repo.remove(item);
  }
}
