// === ADDED: PR-1 shared per-year tracking-number counter ===
import { Entity, Column, PrimaryColumn } from 'typeorm';

/**
 * One row per (formType, year). FormNumberService increments lastValue
 * atomically (UPDATE … RETURNING inside the create() transaction), producing
 * gap-free numbers like CSD-R-2026-0042 under concurrent Lambda invocations.
 */
@Entity('form_number_sequences')
export class FormNumberSequence {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  formType: string;

  @PrimaryColumn({ type: 'int' })
  year: number;

  @Column({ type: 'int', default: 0 })
  lastValue: number;
}
