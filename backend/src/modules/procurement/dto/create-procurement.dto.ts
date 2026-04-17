import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsDateString,
  IsInt,
  IsEmail,
  ValidateNested,
  IsNumber,
  Min,
  Max,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ProcurementDonor,
  ProcurementMethod,
  ProcurementCategory,
  LotStructure,
  SubmissionMethod,
  ProcurementStatus,
} from '../entities/procurement.entity';

export class EvaluationCriteriaItemDto {
  @IsString()
  criteriaUa: string;

  @IsString()
  criteriaEn: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  weight: number;
}

export class AttachmentItemDto {
  @IsString()
  name: string;

  @IsString()
  url: string;

  @IsOptional()
  @IsString()
  fileType?: string;
}

export class CreateProcurementDto {
  // Step 1 — required for publish, optional for draft
  @IsString()
  tenderTitleUa: string;

  @IsString()
  tenderTitleEn: string;

  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @IsOptional()
  @IsEnum(ProcurementDonor)
  donor?: ProcurementDonor;

  @IsOptional()
  @IsString()
  projectName?: string;

  @IsOptional()
  @IsString()
  projectCode?: string;

  @IsOptional()
  @IsString()
  implementingOrganization?: string;

  // Step 2
  @IsOptional()
  @IsEnum(ProcurementMethod)
  procurementMethod?: ProcurementMethod;

  @IsOptional()
  @IsEnum(ProcurementCategory)
  procurementCategory?: ProcurementCategory;

  @IsOptional()
  @IsEnum(LotStructure)
  lotStructure?: LotStructure;

  // Step 3
  @IsOptional()
  @IsString()
  shortDescriptionUa?: string;

  @IsOptional()
  @IsString()
  shortDescriptionEn?: string;

  // HTML content from Quill
  @IsOptional()
  @IsString()
  detailedDescriptionUa?: string;

  @IsOptional()
  @IsString()
  detailedDescriptionEn?: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  communities?: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  implementationPeriodDays?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentItemDto)
  technicalDocuments?: AttachmentItemDto[];

  // Step 4 — ISO date strings; historical dates allowed
  @IsOptional()
  @IsDateString()
  publicationDate?: string;

  @IsOptional()
  @IsDateString()
  clarificationDeadline?: string;

  @IsOptional()
  @IsDateString()
  bidSubmissionDeadline?: string;

  @IsOptional()
  @IsDateString()
  expectedStartDate?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(SubmissionMethod, { each: true })
  submissionMethods?: SubmissionMethod[];

  @IsOptional()
  @IsEmail()
  submissionEmail?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(5)
  submissionLanguages?: string[];

  @IsOptional()
  @IsString()
  fileRequirements?: string;

  // Step 5
  @IsOptional()
  @IsString()
  evaluationMethod?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EvaluationCriteriaItemDto)
  evaluationCriteria?: EvaluationCriteriaItemDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  eligibilityRequirements?: string[];

  @IsOptional()
  @IsArray()
  complianceChecks?: Array<{ labelUa: string; labelEn: string }>;

  // Step 6
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentItemDto)
  attachments?: AttachmentItemDto[];

  // Draft / Published on create
  @IsOptional()
  @IsEnum(ProcurementStatus)
  status?: ProcurementStatus;
}
