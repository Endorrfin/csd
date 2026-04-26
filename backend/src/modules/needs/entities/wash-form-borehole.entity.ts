import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { WashForm } from './wash-form.entity';

export enum BoreholeWorkType {
  NEW_DRILLING = 'new_drilling',
  REPAIR_CLEANING = 'repair_cleaning',
  NEW_NEAR_EXISTING = 'new_near_existing',
}

/**
 * One borehole (свердловина) entry within a WASH form.
 * A single form can have multiple boreholes within the same settlement.
 */
@Entity('wash_form_boreholes')
export class WashFormBorehole {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => WashForm, (form) => form.boreholes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'washFormId' })
  washForm: WashForm;

  @Index()
  @Column()
  washFormId: string;

  @Column({ type: 'enum', enum: BoreholeWorkType })
  workType: BoreholeWorkType;

  /** Expected flow rate after work is completed, m³/h (range 7–50). */
  @Column({ type: 'int' })
  expectedFlowRate: number;

  // ── Fields relevant only when workType = NEW_NEAR_EXISTING ──

  @Column({ type: 'boolean', nullable: true })
  hasAquiferInfo: boolean | null;

  /** Existing borehole depth, m (range 1–800). */
  @Column({ type: 'int', nullable: true })
  existingDepth: number | null;

  /** Existing borehole debit, m³/h (range 1–30). */
  @Column({ type: 'int', nullable: true })
  existingDebit: number | null;

  @Column({ type: 'boolean', nullable: true })
  hasDesignInfo: boolean | null;

  @Column({ type: 'boolean', nullable: true })
  hasPassport: boolean | null;

  @Column({ type: 'text', nullable: true })
  oldLocation: string | null;

  // ── Common ──

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  /** Display order within the parent form (0-based). */
  @Column({ type: 'int', default: 0 })
  sortOrder: number;
}
