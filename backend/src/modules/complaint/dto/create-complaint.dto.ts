import {
  IsString,
  IsOptional,
  IsEnum,
  IsEmail,
  IsArray,
  IsDateString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ComplaintCategory } from '../entities/complaint.entity';

export class ComplaintAttachmentDto {
  @IsString()
  name: string;

  @IsString()
  url: string;
}

export class CreateComplaintDto {
  @IsEnum(ComplaintCategory)
  category: ComplaintCategory;

  @IsString()
  description: string;

  // Anonymous: email is optional
  @IsOptional()
  @IsEmail()
  email?: string;

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

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComplaintAttachmentDto)
  attachments?: ComplaintAttachmentDto[];

  @IsOptional()
  @IsString()
  expectedResolution?: string;

  // Historical submission date (data migration support)
  @IsOptional()
  @IsDateString()
  submittedAt?: string;
}
