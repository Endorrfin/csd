import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { EmploymentType, VacancyStatus } from '../entities/vacancy.entity';

export class CreateVacancyDto {
  // Required for publish, optional for draft
  @IsString()
  titleUa: string;

  @IsString()
  titleEn: string;

  @IsString()
  descriptionUa: string;

  @IsString()
  descriptionEn: string;

  @IsOptional()
  @IsString()
  requirementsUa?: string;

  @IsOptional()
  @IsString()
  requirementsEn?: string;

  @IsEnum(EmploymentType)
  employmentType: EmploymentType;

  // ── Location fields ──
  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsString()
  regionEn?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsString()
  districtEn?: string;

  @IsOptional()
  @IsString()
  community?: string;

  @IsOptional()
  @IsString()
  communityEn?: string;

  @IsOptional()
  @IsString()
  communityCode?: string;

  @IsOptional()
  @IsString()
  settlement?: string;

  @IsOptional()
  @IsString()
  settlementEn?: string;

  @IsOptional()
  @IsString()
  settlementCode?: string;

  // Historical date allowed
  @IsOptional()
  @IsDateString()
  applicationDeadline?: string;

  @IsOptional()
  @IsString()
  salary?: string;

  @IsOptional()
  @IsEnum(VacancyStatus)
  status?: VacancyStatus;

  // Historical publication date
  @IsOptional()
  @IsDateString()
  publishedAt?: string;
}
