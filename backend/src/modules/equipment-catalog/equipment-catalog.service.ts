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



// SORT EQUIPMENT - NOT WORKING
// import { Injectable } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';
// import { EquipmentCategory } from './entities/equipment-category.entity';
//
// @Injectable()
// export class EquipmentCatalogService {
//   constructor(
//     @InjectRepository(EquipmentCategory)
//     private readonly categoryRepo: Repository<EquipmentCategory>,
//   ) {}
//
//   /**
//    * Returns all categories with their items.
//    * Sort order: sortOrder ASC (manual pin), then Ukrainian alphabet by nameUa.
//    * Same rule applied to items within each category.
//    */
//   async findAll(): Promise<EquipmentCategory[]> {
//     // drop SQL-level ORDER BY — Postgres lacks native uk collation;
//     // do alphabetical sort in JS with localeCompare('uk').
//     const categories = await this.categoryRepo.find({
//       relations: ['items'],
//     });
//
//     // sort categories, then items inside each category.
//     const sorted = this.sortByUaName(categories);
//     for (const cat of sorted) {
//       cat.items = this.sortByUaName(cat.items);
//     }
//     return sorted;
//   }
//
//   /**
//    * Sort helper: sortOrder ASC first (manual pin), then Ukrainian alphabet.
//    * `numeric: true` ensures D110 < D200 < D1000 (not lexicographic D1000 between D100 and D200).
//    * `sensitivity: 'base'` ignores case but keeps і/и/ї as distinct letters.
//    */
//   private sortByUaName<T extends { nameUa: string; sortOrder: number }>(
//     arr: T[],
//   ): T[] {
//     return [...arr].sort((a, b) => {
//       if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
//       return a.nameUa.localeCompare(b.nameUa, 'uk', {
//         sensitivity: 'base',
//         numeric: true,
//       });
//     });
//   }
// }
