import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ComplaintCategory {
  SERVICE_QUALITY = 'service_quality',
  STAFF_BEHAVIOR = 'staff_behavior',
  CORRUPTION = 'corruption',
  DELAY = 'delay',
  OTHER = 'other',
}

export enum ComplaintStatus {
  NEW = 'new',
  IN_REVIEW = 'in_review',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

@Entity('complaints')
export class Complaint {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: ComplaintCategory })
  category: ComplaintCategory;

  @Column({ type: 'text' })
  description: string;

  // Optional for anonymous submission
  @Column({ type: 'varchar', nullable: true })
  email: string | null;

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

  // S3 URLs for attached files/photos
  @Column({ type: 'jsonb', nullable: true })
  attachments: Array<{ name: string; url: string }> | null;

  // What resolution the submitter expects
  @Column({ type: 'text', nullable: true })
  expectedResolution: string | null;

  @Column({ type: 'enum', enum: ComplaintStatus, default: ComplaintStatus.NEW })
  status: ComplaintStatus;

  // Historical submission date; defaults to createdAt if not provided
  @Column({ type: 'timestamptz', nullable: true })
  submittedAt: Date | null;

  // Manager internal notes (not visible to submitter)
  @Column({ type: 'text', nullable: true })
  managerNotes: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
