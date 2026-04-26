import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

import { PumpPurpose } from '../entities/wash-form-pump.entity';

/**
 * Matches WashFormPump entity.
 * Only `purpose` and `quantity` are required — every tech-spec field is
 * optional because pump models vary wildly and users fill what they know.
 */
export class CreatePumpDto {
  @IsEnum(PumpPurpose)
  purpose: PumpPurpose;

  /** Required when purpose = 'other'; ignored otherwise. */
  @ValidateIf((o: CreatePumpDto) => o.purpose === PumpPurpose.OTHER)
  @IsString()
  @MaxLength(255)
  purposeOther?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  brand?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  model?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  powerKw?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  flowRateM3h?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  headM?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  diameterInches?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  voltage?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  phases?: number;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
