// === ADDED: PR-1 public payload for POST /api/needs-forms/recovery ===
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  Equals,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { RecoveryDamageDto } from './recovery-damage.dto';
import { RecoveryAttachmentDto } from './recovery-attachment.dto';
import {
  ACCESSIBILITY_FEATURES,
  APPLICANT_CATEGORIES,
  ASBESTOS_OPTIONS,
  COFINANCING_OPTIONS,
  COST_BASIS_OPTIONS,
  DAMAGE_CATEGORIES,
  DAMAGE_CAUSES,
  DESIRED_TIMELINES,
  DOCS_AVAILABLE_OPTIONS,
  EDUCATION_MODES,
  FUNCTIONING_STATUSES,
  HEALTH_FACILITY_KINDS,
  OBJECT_TYPES,
  OWNERSHIP_TYPES,
  PHOTOS_MAX,
  PHOTOS_MIN,
  DOCUMENTS_MAX,
  REMOTE_OPERATION_OPTIONS,
  SHELTER_STATUSES,
  SHELTER_TYPES,
  URGENCY_OPTIONS,
  WORK_CATEGORIES,
} from '../recovery.constants';
// CHANGED: type-only imports — required by isolatedModules + emitDecoratorMetadata (TS1272)
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
 * Field statuses follow implementation-plan §2 (M/I/O). Conditional blocks:
 * education fields are required only for objectType='education', healthcare
 * kind only for 'healthcare' — expressed with ValidateIf, mirroring how the
 * Angular form enables/disables the same controls.
 */
export class CreateRecoveryFormDto {
  // ── Applicant ──

  @IsIn(APPLICANT_CATEGORIES)
  applicantCategory: ApplicantCategory;

  @ValidateIf((o: CreateRecoveryFormDto) => o.applicantCategory === 'other')
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  applicantCategoryOther?: string;

  @IsString()
  @MinLength(3)
  @MaxLength(255)
  organizationName: string;

  // ── Location (same contract as wash — LocationSelector payload) ──

  @IsString()
  @MinLength(2)
  region: string;

  @IsString()
  regionEn: string;

  @IsString()
  district: string;

  @IsString()
  districtEn: string;

  @IsString()
  community: string;

  @IsString()
  communityEn: string;

  @IsString()
  communityCode: string;

  @IsOptional()
  @IsString()
  settlement?: string;

  @IsOptional()
  @IsString()
  settlementEn?: string;

  @IsOptional()
  @IsString()
  settlementCode?: string;

  // ── Contacts ──

  @IsString()
  @MinLength(2)
  @MaxLength(255)
  contactName: string;

  @IsString()
  @MinLength(2)
  @MaxLength(255)
  contactPosition: string;

  @IsString()
  @Matches(/^\+380\d{9}$/, {
    message: 'phone must be in format +380XXXXXXXXX',
  })
  phone: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  messenger?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  altContactName?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+380\d{9}$/, {
    message: 'altContactPhone must be in format +380XXXXXXXXX',
  })
  altContactPhone?: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  website?: string;

  // ── Object ──

  @IsString()
  @MinLength(3)
  @MaxLength(255)
  objectName: string;

  @IsIn(OBJECT_TYPES)
  objectType: ObjectType;

  @ValidateIf((o: CreateRecoveryFormDto) => o.objectType === 'other')
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  objectTypeOther?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  streetAddress?: string;

  @IsOptional()
  @IsIn(OWNERSHIP_TYPES)
  ownershipType?: OwnershipType;

  @ValidateIf((o: CreateRecoveryFormDto) => o.ownershipType === 'other')
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  ownershipTypeOther?: string;

  @IsOptional()
  @IsBoolean()
  onApplicantBalance?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1800)
  @Max(2100)
  buildYear?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(1_000_000)
  totalArea?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  floors?: number;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsIn(WORK_CATEGORIES, { each: true })
  workCategories: WorkCategory[];

  /** Damaged-elements checklist — at least one row (BoQ basis). */
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(9)
  @ValidateNested({ each: true })
  @Type(() => RecoveryDamageDto)
  damages: RecoveryDamageDto[];

  @IsString()
  @MinLength(100)
  @MaxLength(1500)
  damageDescription: string;

  @IsIn(DAMAGE_CAUSES)
  damageCause: DamageCause;

  @ValidateIf((o: CreateRecoveryFormDto) => o.damageCause === 'other')
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  damageCauseOther?: string;

  /** YYYY-MM. */
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'damageDate must be in format YYYY-MM',
  })
  damageDate?: string;

  @IsIn(DAMAGE_CATEGORIES)
  damageCategory: DamageCategory;

  @IsIn(FUNCTIONING_STATUSES)
  functioningStatus: FunctioningStatus;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsIn(ACCESSIBILITY_FEATURES, { each: true })
  accessibilityFeatures?: AccessibilityFeature[];

  // ── Conditional: education ──

  @ValidateIf((o: CreateRecoveryFormDto) => o.objectType === 'education')
  @IsIn(EDUCATION_MODES)
  educationMode?: EducationMode;

  @ValidateIf((o: CreateRecoveryFormDto) => o.objectType === 'education')
  @IsIn(SHELTER_STATUSES)
  shelterStatus?: ShelterStatus;

  @IsOptional()
  @IsIn(SHELTER_TYPES)
  shelterType?: ShelterType;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10_000)
  shelterCapacity?: number;

  // ── Conditional: healthcare ──

  @ValidateIf((o: CreateRecoveryFormDto) => o.objectType === 'healthcare')
  @IsIn(HEALTH_FACILITY_KINDS)
  healthFacilityKind?: HealthFacilityKind;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  suspendedServices?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  declarationsCount?: number;

  // ── Beneficiaries ──

  @IsInt()
  @Min(1)
  @Max(10_000_000)
  directBeneficiaries: number;

  @IsInt()
  @Min(0)
  idpCount: number;

  @IsInt()
  @Min(0)
  childrenCount: number;

  @IsInt()
  @Min(0)
  pwdCount: number;

  @IsInt()
  @Min(0)
  elderlyCount: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  femaleCount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maleCount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  indirectBeneficiaries?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  staffCount?: number;

  @IsOptional()
  @IsIn(REMOTE_OPERATION_OPTIONS)
  canOperateRemotely?: RemoteOperationOption;

  // ── Budget / docs / timeline ──

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(10_000_000_000)
  estimatedCost: number;

  @IsIn(COST_BASIS_OPTIONS)
  costBasis: CostBasis;

  @IsIn(COFINANCING_OPTIONS)
  cofinancing: CofinancingOption;

  @ValidateIf((o: CreateRecoveryFormDto) => o.cofinancing !== 'no')
  @IsOptional()
  @IsString()
  @MaxLength(255)
  cofinancingDetails?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsIn(DOCS_AVAILABLE_OPTIONS, { each: true })
  docsAvailable: DocsAvailableOption[];

  @IsOptional()
  @IsIn(DESIRED_TIMELINES)
  desiredTimeline?: DesiredTimeline;

  @IsOptional()
  @IsIn(URGENCY_OPTIONS)
  urgency?: UrgencyOption;

  @IsBoolean()
  otherDonors: boolean;

  /** Required when otherDonors=true (Do No Harm: хто, коли, що саме). */
  @ValidateIf((o: CreateRecoveryFormDto) => o.otherDonors === true)
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  otherDonorsDetails?: string;

  @IsIn(ASBESTOS_OPTIONS)
  asbestosPresence: AsbestosOption;

  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  cloudLink?: string;

  // ── Files (uploaded beforehand via presigned POST — PR-2) ──

  @IsArray()
  @ArrayMinSize(PHOTOS_MIN)
  @ArrayMaxSize(PHOTOS_MAX)
  @ValidateNested({ each: true })
  @Type(() => RecoveryAttachmentDto)
  photos: RecoveryAttachmentDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(DOCUMENTS_MAX)
  @ValidateNested({ each: true })
  @Type(() => RecoveryAttachmentDto)
  documents?: RecoveryAttachmentDto[];

  // ── Consent ──

  @IsBoolean()
  @Equals(true, { message: 'consentGiven must be true' })
  consentGiven: boolean;
}
