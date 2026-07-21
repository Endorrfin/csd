// admin list query (filters + pagination + sort whitelist)
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
  APPLICANT_CATEGORIES,
  OBJECT_TYPES,
  URGENCY_OPTIONS,
} from '../recovery.constants';
// type-only imports — required by isolatedModules + emitDecoratorMetadata (TS1272)
import type {
  ApplicantCategory,
  ObjectType,
  UrgencyOption,
} from '../recovery.constants';

/** Whitelist keeps ORDER BY injection-safe. */
export const RECOVERY_SORTABLE_COLUMNS = [
  'createdAt',
  'updatedAt',
  'estimatedCost',
  'directBeneficiaries',
  'region',
  'status',
  'urgency',
  'trackingNumber',
] as const;

export class RecoveryAdminQueryDto {
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
  @IsIn(OBJECT_TYPES)
  objectType?: ObjectType;

  @IsOptional()
  @IsIn(APPLICANT_CATEGORIES)
  applicantCategory?: ApplicantCategory;

  @IsOptional()
  @IsIn(URGENCY_OPTIONS)
  urgency?: UrgencyOption;

  /** Searches trackingNumber / objectName / organizationName — never PII contacts. */
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
  @IsIn(RECOVERY_SORTABLE_COLUMNS)
  sortBy?: (typeof RECOVERY_SORTABLE_COLUMNS)[number];

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';
}
