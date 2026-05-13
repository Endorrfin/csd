import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum AboutDocumentType {
  POLICY = 'POLICY',
  PROCEDURE = 'PROCEDURE',
  REGULATION = 'REGULATION',
  CODE = 'CODE',
  REPORT = 'REPORT',
}

@Entity('about_documents')
export class AboutDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'title_ua' })
  titleUa: string;

  @Column({ name: 'title_en' })
  titleEn: string;

  @Column({ name: 'description_ua', type: 'text', nullable: true })
  descriptionUa: string | null;

  @Column({ name: 'description_en', type: 'text', nullable: true })
  descriptionEn: string | null;

  @Index()
  @Column({
    name: 'document_type',
    type: 'enum',
    enum: AboutDocumentType,
    enumName: 'about_document_type_enum',
    default: AboutDocumentType.POLICY,
  })
  documentType: AboutDocumentType;

  // explicit type 'varchar' — required because `string | null` union
  // reflects as `Object` via reflect-metadata, breaking TypeORM type inference
  @Column({ name: 'file_url', type: 'varchar', nullable: true })
  fileUrl: string | null;

  @Column({ name: 'last_review_date', type: 'date', nullable: true })
  lastReviewDate: Date | null;

  // CHANGED: same fix — explicit varchar for nullable string column
  @Column({ type: 'varchar', nullable: true })
  version: string | null;

  @Index()
  @Column({ name: 'is_published', default: false })
  isPublished: boolean;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
