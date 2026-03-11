import {
  IsString,
  IsBoolean,
  IsOptional,
  IsEnum,
  IsEmail,
  IsDateString,
} from 'class-validator';
import { CooperationType, CooperationStatus } from '../entities/cooperation.entity';

export class UpdateCooperationDto {
  @IsEnum(CooperationType)
  @IsOptional()
  type?: CooperationType;

  @IsEnum(CooperationStatus)
  @IsOptional()
  status?: CooperationStatus;

  @IsString()
  @IsOptional()
  titleUa?: string;

  @IsString()
  @IsOptional()
  titleEn?: string;

  @IsString()
  @IsOptional()
  descriptionUa?: string;

  @IsString()
  @IsOptional()
  descriptionEn?: string;

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
