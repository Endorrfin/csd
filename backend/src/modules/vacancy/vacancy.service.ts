import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vacancy, VacancyStatus } from './entities/vacancy.entity';
import { CreateVacancyDto } from './dto/create-vacancy.dto';
import { UpdateVacancyDto } from './dto/update-vacancy.dto';

@Injectable()
export class VacancyService {
  constructor(
    @InjectRepository(Vacancy)
    private readonly repo: Repository<Vacancy>,
  ) {}

  findAllPublished(): Promise<Vacancy[]> {
    return this.repo.find({
      where: { status: VacancyStatus.PUBLISHED },
      order: { publishedAt: 'DESC' },
    });
  }

  // Manager+ sees all statuses including drafts
  findAll(): Promise<Vacancy[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  async findById(id: string): Promise<Vacancy> {
    const record = await this.repo.findOne({ where: { id } });
    if (!record) throw new NotFoundException(`Vacancy ${id} not found`);
    return record;
  }

  async create(dto: CreateVacancyDto, userId: string): Promise<Vacancy> {
    const entity = this.repo.create({
      ...dto,
      applicationDeadline: dto.applicationDeadline
        ? new Date(dto.applicationDeadline)
        : null,
      // Set publishedAt if status=published and date not provided
      publishedAt: dto.publishedAt
        ? new Date(dto.publishedAt)
        : dto.status === VacancyStatus.PUBLISHED
          ? new Date()
          : null,
      createdById: userId,
    });
    return this.repo.save(entity);
  }

  async update(id: string, dto: UpdateVacancyDto): Promise<Vacancy> {
    const existing = await this.findById(id);

    // explicitly map publishedAt string → Date to match Partial<Vacancy>
    const updates: Partial<Vacancy> = {
      ...dto,
      applicationDeadline: dto.applicationDeadline
        ? new Date(dto.applicationDeadline)
        : existing.applicationDeadline,
      publishedAt: dto.publishedAt
        ? new Date(dto.publishedAt)
        : existing.publishedAt,
    };

    // Auto-set publishedAt when transitioning to PUBLISHED
    if (dto.status === VacancyStatus.PUBLISHED && !existing.publishedAt) {
      updates.publishedAt = dto.publishedAt
        ? new Date(dto.publishedAt)
        : new Date();
    }

    await this.repo.update(id, updates);
    return this.findById(id);
  }

  // ── dedicated status transition with side effects ──
  async updateStatus(id: string, status: VacancyStatus): Promise<Vacancy> {
    const existing = await this.findById(id);

    const updates: Partial<Vacancy> = { status };

    // Auto-set publishedAt on first transition out of DRAFT
    const isFirstPublication =
      existing.status === VacancyStatus.DRAFT &&
      status !== VacancyStatus.DRAFT &&
      !existing.publishedAt;

    if (isFirstPublication) {
      updates.publishedAt = new Date();
    }

    await this.repo.update(id, updates);
    return this.findById(id);
  }

  async remove(id: string): Promise<void> {
    await this.findById(id);
    await this.repo.delete(id);
  }
}
