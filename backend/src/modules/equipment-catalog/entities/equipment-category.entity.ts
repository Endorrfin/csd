import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
} from 'typeorm';
import { EquipmentItem } from './equipment-item.entity';

@Entity('equipment_categories')
export class EquipmentCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Unique slug, e.g. 'welding_equipment' */
  @Column({ unique: true })
  code: string;

  @Column()
  nameEn: string;

  @Column()
  nameUa: string;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @OneToMany(() => EquipmentItem, (item) => item.category, { cascade: true })
  items: EquipmentItem[];
}
