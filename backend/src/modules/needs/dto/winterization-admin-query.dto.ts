// PR-W1 admin list query (filters + pagination + sort whitelist)
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { FormStatus } from '../entities/wash-form.entity';
import {
  FACILITY_KINDS,
  NEED_CATEGORIES,
  WINTERIZATION_APPLICANT_TYPES,
  WINTERIZATION_URGENCY_OPTIONS,
} from '../winterization.constants';
// type-only imports — required by isolatedModules + emitDecoratorMetadata (TS1272)
import type {
  FacilityKind,
  NeedCategory,
  WinterizationApplicantType,
  WinterizationUrgency,
} from '../winterization.constants';

/** Whitelist keeps ORDER BY injection-safe. */
export const WINTERIZATION_SORTABLE_COLUMNS = [
  'createdAt',
  'updatedAt',
  'estimatedCost',
  'directBeneficiaries',
  'region',
  'status',
  'urgency',
  'needBy',
  'trackingNumber',
] as const;

export class WinterizationAdminQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @IsOptional()
  @IsEnum(FormStatus)
  status?: FormStatus;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  region?: string;

  @IsOptional()
  @IsIn(WINTERIZATION_APPLICANT_TYPES)
  applicantType?: WinterizationApplicantType;

  @IsOptional()
  @IsIn(FACILITY_KINDS)
  facilityKind?: FacilityKind;

  /** Matches when the value is present in the needCategories array column. */
  @IsOptional()
  @IsIn(NEED_CATEGORIES)
  needCategory?: NeedCategory;

  @IsOptional()
  @IsIn(WINTERIZATION_URGENCY_OPTIONS)
  urgency?: WinterizationUrgency;

  /** Searches trackingNumber / organizationName / facilityName — never PII contacts. */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dateFrom?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dateTo?: string;

  @IsOptional()
  @IsIn(WINTERIZATION_SORTABLE_COLUMNS)
  sortBy?: (typeof WINTERIZATION_SORTABLE_COLUMNS)[number];

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';
}
