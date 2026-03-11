import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WashForm } from './entities/wash-form.entity';
import { CreateWashFormDto } from './dto/create-wash-form.dto';
import { UpdateWashFormDto } from './dto/update-wash-form.dto';

@Injectable()
export class NeedsService {
  constructor(
    @InjectRepository(WashForm)
    private readonly washFormRepository: Repository<WashForm>,
  ) {}

  findAll(): Promise<WashForm[]> {
    return this.washFormRepository.find({ order: { createdAt: 'DESC' } });
  }

  async findById(id: string): Promise<WashForm> {
    const form = await this.washFormRepository.findOne({ where: { id } });
    if (!form) {
      throw new NotFoundException('WASH form not found');
    }
    return form;
  }

  // Публичный — любой пользователь может подать заявку
  create(dto: CreateWashFormDto): Promise<WashForm> {
    const form = this.washFormRepository.create(dto);
    return this.washFormRepository.save(form);
  }

  // Менеджер/админ — обновить статус
  async update(id: string, dto: UpdateWashFormDto): Promise<WashForm> {
    const form = await this.findById(id);
    Object.assign(form, dto);
    return this.washFormRepository.save(form);
  }

  async remove(id: string): Promise<void> {
    const form = await this.findById(id);
    await this.washFormRepository.remove(form);
  }
}
