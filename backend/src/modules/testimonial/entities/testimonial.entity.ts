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

// === kinds of WASH assistance a beneficiary may report receiving ===
export enum AssistanceType {
  BOREHOLE_DRILLING = 'borehole_drilling',
  WATER_TOWERS = 'water_towers',
  PIPES_VALVES_FITTINGS = 'pipes_valves_fittings',
  PURIFICATION_SYSTEM = 'purification_system',
  PUMPS_EQUIPMENT = 'pumps_equipment',
  WATER_TANKS = 'water_tanks',
  BOTTLED_WATER = 'bottled_water',
  HYGIENE_KITS = 'hygiene_kits',
  EQUIPMENT = 'equipment',
  WASH_REHABILITATION = 'wash_rehabilitation',
  OTHER = 'other',
}

// === single evidence photo (uploaded to S3 or external link) ===
export interface TestimonialPhoto {
  url: string;
  name?: string;
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

  // === evidence gallery (max 3, enforced in DTO) — uploaded S3 files or external links ===
  @Column({ type: 'jsonb', nullable: true })
  photos: TestimonialPhoto[] | null;

  // === kinds of assistance received (multi-select) ===
  @Column({
    type: 'enum',
    enum: AssistanceType,
    array: true,
    nullable: true,
  })
  assistanceTypes: AssistanceType[] | null;

  // === free-text detail when AssistanceType.OTHER is selected ===
  @Column({ type: 'varchar', nullable: true })
  assistanceTypeOther: string | null;

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

  @Column({
    type: 'enum',
    enum: TestimonialStatus,
    default: TestimonialStatus.PENDING,
  })
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
