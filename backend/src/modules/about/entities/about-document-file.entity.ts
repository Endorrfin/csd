// === ADDED: PR-D1 — one row per (document, locale, version).
// The PDF itself lives in the PRIVATE bucket (csd-media-private); only short-lived
// presigned GETs are ever handed out, and `GET /api/about` never contains a URL. ===
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { AboutDocumentLocale } from '../about-documents.constants';
import { AboutDocument } from './about-document.entity';

@Entity('about_document_files')
@Index(['documentId', 'locale', 'isCurrent'])
export class AboutDocumentFile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'document_id', type: 'uuid' })
  documentId: string;

  @ManyToOne(() => AboutDocument, (document) => document.files, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'document_id' })
  document: AboutDocument;

  @Column({ type: 'varchar', length: 5 })
  locale: AboutDocumentLocale;

  @Column({ type: 'varchar', length: 20 })
  version: string;

  @Column({ name: 'effective_date', type: 'date', nullable: true })
  effectiveDate: Date | null;

  @Column({ name: 's3_key', type: 'varchar', length: 512 })
  s3Key: string;

  @Column({ name: 'original_name', type: 'varchar', length: 255 })
  originalName: string;

  @Column({
    name: 'mime_type',
    type: 'varchar',
    length: 128,
    default: 'application/pdf',
  })
  mimeType: string;

  @Column({ name: 'size_bytes', type: 'integer' })
  sizeBytes: number;

  @Column({ name: 'page_count', type: 'integer', nullable: true })
  pageCount: number | null;

  @Column({
    name: 'checksum_sha256',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  checksumSha256: string | null;

  // A partial unique index guarantees at most one current file per document+locale.
  @Column({ name: 'is_current', default: true })
  isCurrent: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
