import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { WashForm } from './wash-form.entity';

/**
 * One water purification system entry within a WASH form.
 * Multiple entries allowed per form.
 */
@Entity('wash_form_purifications')
export class WashFormPurification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => WashForm, (form) => form.purifications, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'washFormId' })
  washForm: WashForm;

  @Index()
  @Column()
  washFormId: string;

  @Column({ type: 'boolean', default: false })
  hasRoom: boolean;

  @Column({ type: 'boolean', default: false })
  hasTemperatureControl: boolean;

  @Column({ type: 'boolean', default: false })
  hasWaterInletDrainage: boolean;

  @Column({ type: 'boolean', default: false })
  hasPowerSupply: boolean;

  @Column({ type: 'boolean', default: false })
  canMaintainSystem: boolean;

  @Column({ type: 'boolean', default: false })
  willingToProvideWater: boolean;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;
}
