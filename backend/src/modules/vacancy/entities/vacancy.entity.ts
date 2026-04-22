import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum EmploymentType {
  FULL_TIME = 'full_time',
  PART_TIME = 'part_time',
  VOLUNTEER = 'volunteer',
}

export enum VacancyStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  EXTENDED = 'extended',
  ON_HOLD = 'on_hold',
  SUSPENDED = 'suspended',
  CANCELLED = 'cancelled',
  HIRED = 'hired',
  /** @deprecated use HIRED instead. Kept for PostgreSQL enum compatibility. */
  CLOSED = 'closed',
}

@Entity('vacancies')
export class Vacancy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ── Bilingual title ──
  @Column()
  titleUa: string;

  @Column()
  titleEn: string;

  // Rich text HTML (Quill)
  @Column({ type: 'text' })
  descriptionUa: string;

  @Column({ type: 'text' })
  descriptionEn: string;

  @Column({ type: 'text', nullable: true })
  requirementsUa: string | null;

  @Column({ type: 'text', nullable: true })
  requirementsEn: string | null;

  @Column({ type: 'enum', enum: EmploymentType })
  employmentType: EmploymentType;

  // ── Location fields (same pattern as WashForm) ──
  @Column({ type: 'varchar', nullable: true })
  region: string | null;

  @Column({ type: 'varchar', nullable: true })
  regionEn: string | null;

  @Column({ type: 'varchar', nullable: true })
  district: string | null;

  @Column({ type: 'varchar', nullable: true })
  districtEn: string | null;

  @Column({ type: 'varchar', nullable: true })
  community: string | null;

  @Column({ type: 'varchar', nullable: true })
  communityEn: string | null;

  @Column({ type: 'varchar', nullable: true })
  communityCode: string | null;

  @Column({ type: 'varchar', nullable: true })
  settlement: string | null;

  @Column({ type: 'varchar', nullable: true })
  settlementEn: string | null;

  @Column({ type: 'varchar', nullable: true })
  settlementCode: string | null;

  // Historical date allowed (data migration support)
  @Column({ type: 'timestamptz', nullable: true })
  applicationDeadline: Date | null;

  @Column({ type: 'varchar', nullable: true })
  salary: string | null;

  @Column({ type: 'enum', enum: VacancyStatus, default: VacancyStatus.DRAFT })
  status: VacancyStatus;

  // Historical publication date; defaults to NOW() on publish if not provided
  @Column({ type: 'timestamptz', nullable: true })
  publishedAt: Date | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User | null;

  @Column({ type: 'varchar', nullable: true, name: 'created_by_id' })
  createdById: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
