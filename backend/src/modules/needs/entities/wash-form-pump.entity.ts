import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { WashForm } from './wash-form.entity';

export enum PumpPurpose {
  BOREHOLE = 'borehole',
  SURFACE = 'surface',
  DRAINAGE_SEWAGE = 'drainage_sewage',
  OTHER = 'other',
}

/**
 * One pump entry within a WASH form.
 * All technical spec fields are optional because pump models vary wildly —
 * users fill in whatever they know.
 */
@Entity('wash_form_pumps')
export class WashFormPump {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => WashForm, (form) => form.pumps, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'washFormId' })
  washForm: WashForm;

  @Index()
  @Column()
  washFormId: string;

  /** Required categorisation. Helps filtering and CSV/XLSX grouping. */
  @Column({ type: 'enum', enum: PumpPurpose })
  purpose: PumpPurpose;

  /** Clarification when purpose = OTHER. */
  @Column({ type: 'varchar', length: 255, nullable: true })
  purposeOther: string | null;

  // ── Free-form specs ──

  @Column({ type: 'varchar', length: 100, nullable: true })
  brand: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  model: string | null;

  /** Motor power in kW. */
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  powerKw: number | null;

  /** Flow rate in m³/h. */
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  flowRateM3h: number | null;

  /** Head (pressure) in meters. */
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  headM: number | null;

  /** Casing diameter in inches (typically 4" or 6"). */
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  diameterInches: number | null;

  /** Voltage label like "220V" or "380V". */
  @Column({ type: 'varchar', length: 50, nullable: true })
  voltage: string | null;

  /** Number of phases — typically 1 or 3. */
  @Column({ type: 'int', nullable: true })
  phases: number | null;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;
}
