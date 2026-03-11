import {
  IsString,
  IsBoolean,
  IsOptional,
  IsEnum,
  IsEmail,
  IsDateString,
  MinLength,
} from 'class-validator';
import { CooperationType, CooperationStatus } from '../entities/cooperation.entity';

export class CreateCooperationDto {
  @IsEnum(CooperationType)
  type: CooperationType;

  @IsEnum(CooperationStatus)
  @IsOptional()
  status?: CooperationStatus;

  @IsString()
  @MinLength(1)
  titleUa: string;

  @IsString()
  @MinLength(1)
  titleEn: string;

  @IsString()
  descriptionUa: string;

  @IsString()
  descriptionEn: string;

  @IsString()
  @IsOptional()
  requirementsUa?: string;

  @IsString()
  @IsOptional()
  requirementsEn?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsDateString()
  @IsOptional()
  deadline?: string;

  @IsEmail()
  @IsOptional()
  contactEmail?: string;

  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;
}
