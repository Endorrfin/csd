import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EquipmentCategory } from './entities/equipment-category.entity';

@Injectable()
export class EquipmentCatalogService {
  constructor(
    @InjectRepository(EquipmentCategory)
    private readonly categoryRepo: Repository<EquipmentCategory>,
  ) {}

  /** Returns all categories with their items, sorted */
  findAll(): Promise<EquipmentCategory[]> {
    return this.categoryRepo.find({
      relations: ['items'],
      order: { sortOrder: 'ASC', items: { sortOrder: 'ASC' } },
    });
  }
}
