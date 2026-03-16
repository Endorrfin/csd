import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WashForm, FormStatus } from './entities/wash-form.entity';
import { WashFormItem } from './entities/wash-form-item.entity';
import { CreateWashFormDto } from './dto/create-wash-form.dto';
import { UpdateWashFormDto } from './dto/update-wash-form.dto';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class NeedsService {
  constructor(
    @InjectRepository(WashForm)
    private readonly washFormRepo: Repository<WashForm>,
    @InjectRepository(WashFormItem)
    private readonly washFormItemRepo: Repository<WashFormItem>,
  ) {}

  async create(dto: CreateWashFormDto): Promise<WashForm> {
    const { items, ...formData } = dto;
    const form = this.washFormRepo.create({
      ...formData,
      items: items?.length
        ? items.map((item) =>
          this.washFormItemRepo.create({
            equipmentItemId: item.equipmentItemId,
            quantity: item.quantity,
            notes: item.notes,
          }),
        )
        : [],
    });
    return this.washFormRepo.save(form);
  }

  async findAll(options?: {
    page?: number;
    limit?: number;
    status?: FormStatus;
    region?: string;
    search?: string;
  }): Promise<PaginatedResult<WashForm>> {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 20;

    const qb = this.washFormRepo
      .createQueryBuilder('form')
      .leftJoinAndSelect('form.items', 'item')
      .leftJoinAndSelect('item.equipmentItem', 'equipment')
      .leftJoinAndSelect('equipment.category', 'category')
      .orderBy('form.createdAt', 'DESC');

    if (options?.status) {
      qb.andWhere('form.status = :status', { status: options.status });
    }
    if (options?.region) {
      qb.andWhere('LOWER(form.region) LIKE :region', {
        region: `%${options.region.toLowerCase()}%`,
      });
    }
    if (options?.search) {
      const s = `%${options.search.toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(form.organizationName) LIKE :s OR LOWER(form.headName) LIKE :s OR LOWER(form.email) LIKE :s OR LOWER(form.objectName) LIKE :s)',
        { s },
      );
    }

    const [data, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  async findById(id: string): Promise<WashForm> {
    const form = await this.washFormRepo.findOne({
      where: { id },
      relations: ['items', 'items.equipmentItem', 'items.equipmentItem.category'],
    });
    if (!form) throw new NotFoundException('WASH form not found');
    return form;
  }

  async update(id: string, dto: UpdateWashFormDto): Promise<WashForm> {
    const form = await this.findById(id);
    Object.assign(form, dto);
    return this.washFormRepo.save(form);
  }

  async remove(id: string): Promise<void> {
    const form = await this.findById(id);
    await this.washFormRepo.remove(form);
  }

  async exportCsv(options?: {
    status?: FormStatus;
    region?: string;
  }): Promise<string> {
    const qb = this.washFormRepo
      .createQueryBuilder('form')
      .leftJoinAndSelect('form.items', 'item')
      .leftJoinAndSelect('item.equipmentItem', 'equipment')
      .leftJoinAndSelect('equipment.category', 'category')
      .orderBy('form.createdAt', 'DESC');

    if (options?.status) {
      qb.andWhere('form.status = :status', { status: options.status });
    }
    if (options?.region) {
      qb.andWhere('LOWER(form.region) LIKE :region', {
        region: `%${options.region.toLowerCase()}%`,
      });
    }

    const forms = await qb.getMany();

    const headers = [
      'ID', 'Date', 'Status', 'Region', 'Organization', 'Head Name',
      'Head Phone', 'Email', 'Object Name', 'Dependent Population',
      'Social Facilities', 'Installation Deadline', 'Replacement Reason',
      'Borehole Type', 'Borehole Flow Rate', 'Borehole Diameter',
      'Water Tower Type', 'Water Tower Qty',
      'Purification: Room', 'Purification: Temperature',
      'Purification: Water/Drainage', 'Purification: Power',
      'Equipment Items Count', 'Equipment Details', 'Manager Notes',
    ];

    const esc = (val: unknown): string => {
      if (val === null || val === undefined) return '';
      const str = String(val).replace(/"/g, '""');
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str}"` : str;
    };

    const rows = forms.map((f) => {
      const bh = f.boreholeDrilling;
      const wt = f.waterTower;
      const ps = f.purificationSystem;
      const equipDetails = f.items
        ?.map((i) => `${i.equipmentItem?.nameEn ?? 'Unknown'}: ${i.quantity} ${i.equipmentItem?.unit ?? ''}`)
        .join('; ');

      return [
        f.id, f.createdAt?.toISOString() ?? '', f.status, f.region,
        f.organizationName, f.headName, f.headPhone, f.email,
        f.objectName, f.dependentPopulation, f.socialFacilities ?? '',
        f.installationDeadline ?? '', f.replacementReason,
        bh?.boreholeType ?? '', bh?.expectedFlowRate ?? '', bh?.desiredDiameter ?? '',
        wt?.towerType ?? '', wt?.quantity ?? '',
        ps?.hasRoom ? 'Yes' : ps ? 'No' : '',
        ps?.hasTemperatureControl ? 'Yes' : ps ? 'No' : '',
        ps?.hasWaterInletDrainage ? 'Yes' : ps ? 'No' : '',
        ps?.hasPowerSupply ? 'Yes' : ps ? 'No' : '',
        f.items?.length ?? 0, equipDetails ?? '', f.managerNotes ?? '',
      ].map(esc).join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }
}
