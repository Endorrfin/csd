import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('pages')
export class Page {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Unique URL slug: "about", "achievements", "contacts"
  @Column({ unique: true })
  slug: string;

  @Column()
  titleUa: string;

  @Column()
  titleEn: string;

  // Page HTML content (i18n)
  @Column({ type: 'text' })
  contentUa: string;

  @Column({ type: 'text' })
  contentEn: string;

  @Column({ default: true })
  isPublished: boolean;

  @Column({ default: 0 })
  sortOrder: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
