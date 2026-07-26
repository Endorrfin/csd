// PR-W1 Winterization form parent entity
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
import { WinterizationFormNeed } from './winterization-form-need.entity';
import type {
  BackupPowerOption,
  BuildingCondition,
  FacilityKind,
  FrontlineStatus,
  HeatingSource,
  HouseholdCriticalNeed,
  HouseholdHeatingType,
  HouseholdVulnerability,
  LogisticsOption,
  NeedByOption,
  NeedCategory,
  ResiliencePointStatus,
  WinterizationApplicantType,
  WinterizationCofinancing,
  WinterizationCostBasis,
  WinterizationDocsOption,
  WinterizationUrgency,
} from '../winterization.constants';

/**
 * «Підготовка до зими» (Winterization) needs form.
 *
 * Option-like fields are varchar / text[] (validated by DTO `IsIn`) rather than
 * pg enums — adding a value stays a code-only change. `status` is the ONE
 * exception: it reuses the shared 6-value `needs_form_status_enum` created by
 * the Recovery migration, so one admin UI serves every needs form. In the
 * winterization context `approved` is labelled «Включено в проєкт» (the 4-status
 * list in the ТЗ maps onto these 6 — decision of 2026-07-26).
 *
 * NULLABILITY RULE — read this before adding a column:
 * a column is nullable when at least ONE applicant type does not collect it
 * (e.g. `contactPosition` is meaningless for a household, `hhAdults` for an
 * institution). Per-type requirements are enforced by
 * CreateWinterizationFormDto via `ValidateIf(applicantType …)` — the same
 * "DB permissive, DTO strict" approach the module already uses for option
 * values. Two blocks stay NOT NULL for every type on purpose:
 *   • the SADD beneficiary counts — derived server-side for households from the
 *     household composition, so analytics/XLSX never see NULLs;
 *   • `needCategories` — derived for households from `hhCriticalNeed`.
 *
 * Attachments live in the polymorphic `needs_form_attachments` table
 * (formType='winterization' + formId, no FK) — composed by WinterizationService.
 */
@Entity('winterization_forms')
export class WinterizationForm {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Human-facing number, e.g. CSD-W-2026-0001. Shown on the Thank-You page. */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 20 })
  trackingNumber: string;

  /** ОМС / інституція / домогосподарство (the last one is gated off — §7). */
  @Index()
  @Column({ type: 'varchar', length: 20 })
  applicantType: WinterizationApplicantType;

  // ── Крок 1: applicant & contacts ──

  /** Назва громади/ОМС, закладу, або ПІБ для домогосподарства. */
  @Column()
  organizationName: string;

  /** ЄДРПОУ (8 digits) — cheap legal-entity verification + deduplication. */
  @Column({ type: 'varchar', length: 8, nullable: true })
  edrpou: string | null;

  // Location — same contract as wash_forms / recovery_forms (LocationSelector).

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

  @Column()
  contactName: string;

  /** Required for ОМС/інституція; NULL for a household applicant. */
  @Column({ type: 'varchar', nullable: true })
  contactPosition: string | null;

  /** +380XXXXXXXXX (DTO-enforced, same as recovery/wash). */
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

  // ── Крок 2а: institution (applicantType = 'institution') ──

  @Column({ type: 'varchar', nullable: true })
  facilityName: string | null;

  @Index()
  @Column({ type: 'varchar', length: 40, nullable: true })
  facilityKind: FacilityKind | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  facilityKindOther: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  streetAddress: string | null;

  /** SN201A (utility-based) vs SN201B (solid fuel) — decides the modality. */
  @Column({ type: 'varchar', length: 30, nullable: true })
  heatingSource: HeatingSource | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  heatingSourceOther: string | null;

  /** m². NUMERIC comes back as string from pg — coerce on the client. */
  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  heatedArea: number | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  backupPower: BackupPowerOption | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  buildingCondition: BuildingCondition | null;

  // ── Крок 2б: municipality (applicantType = 'municipality') ──

  @Column({ type: 'int', nullable: true })
  populationTotal: number | null;

  @Column({ type: 'int', nullable: true })
  settlementsCovered: number | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  frontlineStatus: FrontlineStatus | null;

  /** Free-text link between the need and the infrastructure behind it. */
  @Column({ type: 'text', nullable: true })
  targetFacilities: string | null;

  // ── Крок 3: needs ──

  /** ≥1 value. Derived from hhCriticalNeed for households (see entity docblock). */
  @Column('text', { array: true })
  needCategories: NeedCategory[];

  /** Required when 'other' is among needCategories. */
  @Column({ type: 'varchar', length: 500, nullable: true })
  needCategoryOther: string | null;

  /** Narrative for the proposal. NULL for households (structured need instead). */
  @Column({ type: 'text', nullable: true })
  situationDescription: string | null;

  // Category-level scalars (item-level quantities live in the child table).

  @Column({ type: 'int', nullable: true })
  solidFuelBoilerCount: number | null;

  /** SN201B precondition: is there anywhere to store the delivered fuel. */
  @Column({ type: 'boolean', nullable: true })
  solidFuelStorageAvailable: boolean | null;

  /** Required when 'heating_system_repair' is selected. */
  @Column({ type: 'text', nullable: true })
  heatingRepairDescription: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  resiliencePointStatus: ResiliencePointStatus | null;

  @Column({ type: 'int', nullable: true })
  resiliencePointCapacity: number | null;

  /** Months of generator fuel needed (1–6). Litres/month live on the need row. */
  @Column({ type: 'int', nullable: true })
  liquidFuelMonthsNeeded: number | null;

  // ── Крок 4: beneficiaries (SADD minimum: UHF / IASC GAM) ──

  @Column({ type: 'int' })
  directBeneficiaries: number;

  @Column({ type: 'int' })
  idpCount: number;

  @Column({ type: 'int' })
  childrenCount: number;

  @Column({ type: 'int' })
  pwdCount: number;

  /** 60+ — the priority winter vulnerability group for UHF / Winter Response. */
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

  // ── Крок 5: budget & coordination ──

  /** SN201B: fuel should land before October; March onwards = incomplete season. */
  @Column({ type: 'varchar', length: 20 })
  needBy: NeedByOption;

  @Index()
  @Column({ type: 'varchar', length: 20 })
  urgency: WinterizationUrgency;

  /**
   * UAH — OPTIONAL by design (unlike recovery_forms, where it is NOT NULL):
   * commodity needs are budgeted analyst-side from quantities × cluster
   * reference costs, so a hromada without a кошторис is not blocked.
   */
  @Column({ type: 'numeric', precision: 14, scale: 2, nullable: true })
  estimatedCost: number | null;

  /** Required only when estimatedCost is provided. */
  @Column({ type: 'varchar', length: 30, nullable: true })
  costBasis: WinterizationCostBasis | null;

  /** Do No Harm / deduplication (ECHO complementarity). */
  @Column({ type: 'boolean' })
  otherDonors: boolean;

  @Column({ type: 'text', nullable: true })
  otherDonorsDetails: string | null;

  /** NULL for households (not part of that questionnaire). */
  @Column({ type: 'varchar', length: 10, nullable: true })
  cofinancing: WinterizationCofinancing | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  cofinancingDetails: string | null;

  @Column('text', { array: true, nullable: true })
  logistics: LogisticsOption[] | null;

  @Column('text', { array: true, nullable: true })
  docsAvailable: WinterizationDocsOption[] | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  cloudLink: string | null;

  // ── §7: household block (persisted, gated off at launch) ──

  @Column({ type: 'varchar', length: 255, nullable: true })
  hhStreetAddress: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  hhHouseNumber: string | null;

  @Column('text', { array: true, nullable: true })
  hhVulnerabilities: HouseholdVulnerability[] | null;

  @Column({ type: 'int', nullable: true })
  hhAdults: number | null;

  @Column({ type: 'int', nullable: true })
  hhChildren: number | null;

  @Column({ type: 'int', nullable: true })
  hhElderly: number | null;

  @Column({ type: 'int', nullable: true })
  hhPwd: number | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  hhHeatingType: HouseholdHeatingType | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  hhHeatingTypeOther: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  hhCriticalNeed: HouseholdCriticalNeed | null;

  // ── Children ──

  @OneToMany(() => WinterizationFormNeed, (n) => n.winterizationForm, {
    cascade: true,
    eager: true,
  })
  needs: WinterizationFormNeed[];

  // ── Service fields ──

  /** Shared 6-value lifecycle (pg type created by the Recovery migration). */
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

  /** Consent fact snapshot (GDPR / ЗУ «Про захист персональних даних»). */
  @Column({ type: 'boolean', default: false })
  consentGiven: boolean;

  @Index()
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
