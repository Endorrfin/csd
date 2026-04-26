import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

import { BoreholeWorkType } from '../entities/wash-form-borehole.entity';

/** Matches WashFormBorehole entity — one borehole per array entry. */
export class CreateBoreholeDto {
  @IsEnum(BoreholeWorkType)
  workType: BoreholeWorkType;

  /** CHANGED: min raised from 1 to 7; max kept at 50. */
  @IsNumber()
  @Min(7)
  @Max(50)
  expectedFlowRate: number;

  // ── Fields relevant only when workType = 'new_near_existing' ──

  @IsOptional()
  @IsBoolean()
  hasAquiferInfo?: boolean;

  /** CHANGED: max raised from 280 to 800. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(800)
  existingDepth?: number;

  /** Range kept as 1–30. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  existingDebit?: number;

  @IsOptional()
  @IsBoolean()
  hasDesignInfo?: boolean;

  @IsOptional()
  @IsBoolean()
  hasPassport?: boolean;

  @IsOptional()
  @IsString()
  oldLocation?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
