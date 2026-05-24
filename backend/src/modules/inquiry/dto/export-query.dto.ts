// backend/src/modules/inquiry/dto/export-query.dto.ts
import { IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import { InquiryReason, InquiryStatus } from '../entities/inquiry.entity';

export class ExportInquiriesQueryDto {
  @IsOptional()
  @IsIn(['ua', 'en'])
  lang: 'ua' | 'en' = 'ua';

  @IsOptional()
  @IsEnum(InquiryStatus)
  status?: InquiryStatus;

  @IsOptional()
  @IsEnum(InquiryReason)
  reason?: InquiryReason;

  @IsOptional()
  @IsString()
  search?: string;
}
