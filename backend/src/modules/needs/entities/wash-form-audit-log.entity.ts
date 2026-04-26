import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  CreateDateColumn,
} from 'typeorm';
import { WashForm } from './wash-form.entity';
import { User } from '../../users/entities/user.entity';

export enum AuditAction {
  CREATED = 'created',
  UPDATED = 'updated',
  STATUS_CHANGED = 'status_changed',
  DELETED = 'deleted',
}

/**
 * Audit trail for WASH form changes. Recorded on create / manager edits /
 * status changes / delete. Scope is WASH-only for now (see technical debt).
 */
@Entity('wash_form_audit_log')
export class WashFormAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => WashForm, (form) => form.auditLog, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'washFormId' })
  washForm: WashForm;

  @Index()
  @Column()
  washFormId: string;

  /** FK to users. NULL for anonymous public submit. */
  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'changedById' })
  changedBy: User | null;

  @Column({ type: 'uuid', nullable: true })
  changedById: string | null;

  /** Email snapshot so the record survives user deletion. */
  @Column({ type: 'varchar', length: 255, nullable: true })
  changedByEmail: string | null;

  @Column({ type: 'enum', enum: AuditAction })
  action: AuditAction;

  /** Specific field that changed; NULL for bulk create / delete entries. */
  @Column({ type: 'varchar', length: 100, nullable: true })
  fieldName: string | null;

  @Column({ type: 'text', nullable: true })
  oldValue: string | null;

  @Column({ type: 'text', nullable: true })
  newValue: string | null;

  /** Free-form metadata for complex diffs (e.g., child entity changes). */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;
}
