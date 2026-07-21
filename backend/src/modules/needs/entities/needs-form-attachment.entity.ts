// shared polymorphic attachments for needs forms
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import type { AttachmentKind } from '../recovery.constants';

/**
 * File attached to ANY needs form (recovery today; winterization next).
 * Polymorphic (formType + formId) — intentionally NO FK to the form table,
 * so one table serves every future form. The owning service is responsible
 * for deleting rows when the form is removed (see RecoveryService.remove).
 */
@Entity('needs_form_attachments')
@Index('IDX_needs_form_attachments_form', ['formType', 'formId'])
export class NeedsFormAttachment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Discriminator: 'recovery' | 'winterization' | … */
  @Column({ type: 'varchar', length: 32 })
  formType: string;

  @Column({ type: 'uuid' })
  formId: string;

  @Column({ type: 'varchar', length: 16 })
  kind: AttachmentKind;

  /** Key inside the csd-media bucket, e.g. media/needs/recovery/photo/... */
  @Column({ type: 'varchar', length: 512 })
  s3Key: string;

  /** CloudFront/S3 URL. Nullable — documents may go private-only (Phase 2). */
  @Column({ type: 'varchar', length: 1000, nullable: true })
  publicUrl: string | null;

  @Column({ type: 'varchar', length: 255 })
  originalName: string;

  @Column({ type: 'varchar', length: 100 })
  mimeType: string;

  @Column({ type: 'int' })
  sizeBytes: number;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn()
  createdAt: Date;
}
