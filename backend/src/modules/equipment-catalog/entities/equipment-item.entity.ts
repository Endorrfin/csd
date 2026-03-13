import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { EquipmentCategory } from './equipment-category.entity';

export enum EquipmentUnit {
  PCS = 'pcs',
  METERS = 'meters',
  KG = 'kg',
}

@Entity('equipment_items')
export class EquipmentItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** LTA Line Item code from UNICEF contract (10, 20, 30...) */
  @Column({ type: 'int', unique: true })
  ltaCode: number;

  @Column()
  nameEn: string;

  @Column()
  nameUa: string;

  @Column({ type: 'enum', enum: EquipmentUnit, default: EquipmentUnit.PCS })
  unit: EquipmentUnit;

  /** Optional technical specifications */
  @Column({ type: 'text', nullable: true })
  specifications: string;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @ManyToOne(() => EquipmentCategory, (cat) => cat.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'categoryId' })
  category: EquipmentCategory;

  @Column()
  categoryId: string;
}
