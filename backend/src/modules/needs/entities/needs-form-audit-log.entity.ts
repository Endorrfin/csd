// shared audit log for needs forms (recovery + future types)
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

/** Mirrors wash AuditAction values; varchar (not pg enum) to stay shared/extensible. */
export type NeedsAuditAction =
  | 'created'
  | 'updated'
  | 'status_changed'
  | 'deleted';

/**
 * Audit trail shared by all NEW needs forms (WASH keeps its own
 * wash_form_audit_log — working code is not refactored in this epic).
 *
 * Unlike the wash log there is NO FK to the form row: entries survive form
 * deletion, which is the better audit property ('deleted' stays visible).
 */
@Entity('needs_form_audit_log')
@Index('IDX_needs_form_audit_log_form', ['formType', 'formId'])
export class NeedsFormAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 32 })
  formType: string;

  @Column({ type: 'uuid' })
  formId: string;

  /** FK to users. NULL for anonymous public submit. */
  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'changedById' })
  changedBy: User | null;

  @Column({ type: 'uuid', nullable: true })
  changedById: string | null;

  /** Email snapshot so the record survives user deletion. */
  @Column({ type: 'varchar', length: 255, nullable: true })
  changedByEmail: string | null;

  @Column({ type: 'varchar', length: 20 })
  action: NeedsAuditAction;

  @Column({ type: 'varchar', length: 100, nullable: true })
  fieldName: string | null;

  @Column({ type: 'text', nullable: true })
  oldValue: string | null;

  @Column({ type: 'text', nullable: true })
  newValue: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @Index()
  @CreateDateColumn()
  createdAt: Date;
}
