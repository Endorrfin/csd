// backend/src/modules/procurement/dto/admin-query.dto.ts
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import {
  ProcurementCategory,
  ProcurementMethod,
  ProcurementStatus,
} from '../entities/procurement.entity';

export class AdminProcurementQueryDto {
  // Pagination
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

  // Filters
  @IsOptional()
  @IsEnum(ProcurementStatus)
  status?: ProcurementStatus;

  @IsOptional()
  @IsEnum(ProcurementCategory)
  category?: ProcurementCategory;

  @IsOptional()
  @IsEnum(ProcurementMethod)
  method?: ProcurementMethod;

  @IsOptional()
  @IsString()
  search?: string;
}
