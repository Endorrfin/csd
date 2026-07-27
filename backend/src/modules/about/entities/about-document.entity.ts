import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import type {
  AboutDocumentAccessMode,
  AboutDocumentType,
} from '../about-documents.constants';
import { AboutDocumentFile } from './about-document-file.entity';

@Entity('about_documents')
export class AboutDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // === ADDED: PR-D1 — register code (CSD-POL-01…). Public identifier used in URLs,
  // so the internal uuid never leaks and links survive a re-import. ===
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 32 })
  code: string;

  @Column({ name: 'title_ua' })
  titleUa: string;

  @Column({ name: 'title_en' })
  titleEn: string;

  @Column({ name: 'description_ua', type: 'text', nullable: true })
  descriptionUa: string | null;

  @Column({ name: 'description_en', type: 'text', nullable: true })
  descriptionEn: string | null;

  // CHANGED: PR-D1 — pg enum → varchar. The register already needs 9 types and will
  // keep growing; `as const` + varchar makes a new type a DTO-level change.
  @Index()
  @Column({
    name: 'document_type',
    type: 'varchar',
    length: 32,
    default: 'POLICY',
  })
  documentType: AboutDocumentType;

  // === ADDED: PR-D1 — per-document access mode (see about-documents.constants.ts) ===
  @Index()
  @Column({
    name: 'access_mode',
    type: 'varchar',
    length: 32,
    default: 'view_only',
  })
  accessMode: AboutDocumentAccessMode;

  // CHANGED: PR-D1 — was `file_url`. Retained read-only for the Drive → S3 migration
  // window and never included in any public payload.
  @Column({ name: 'legacy_file_url', type: 'varchar', nullable: true })
  legacyFileUrl: string | null;

  @Column({ name: 'last_review_date', type: 'date', nullable: true })
  lastReviewDate: Date | null;

  // === ADDED: PR-D1 — register column "Дата наступного перегляду" ===
  @Column({ name: 'next_review_date', type: 'date', nullable: true })
  nextReviewDate: Date | null;

  // explicit type 'varchar' — required because `string | null` union
  // reflects as `Object` via reflect-metadata, breaking TypeORM type inference
  @Column({ type: 'varchar', nullable: true })
  version: string | null;

  @Index()
  @Column({ name: 'is_published', default: false })
  isPublished: boolean;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  // === ADDED: PR-D1 — language / version variants stored in the PRIVATE bucket ===
  @OneToMany(() => AboutDocumentFile, (file) => file.document)
  files: AboutDocumentFile[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
