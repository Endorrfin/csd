import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum AboutSectionKey {
  INTRO = 'INTRO',
  MISSION = 'MISSION',
  VISION = 'VISION',
  VALUES = 'VALUES',
  DIRECTIONS = 'DIRECTIONS',
  KEY_FACTS = 'KEY_FACTS',
  RESULTS = 'RESULTS',
  TEAM_INTRO = 'TEAM_INTRO',
  CONTACTS_INTRO = 'CONTACTS_INTRO',
  DOCUMENTS_INTRO = 'DOCUMENTS_INTRO',
}

// CHANGED: shape for KEY_FACTS section metadata (variant A — flexible JSONB array)
export interface KeyFactItem {
  labelUa: string;
  labelEn: string;
  value: string;
}

export interface AboutSectionMetadata {
  items?: KeyFactItem[];
}

@Entity('about_sections')
export class AboutSection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: AboutSectionKey,
    enumName: 'about_section_key_enum',
    unique: true,
  })
  key: AboutSectionKey;

  @Column({ name: 'title_ua' })
  titleUa: string;

  @Column({ name: 'title_en' })
  titleEn: string;

  // Quill HTML, nullable so empty placeholder sections can exist before content is written
  @Column({ name: 'content_ua', type: 'text', nullable: true })
  contentUa: string | null;

  @Column({ name: 'content_en', type: 'text', nullable: true })
  contentEn: string | null;

  // Structured data for sections like KEY_FACTS, RESULTS
  @Column({ type: 'jsonb', nullable: true })
  metadata: AboutSectionMetadata | null;

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
