// Recovery form parent entity
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { FormStatus } from './wash-form.entity';
import { RecoveryFormDamage } from './recovery-form-damage.entity';
import type {
  AccessibilityFeature,
  ApplicantCategory,
  AsbestosOption,
  CofinancingOption,
  CostBasis,
  DamageCategory,
  DamageCause,
  DesiredTimeline,
  DocsAvailableOption,
  EducationMode,
  FunctioningStatus,
  HealthFacilityKind,
  ObjectType,
  OwnershipType,
  RemoteOperationOption,
  ShelterStatus,
  ShelterType,
  UrgencyOption,
  WorkCategory,
} from '../recovery.constants';

/**
 * «Ремонт і відновлення соціальної інфраструктури» needs form.
 *
 * Option-like fields are stored as varchar (validated by DTO IsIn) instead of
 * pg enums — adding a value stays a code-only change. `status` is the ONE
 * exception: it shares the 6-value lifecycle with WASH and is stable, so it
 * uses a pg enum type `needs_form_status_enum` shared by future form types.
 *
 * Attachments live in the polymorphic `needs_form_attachments` table
 * (formType + formId, no FK) — composed by RecoveryService, not a relation.
 */
@Entity('recovery_forms')
export class RecoveryForm {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Human-facing number, e.g. CSD-R-2026-0042. Shown on Thank-You page. */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 20 })
  trackingNumber: string;

  // ── Applicant ──

  @Column({ type: 'varchar', length: 40 })
  applicantCategory: ApplicantCategory;

  @Column({ type: 'varchar', length: 255, nullable: true })
  applicantCategoryOther: string | null;

  @Column()
  organizationName: string;

  // ── Location (same shape as wash_forms — LocationSelector payload) ──

  @Index()
  @Column()
  region: string;

  @Column({ default: '' })
  regionEn: string;

  @Column({ default: '' })
  district: string;

  @Column({ default: '' })
  districtEn: string;

  @Column({ default: '' })
  community: string;

  @Column({ default: '' })
  communityEn: string;

  @Column({ default: '' })
  communityCode: string;

  @Column({ type: 'varchar', nullable: true })
  settlement: string | null;

  @Column({ type: 'varchar', nullable: true })
  settlementEn: string | null;

  @Column({ type: 'varchar', nullable: true })
  settlementCode: string | null;

  // ── Contacts ──

  @Column()
  contactName: string;

  @Column()
  contactPosition: string;

  /** +380XXXXXXXXX (DTO-enforced, same as complaint/wash). */
  @Column()
  phone: string;

  @Column()
  email: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  messenger: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  altContactName: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  altContactPhone: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  website: string | null;

  // ── Object ──

  @Column()
  objectName: string;

  @Index()
  @Column({ type: 'varchar', length: 40 })
  objectType: ObjectType;

  @Column({ type: 'varchar', length: 255, nullable: true })
  objectTypeOther: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  streetAddress: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  ownershipType: OwnershipType | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  ownershipTypeOther: string | null;

  @Column({ type: 'boolean', nullable: true })
  onApplicantBalance: boolean | null;

  @Column({ type: 'int', nullable: true })
  buildYear: number | null;

  /** m². NUMERIC comes back as string from pg — coerce on the client. */
  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  totalArea: number | null;

  @Column({ type: 'int', nullable: true })
  floors: number | null;

  @Column('text', { array: true })
  workCategories: WorkCategory[];

  @Column({ type: 'text' })
  damageDescription: string;

  @Column({ type: 'varchar', length: 40 })
  damageCause: DamageCause;

  @Column({ type: 'varchar', length: 255, nullable: true })
  damageCauseOther: string | null;

  /** YYYY-MM (month precision is enough for damage attribution). */
  @Column({ type: 'varchar', length: 7, nullable: true })
  damageDate: string | null;

  /** Методика №65: category_1 (≤40%) / category_2 (41–80%) / category_3 (81–100%) / undetermined. */
  @Column({ type: 'varchar', length: 20 })
  damageCategory: DamageCategory;

  /** HeRAMS-style: operational / partially_operational / not_operational. */
  @Column({ type: 'varchar', length: 30 })
  functioningStatus: FunctioningStatus;

  @Column('text', { array: true, nullable: true })
  accessibilityFeatures: AccessibilityFeature[] | null;

  // ── Conditional: education (objectType = 'education') ──

  @Column({ type: 'varchar', length: 20, nullable: true })
  educationMode: EducationMode | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  shelterStatus: ShelterStatus | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  shelterType: ShelterType | null;

  @Column({ type: 'int', nullable: true })
  shelterCapacity: number | null;

  // ── Conditional: healthcare (objectType = 'healthcare') ──

  @Column({ type: 'varchar', length: 30, nullable: true })
  healthFacilityKind: HealthFacilityKind | null;

  @Column({ type: 'text', nullable: true })
  suspendedServices: string | null;

  @Column({ type: 'int', nullable: true })
  declarationsCount: number | null;

  // ── Beneficiaries (SADD minimum: UHF/GAM) ──

  @Column({ type: 'int' })
  directBeneficiaries: number;

  @Column({ type: 'int' })
  idpCount: number;

  @Column({ type: 'int' })
  childrenCount: number;

  @Column({ type: 'int' })
  pwdCount: number;

  @Column({ type: 'int' })
  elderlyCount: number;

  @Column({ type: 'int', nullable: true })
  femaleCount: number | null;

  @Column({ type: 'int', nullable: true })
  maleCount: number | null;

  @Column({ type: 'int', nullable: true })
  indirectBeneficiaries: number | null;

  @Column({ type: 'int', nullable: true })
  staffCount: number | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  canOperateRemotely: RemoteOperationOption | null;

  // ── Budget / docs / timeline ──

  /** UAH. NUMERIC → string at runtime; client coerces. */
  @Column({ type: 'numeric', precision: 14, scale: 2 })
  estimatedCost: number;

  @Column({ type: 'varchar', length: 30 })
  costBasis: CostBasis;

  @Column({ type: 'varchar', length: 10 })
  cofinancing: CofinancingOption;

  @Column({ type: 'varchar', length: 255, nullable: true })
  cofinancingDetails: string | null;

  @Column('text', { array: true })
  docsAvailable: DocsAvailableOption[];

  @Column({ type: 'varchar', length: 20, nullable: true })
  desiredTimeline: DesiredTimeline | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  urgency: UrgencyOption | null;

  /** Do No Harm / deduplication (ECHO complementarity). */
  @Column({ type: 'boolean' })
  otherDonors: boolean;

  @Column({ type: 'text', nullable: true })
  otherDonorsDetails: string | null;

  /** ECHO environmental screening: asbestos-containing materials. */
  @Column({ type: 'varchar', length: 10 })
  asbestosPresence: AsbestosOption;

  @Column({ type: 'varchar', length: 500, nullable: true })
  cloudLink: string | null;

  // ── Children ──

  @OneToMany(() => RecoveryFormDamage, (d) => d.recoveryForm, {
    cascade: true,
    eager: true,
  })
  damages: RecoveryFormDamage[];

  // ── Service fields ──

  /** Same 6-value lifecycle as WASH; shared pg type for future form types. */
  @Index()
  @Column({
    type: 'enum',
    enum: FormStatus,
    enumName: 'needs_form_status_enum',
    default: FormStatus.NEW,
  })
  status: FormStatus;

  @Column({ type: 'text', nullable: true })
  managerNotes: string | null;

  /** Consent fact snapshot (GDPR / ЗУ №2297-VI). */
  @Column({ type: 'boolean', default: false })
  consentGiven: boolean;

  @Index()
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
