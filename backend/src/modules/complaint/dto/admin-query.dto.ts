// backend/src/modules/complaint/dto/admin-query.dto.ts
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import {
  ComplaintCategory,
  ComplaintStatus,
} from '../entities/complaint.entity';

export class AdminComplaintQueryDto {
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
  @IsEnum(ComplaintStatus)
  status?: ComplaintStatus;

  @IsOptional()
  @IsEnum(ComplaintCategory)
  category?: ComplaintCategory;

  // Searches description + expectedResolution only — never PII (phone/email)
  @IsOptional()
  @IsString()
  search?: string;
}
