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

export enum ProcurementDonor {
  UNICEF = 'UNICEF',
  UHF = 'UHF',
  GIZ = 'GIZ',
  LDS = 'LDS',
  OTHER = 'OTHER',
}

export enum ProcurementMethod {
  OPEN_TENDER = 'open_tender',
  RFQ = 'rfq',
  RFP = 'rfp',
}

export enum ProcurementCategory {
  GOODS = 'goods',
  WORKS = 'works',
  SERVICES = 'services',
}

export enum LotStructure {
  SINGLE = 'single',
  MULTIPLE = 'multiple',
}

export enum SubmissionMethod {
  EMAIL = 'email',
  COURIER = 'courier',
  EPLATFORM = 'eplatform',
}

export enum ProcurementStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  CLOSED = 'closed',
}

@Entity('procurements')
export class Procurement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ─── Step 1: Basic Information ───────────────────────────────
  @Column()
  tenderTitleUa: string;

  @Column()
  tenderTitleEn: string;

  @Column({ type: 'varchar', nullable: true })
  referenceNumber: string | null;

  @Column({ type: 'enum', enum: ProcurementDonor, nullable: true })
  donor: ProcurementDonor | null;

  @Column({ type: 'varchar', nullable: true })
  projectName: string | null;

  @Column({ type: 'varchar', nullable: true })
  projectCode: string | null;

  @Column({ type: 'varchar', nullable: true })
  implementingOrganization: string | null;

  // ─── Step 2: Procurement Details ─────────────────────────────
  @Column({ type: 'enum', enum: ProcurementMethod, nullable: true })
  procurementMethod: ProcurementMethod | null;

  @Column({ type: 'enum', enum: ProcurementCategory, nullable: true })
  procurementCategory: ProcurementCategory | null;

  @Column({ type: 'enum', enum: LotStructure, default: LotStructure.SINGLE })
  lotStructure: LotStructure;

  // ─── Step 3: Technical Details ───────────────────────────────
  @Column({ type: 'text', nullable: true })
  shortDescriptionUa: string | null;

  @Column({ type: 'text', nullable: true })
  shortDescriptionEn: string | null;

  // Rich text HTML from Quill editor
  @Column({ type: 'text', nullable: true })
  detailedDescriptionUa: string | null;

  @Column({ type: 'text', nullable: true })
  detailedDescriptionEn: string | null;

  @Column({ type: 'varchar', nullable: true })
  region: string | null;

  // Array of community names selected via LocationSelector
  @Column({ type: 'jsonb', nullable: true })
  communities: string[] | null;

  @Column({ type: 'int', nullable: true })
  implementationPeriodDays: number | null;

  // Technical docs: BOQ, specs, drawings (S3 URLs)
  @Column({ type: 'jsonb', nullable: true })
  technicalDocuments: Array<{ name: string; url: string }> | null;

  // ─── Step 4: Submission & Timeline ───────────────────────────
  // Historical dates allowed (data migration from old portal)
  @Column({ type: 'timestamptz', nullable: true })
  publicationDate: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  clarificationDeadline: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  bidSubmissionDeadline: Date | null;

  // Historical date allowed
  @Column({ type: 'timestamptz', nullable: true })
  expectedStartDate: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  submissionMethods: SubmissionMethod[] | null;

  @Column({ type: 'varchar', nullable: true })
  submissionEmail: string | null;

  @Column({ type: 'jsonb', nullable: true })
  submissionLanguages: string[] | null;

  @Column({ type: 'varchar', nullable: true })
  fileRequirements: string | null;

  // ─── Step 5: Evaluation & Compliance ─────────────────────────
  @Column({ type: 'varchar', nullable: true })
  evaluationMethod: string | null;

  @Column({ type: 'jsonb', nullable: true })
  evaluationCriteria: Array<{
    criteriaUa: string;
    criteriaEn: string;
    weight: number;
  }> | null;

  @Column({ type: 'jsonb', nullable: true })
  eligibilityRequirements: string[] | null;

  // Compliance checkboxes rendered from this list
  @Column({ type: 'jsonb', nullable: true })
  complianceChecks: Array<{ labelUa: string; labelEn: string }> | null;

  // ─── Step 6: Attachments ─────────────────────────────────────
  @Column({ type: 'jsonb', nullable: true })
  attachments: Array<{ name: string; url: string; fileType: string }> | null;

  // ─── Admin fields ─────────────────────────────────────────────
  @Column({
    type: 'enum',
    enum: ProcurementStatus,
    default: ProcurementStatus.DRAFT,
  })
  status: ProcurementStatus;

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
