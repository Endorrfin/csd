// backend/src/modules/inquiry/inquiry.service.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import {
  Inquiry,
  InquiryReason,
  InquiryStatus,
} from './entities/inquiry.entity';
import { CreateInquiryDto } from './dto/create-inquiry.dto';
import { AdminInquiryQueryDto } from './dto/admin-query.dto';
import { ExportInquiriesQueryDto } from './dto/export-query.dto';

export interface PaginatedInquiries {
  data: Inquiry[];
  total: number;
  page: number;
  limit: number;
}

// Shared filter shape for the admin grid + CSV export
interface InquiryFilter {
  status?: InquiryStatus;
  reason?: InquiryReason;
  search?: string;
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

  // CSV export for the admin grid (UTF-8 BOM added in the controller)
  async exportCsv(query: ExportInquiriesQueryDto): Promise<string> {
    const qb = this.buildFilterQuery(query);
    qb.orderBy('i.createdAt', 'DESC');
    const records = await qb.getMany();

    const isUa = query.lang === 'ua';
    const headers = isUa
      ? [
          '#',
          'Дата створення',
          'Статус',
          'Тема',
          'Уточнення теми',
          "Ім'я",
          'Email',
          'Телефон',
          'Месенджер',
          'Контакт у месенджері',
          'Мова',
          'Повідомлення',
          'Згода',
          'Примітки менеджера',
        ]
      : [
          '#',
          'Created',
          'Status',
          'Reason',
          'Reason detail',
          'Name',
          'Email',
          'Phone',
          'Messenger',
          'Messenger contact',
          'Language',
          'Message',
          'Consent',
          'Manager notes',
        ];

    const yes = isUa ? 'так' : 'yes';
    const no = isUa ? 'ні' : 'no';

    const rows = records.map((r, idx) => [
      idx + 1,
      r.createdAt.toISOString().slice(0, 10),
      r.status,
      r.reason,
      r.reasonOther ?? '',
      r.name ?? '',
      r.email ?? '',
      r.phone ?? '',
      r.messengerType ?? '',
      r.messengerHandle ?? '',
      r.preferredLang,
      r.message,
      r.consent ? yes : no,
      r.managerNotes ?? '',
    ]);

    return this.toCsv([headers, ...rows]);
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

  private buildFilterQuery(query: InquiryFilter): SelectQueryBuilder<Inquiry> {
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

  // Minimal RFC 4180 CSV serializer — escape quotes + wrap fields with , " or newline
  private toCsv(rows: (string | number)[][]): string {
    return rows
      .map((row) =>
        row
          .map((cell) => {
            const s = String(cell ?? '');
            return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
          })
          .join(','),
      )
      .join('\n');
  }
}
