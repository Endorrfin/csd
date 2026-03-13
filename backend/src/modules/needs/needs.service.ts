import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WashForm } from './entities/wash-form.entity';
import { WashFormItem } from './entities/wash-form-item.entity';
import { CreateWashFormDto } from './dto/create-wash-form.dto';
import { UpdateWashFormDto } from './dto/update-wash-form.dto';

@Injectable()
export class NeedsService {
  constructor(
    @InjectRepository(WashForm)
    private readonly washFormRepo: Repository<WashForm>,
    @InjectRepository(WashFormItem)
    private readonly washFormItemRepo: Repository<WashFormItem>,
  ) {}

  /** Public — create a new WASH needs form with items */
  async create(dto: CreateWashFormDto): Promise<WashForm> {
    const { items, ...formData } = dto;

    const form = this.washFormRepo.create({
      ...formData,
      items: items.map((item) =>
        this.washFormItemRepo.create({
          equipmentItemId: item.equipmentItemId,
          quantity: item.quantity,
          // notes: item.notes ?? null,
          notes: item.notes,
        }),
      ),
    });

    return this.washFormRepo.save(form);
  }

  /** Manager/Admin — list all forms with items */
  findAll(): Promise<WashForm[]> {
    return this.washFormRepo.find({
      relations: ['items', 'items.equipmentItem', 'items.equipmentItem.category'],
      order: { createdAt: 'DESC' },
    });
  }

  /** Manager/Admin — get single form by ID */
  async findById(id: string): Promise<WashForm> {
    const form = await this.washFormRepo.findOne({
      where: { id },
      relations: ['items', 'items.equipmentItem', 'items.equipmentItem.category'],
    });
    if (!form) {
      throw new NotFoundException('WASH form not found');
    }
    return form;
  }

  /** Manager/Admin — update status and notes */
  async update(id: string, dto: UpdateWashFormDto): Promise<WashForm> {
    const form = await this.findById(id);
    Object.assign(form, dto);
    return this.washFormRepo.save(form);
  }

  /** Admin — delete form and all its items (cascade) */
  async remove(id: string): Promise<void> {
    const form = await this.findById(id);
    await this.washFormRepo.remove(form);
  }
}
