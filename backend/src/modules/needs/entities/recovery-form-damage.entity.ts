// Recovery form — damaged-elements checklist rows
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { RecoveryForm } from './recovery-form.entity';
import type { DamageElement } from '../recovery.constants';

/**
 * One damaged element of the building (roof / windows / heating / …).
 * Volume is optional — the checkbox is mandatory, the measurement is not,
 * so applicants without exact numbers are not blocked (plan §2, Крок 2).
 */
@Entity('recovery_form_damages')
export class RecoveryFormDamage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => RecoveryForm, (form) => form.damages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'recoveryFormId' })
  recoveryForm: RecoveryForm;

  @Index()
  @Column()
  recoveryFormId: string;

  @Column({ type: 'varchar', length: 30 })
  element: DamageElement;

  /** Scope of works: m² / pcs, depending on element. NUMERIC → string at runtime. */
  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  volume: number | null;

  /** Unit snapshot (set server-side from DAMAGE_ELEMENT_UNITS). */
  @Column({ type: 'varchar', length: 10, nullable: true })
  unit: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  notes: string | null;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;
}
