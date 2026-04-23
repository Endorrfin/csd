// backend/src/modules/vacancy/dto/admin-query.dto.ts
import {
  IsBooleanString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EmploymentType, VacancyStatus } from '../entities/vacancy.entity';

export class AdminVacancyQueryDto {
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
  @IsEnum(VacancyStatus)
  status?: VacancyStatus;

  @IsOptional()
  @IsEnum(EmploymentType)
  employmentType?: EmploymentType;

  @IsOptional()
  @IsString()
  search?: string;

  // When 'true', returns only vacancies where applicationDeadline is in the future
  @IsOptional()
  @IsBooleanString()
  hasActiveDeadline?: string;
}
