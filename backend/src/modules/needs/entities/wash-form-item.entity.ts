import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
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

  @Column()
  washFormId: string;

  @ManyToOne(() => EquipmentItem, { eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'equipmentItemId' })
  equipmentItem: EquipmentItem;

  @Column()
  equipmentItemId: string;

  /** Кількість (штуки, метри, кг — залежно від unit обладнання) */
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  quantity: number;

  /** Додаткові примітки до позиції */
  @Column({ type: 'text', nullable: true })
  notes: string;
}
