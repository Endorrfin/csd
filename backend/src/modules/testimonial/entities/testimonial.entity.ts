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

export enum TestimonialStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('testimonials')
export class Testimonial {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  authorName: string;

  @Column({ type: 'varchar', nullable: true })
  organization: string | null;

  @Column({ type: 'text' })
  text: string;

  // Rating 1–5; null means no rating provided
  @Column({ type: 'int', nullable: true })
  rating: number | null;

  @Column({ type: 'varchar', nullable: true })
  photoUrl: string | null;

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

  // Manager marks as verified (trustworthy source)
  @Column({ type: 'boolean', default: false })
  isVerified: boolean;

  @Column({ type: 'enum', enum: TestimonialStatus, default: TestimonialStatus.PENDING })
  status: TestimonialStatus;

  // Historical publication date; set on approval
  @Column({ type: 'timestamptz', nullable: true })
  publishedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  managerNotes: string | null;

  // Author (registered user required)
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
