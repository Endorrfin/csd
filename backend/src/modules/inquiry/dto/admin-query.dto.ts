// backend/src/modules/inquiry/dto/admin-query.dto.ts
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { InquiryReason, InquiryStatus } from '../entities/inquiry.entity';

export class AdminInquiryQueryDto {
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
  @IsEnum(InquiryStatus)
  status?: InquiryStatus;

  @IsOptional()
  @IsEnum(InquiryReason)
  reason?: InquiryReason;

  // Searches message + reasonOther only — never PII (name/phone/email/messenger)
  @IsOptional()
  @IsString()
  search?: string;
}
