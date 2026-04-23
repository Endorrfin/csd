// backend/src/modules/vacancy/vacancy.service.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { Vacancy, VacancyStatus } from './entities/vacancy.entity';
import { CreateVacancyDto } from './dto/create-vacancy.dto';
import { UpdateVacancyDto } from './dto/update-vacancy.dto';
import { AdminVacancyQueryDto } from './dto/admin-query.dto';

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

  async create(dto: CreateVacancyDto, userId: string): Promise<Vacancy> {
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
    return this.repo.save(entity);
  }

  async update(id: string, dto: UpdateVacancyDto): Promise<Vacancy> {
    const existing = await this.findById(id);

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

    await this.repo.update(id, updates);
    return this.findById(id);
  }

  async updateStatus(id: string, status: VacancyStatus): Promise<Vacancy> {
    const existing = await this.findById(id);
    const updates: Partial<Vacancy> = { status };

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

  // enforce draft-only delete (non-drafts must be cancelled via status change)
  async remove(id: string): Promise<void> {
    const existing = await this.findById(id);

    if (existing.status !== VacancyStatus.DRAFT) {
      throw new BadRequestException(
        'Only draft vacancies can be deleted. To remove a published vacancy, change its status to "cancelled".',
      );
    }

    await this.repo.delete(id);
  }
}
