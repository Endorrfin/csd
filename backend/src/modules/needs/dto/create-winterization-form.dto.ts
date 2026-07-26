// === ADDED: PR-W1 public payload for POST /api/needs-forms/winterization ===
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
import { WinterizationNeedDto } from './winterization-need.dto';
import { WinterizationAttachmentDto } from './winterization-attachment.dto';
import {
  BACKUP_POWER_OPTIONS,
  BUILDING_CONDITIONS,
  FACILITY_KINDS,
  FRONTLINE_STATUSES,
  HEATING_SOURCES,
  HOUSEHOLD_CRITICAL_NEEDS,
  HOUSEHOLD_HEATING_TYPES,
  HOUSEHOLD_VULNERABILITIES,
  LOGISTICS_OPTIONS,
  NEED_BY_OPTIONS,
  NEED_CATEGORIES,
  NEEDS_ROWS_MAX,
  RESILIENCE_POINT_STATUSES,
  WINTERIZATION_APPLICANT_TYPES,
  WINTERIZATION_COFINANCING_OPTIONS,
  WINTERIZATION_COST_BASIS_OPTIONS,
  WINTERIZATION_DOCS_OPTIONS,
  WINTERIZATION_DOCUMENTS_MAX,
  WINTERIZATION_PHOTOS_MAX,
  WINTERIZATION_URGENCY_OPTIONS,
} from '../winterization.constants';
// type-only imports — required by isolatedModules + emitDecoratorMetadata (TS1272)
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

// ── ValidateIf predicates (implementation-plan §2) ──
// Everything an ОМС/інституція fills is required for those two types and absent
// for a household, and vice versa. Category-driven blocks key off needCategories.

const isInstitution = (o: CreateWinterizationFormDto): boolean =>
  o.applicantType === 'institution';

/** ОМС + інституція — the two applicant types active at launch. */
const isOrganization = (o: CreateWinterizationFormDto): boolean =>
  o.applicantType !== 'household';

const isHousehold = (o: CreateWinterizationFormDto): boolean =>
  o.applicantType === 'household';

const hasCategory = (
  o: CreateWinterizationFormDto,
  category: NeedCategory,
): boolean =>
  Array.isArray(o.needCategories) && o.needCategories.includes(category);

/**
 * Public winterization payload.
 *
 * ⚠ ValidateIf semantics: when the predicate is false class-validator skips the
 * property's validators, but `whitelist: true` does NOT strip it (the property
 * is still "known"). A crafted household payload could therefore carry
 * institution fields and vice versa — WinterizationService nulls every block
 * that does not belong to the applicant type / selected categories before
 * persisting, and derives needCategories + the SADD counts for households
 * rather than trusting the client.
 */
export class CreateWinterizationFormDto {
  // ── Крок 0/1: applicant type & contacts ──

  @IsIn(WINTERIZATION_APPLICANT_TYPES)
  applicantType: WinterizationApplicantType;

  /** Назва громади/ОМС або закладу; ПІБ для домогосподарства. */
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  organizationName: string;

  /** ЄДРПОУ — optional legal-entity verification hook. */
  @IsOptional()
  @Matches(/^\d{8}$/, { message: 'edrpou must be exactly 8 digits' })
  edrpou?: string;

  // Location — same contract as wash/recovery (LocationSelector payload).

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

  @IsString()
  @MinLength(2)
  @MaxLength(255)
  contactName: string;

  /** Not applicable to a household applicant. */
  @ValidateIf(isOrganization)
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  contactPosition?: string;

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

  // ── Крок 2а: institution ──

  @ValidateIf(isInstitution)
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  facilityName?: string;

  @ValidateIf(isInstitution)
  @IsIn(FACILITY_KINDS)
  facilityKind?: FacilityKind;

  @ValidateIf((o: CreateWinterizationFormDto) => o.facilityKind === 'other')
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  facilityKindOther?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  streetAddress?: string;

  /** Donor-critical: decides SN201A (utilities) vs SN201B (solid fuel). */
  @ValidateIf(isInstitution)
  @IsIn(HEATING_SOURCES)
  heatingSource?: HeatingSource;

  @ValidateIf((o: CreateWinterizationFormDto) => o.heatingSource === 'other')
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  heatingSourceOther?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(1_000_000)
  heatedArea?: number;

  @ValidateIf(isInstitution)
  @IsIn(BACKUP_POWER_OPTIONS)
  backupPower?: BackupPowerOption;

  @IsOptional()
  @IsIn(BUILDING_CONDITIONS)
  buildingCondition?: BuildingCondition;

  // ── Крок 2б: municipality (all [I] — context, never blocking) ──

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10_000_000)
  populationTotal?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  settlementsCovered?: number;

  @IsOptional()
  @IsIn(FRONTLINE_STATUSES)
  frontlineStatus?: FrontlineStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  targetFacilities?: string;

  // ── Крок 3: needs ──

  /** Derived server-side from hhCriticalNeed for households. */
  @ValidateIf(isOrganization)
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsIn(NEED_CATEGORIES, { each: true })
  needCategories?: NeedCategory[];

  @ValidateIf((o: CreateWinterizationFormDto) => hasCategory(o, 'other'))
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  needCategoryOther?: string;

  /**
   * Proposal narrative. 50 chars is a deliberate floor (Recovery asks 100):
   * the substance here is carried by the structured specification, so a long
   * essay would only add friction.
   */
  @ValidateIf(isOrganization)
  @IsString()
  @MinLength(50)
  @MaxLength(1500)
  situationDescription?: string;

  /** Item-level specification. Per-category minimums enforced in the service. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(NEEDS_ROWS_MAX)
  @ValidateNested({ each: true })
  @Type(() => WinterizationNeedDto)
  needs?: WinterizationNeedDto[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  solidFuelBoilerCount?: number;

  @IsOptional()
  @IsBoolean()
  solidFuelStorageAvailable?: boolean;

  @ValidateIf((o: CreateWinterizationFormDto) =>
    hasCategory(o, 'heating_system_repair'),
  )
  @IsString()
  @MinLength(30)
  @MaxLength(1000)
  heatingRepairDescription?: string;

  @ValidateIf((o: CreateWinterizationFormDto) =>
    hasCategory(o, 'resilience_point_equipment'),
  )
  @IsIn(RESILIENCE_POINT_STATUSES)
  resiliencePointStatus?: ResiliencePointStatus;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10_000)
  resiliencePointCapacity?: number;

  @ValidateIf((o: CreateWinterizationFormDto) => hasCategory(o, 'liquid_fuel'))
  @IsInt()
  @Min(1)
  @Max(6)
  liquidFuelMonthsNeeded?: number;

  // ── Крок 4: beneficiaries (derived from the household composition for ФО) ──

  @ValidateIf(isOrganization)
  @IsInt()
  @Min(1)
  @Max(10_000_000)
  directBeneficiaries?: number;

  @ValidateIf(isOrganization)
  @IsInt()
  @Min(0)
  idpCount?: number;

  @ValidateIf(isOrganization)
  @IsInt()
  @Min(0)
  childrenCount?: number;

  @ValidateIf(isOrganization)
  @IsInt()
  @Min(0)
  pwdCount?: number;

  @ValidateIf(isOrganization)
  @IsInt()
  @Min(0)
  elderlyCount?: number;

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

  // ── Крок 5: budget & coordination ──

  /** SN201B: solid fuel should be delivered before October. */
  @IsIn(NEED_BY_OPTIONS)
  needBy: NeedByOption;

  @IsIn(WINTERIZATION_URGENCY_OPTIONS)
  urgency: WinterizationUrgency;

  /** [I] by design — analysts cost commodities from quantities (plan §2, крок 5). */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(10_000_000_000)
  estimatedCost?: number;

  /** Required as soon as a cost figure is given — donors judge its provenance. */
  @ValidateIf(
    (o: CreateWinterizationFormDto) =>
      o.estimatedCost !== undefined && o.estimatedCost !== null,
  )
  @IsIn(WINTERIZATION_COST_BASIS_OPTIONS)
  costBasis?: WinterizationCostBasis;

  /** Do No Harm / deduplication — mandatory for every applicant type. */
  @IsBoolean()
  otherDonors: boolean;

  @ValidateIf((o: CreateWinterizationFormDto) => o.otherDonors === true)
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  otherDonorsDetails?: string;

  @ValidateIf(isOrganization)
  @IsIn(WINTERIZATION_COFINANCING_OPTIONS)
  cofinancing?: WinterizationCofinancing;

  @ValidateIf((o: CreateWinterizationFormDto) => o.cofinancing !== 'no')
  @IsOptional()
  @IsString()
  @MaxLength(255)
  cofinancingDetails?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsIn(LOGISTICS_OPTIONS, { each: true })
  logistics?: LogisticsOption[];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsIn(WINTERIZATION_DOCS_OPTIONS, { each: true })
  docsAvailable?: WinterizationDocsOption[];

  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  cloudLink?: string;

  // ── §7: household block (validated, but rejected while the flag is off) ──

  @ValidateIf(isHousehold)
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  hhStreetAddress?: string;

  @ValidateIf(isHousehold)
  @IsString()
  @MaxLength(50)
  hhHouseNumber?: string;

  @ValidateIf(isHousehold)
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsIn(HOUSEHOLD_VULNERABILITIES, { each: true })
  hhVulnerabilities?: HouseholdVulnerability[];

  @ValidateIf(isHousehold)
  @IsInt()
  @Min(0)
  @Max(50)
  hhAdults?: number;

  @ValidateIf(isHousehold)
  @IsInt()
  @Min(0)
  @Max(50)
  hhChildren?: number;

  @ValidateIf(isHousehold)
  @IsInt()
  @Min(0)
  @Max(50)
  hhElderly?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50)
  hhPwd?: number;

  @ValidateIf(isHousehold)
  @IsIn(HOUSEHOLD_HEATING_TYPES)
  hhHeatingType?: HouseholdHeatingType;

  @ValidateIf((o: CreateWinterizationFormDto) => o.hhHeatingType === 'other')
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  hhHeatingTypeOther?: string;

  @ValidateIf(isHousehold)
  @IsIn(HOUSEHOLD_CRITICAL_NEEDS)
  hhCriticalNeed?: HouseholdCriticalNeed;

  // ── Крок 6: files (uploaded beforehand via presigned POST) ──

  /**
   * Optional at DTO level; the service requires ≥3 photos when a works-type
   * category (heating_system_repair / insulation) is selected. Expressing that
   * with ValidateIf is impossible — a false predicate would switch OFF the
   * array/nested validators too, not just the minimum size.
   */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(WINTERIZATION_PHOTOS_MAX)
  @ValidateNested({ each: true })
  @Type(() => WinterizationAttachmentDto)
  photos?: WinterizationAttachmentDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(WINTERIZATION_DOCUMENTS_MAX)
  @ValidateNested({ each: true })
  @Type(() => WinterizationAttachmentDto)
  documents?: WinterizationAttachmentDto[];

  // ── Крок 7: consent ──

  @IsBoolean()
  @Equals(true, { message: 'consentGiven must be true' })
  consentGiven: boolean;
}
