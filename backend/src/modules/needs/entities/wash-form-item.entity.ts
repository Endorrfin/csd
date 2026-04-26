import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index, // CHANGED: added for washFormId index.
} from 'typeorm';
import { WashForm } from './wash-form.entity';
import { EquipmentItem } from '../../equipment-catalog/entities/equipment-item.entity';

@Entity('wash_form_items')
export class WashFormItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => WashForm, (form) => form.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'washFormId' })
  washForm: WashForm;

  @Index() // CHANGED
  @Column()
  washFormId: string;

  @ManyToOne(() => EquipmentItem, { eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'equipmentItemId' })
  equipmentItem: EquipmentItem;

  @Column()
  equipmentItemId: string;

  /** Quantity in the item's unit (pcs / m / kg). */
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  quantity: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  /** CHANGED: display order within the form. */
  @Column({ type: 'int', default: 0 })
  sortOrder: number;
}
