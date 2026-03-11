import {
  IsString,
  IsOptional,
  IsEnum,
  IsEmail,
  IsNumber,
  IsInt,
  Min,
  MinLength,
} from 'class-validator';
import { WashNeedType } from '../entities/wash-form.entity';

export class CreateWashFormDto {
  @IsString()
  @MinLength(2)
  applicantName: string;

  @IsString()
  @MinLength(6)
  applicantPhone: string;

  @IsEmail()
  @IsOptional()
  applicantEmail?: string;

  @IsString()
  @MinLength(2)
  organizationName: string;

  @IsString()
  @IsOptional()
  organizationRole?: string;

  @IsString()
  region: string;

  @IsString()
  district: string;

  @IsString()
  settlement: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsNumber()
  @IsOptional()
  latitude?: number;

  @IsNumber()
  @IsOptional()
  longitude?: number;

  @IsEnum(WashNeedType)
  needType: WashNeedType;

  @IsString()
  @MinLength(10)
  description: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  beneficiariesCount?: number;

  @IsString()
  @IsOptional()
  facilityType?: string;

  @IsString()
  @IsOptional()
  currentCondition?: string;

  @IsString()
  @IsOptional()
  priority?: string;
}
