import {
  IsString,
  IsBoolean,
  IsOptional,
  IsInt,
  IsEnum,
  IsUrl,
} from 'class-validator';
import { PartnerType } from '../entities/partner.entity';

export class UpdatePartnerDto {
  @IsString()
  @IsOptional()
  nameUa?: string;

  @IsString()
  @IsOptional()
  nameEn?: string;

  @IsString()
  @IsOptional()
  descriptionUa?: string;

  @IsString()
  @IsOptional()
  descriptionEn?: string;

  @IsEnum(PartnerType)
  @IsOptional()
  type?: PartnerType;

  @IsString()
  @IsOptional()
  logoUrl?: string;

  @IsUrl()
  @IsOptional()
  websiteUrl?: string;

  @IsInt()
  @IsOptional()
  sortOrder?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
