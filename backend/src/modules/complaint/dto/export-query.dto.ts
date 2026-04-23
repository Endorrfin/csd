// backend/src/modules/complaint/dto/export-query.dto.ts
import { IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import {
  ComplaintCategory,
  ComplaintStatus,
} from '../entities/complaint.entity';

export class ExportComplaintsQueryDto {
  @IsOptional()
  @IsIn(['ua', 'en'])
  lang: 'ua' | 'en' = 'ua';

  @IsOptional()
  @IsEnum(ComplaintStatus)
  status?: ComplaintStatus;

  @IsOptional()
  @IsEnum(ComplaintCategory)
  category?: ComplaintCategory;

  @IsOptional()
  @IsString()
  search?: string;
}
