import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { CreateBoreholeDto } from './wash-form-borehole.dto';
import { CreateTowerDto } from './wash-form-tower.dto';
import { CreatePurificationDto } from './wash-form-purification.dto';
import { CreatePumpDto } from './wash-form-pump.dto';
import { CreateWashFormItemDto } from './wash-form-item.dto';

/**
 * Payload for public WASH needs submission.
 *
 * CHANGED in Task 2:
 *  - Single jsonb sections replaced by arrays: boreholes[], towers[],
 *    purifications[], pumps[].
 *  - headPhone now enforced as +380XXXXXXXXX (matches complaint form).
 *  - Validation ranges aligned with business rules.
 *
 * Note: this DTO does NOT enforce "at least one section filled".
 * That check lives in the service (Task 3) because it depends on the
 * presence of items[] too, which is handled separately.
 */
export class CreateWashFormDto {
  // ── Location ──

  @IsString()
  @MinLength(2)
  region: string;

  @IsString()
  regionEn: string;

  @IsString()
  district: string;

  @IsString()
  districtEn: string;

  @IsString()
  community: string;

  @IsString()
  communityEn: string;

  @IsString()
  communityCode: string;

  @IsOptional()
  @IsString()
  settlement?: string;

  @IsOptional()
  @IsString()
  settlementEn?: string;

  @IsOptional()
  @IsString()
  settlementCode?: string;

  // ── Organization & contact ──

  @IsString()
  @MinLength(2)
  organizationName: string;

  @IsString()
  @MinLength(2)
  headName: string;

  /** CHANGED: strict +380XXXXXXXXX, aligned with complaint form. */
  @IsString()
  @Matches(/^\+380\d{9}$/, {
    message: 'headPhone must be in format +380XXXXXXXXX',
  })
  headPhone: string;

  @IsEmail()
  email: string;

  // ── Object info ──

  @IsString()
  @MinLength(2)
  objectName: string;

  @IsInt()
  @Min(1)
  dependentPopulation: number;

  @IsOptional()
  @IsString()
  socialFacilities?: string;

  @IsOptional()
  @IsString()
  installationDeadline?: string;

  @IsString()
  @MinLength(10)
  replacementReason: string;

  // ── WASH activities (all arrays are optional; service enforces "≥1 section") ──

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBoreholeDto)
  boreholes?: CreateBoreholeDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTowerDto)
  towers?: CreateTowerDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePurificationDto)
  purifications?: CreatePurificationDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePumpDto)
  pumps?: CreatePumpDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateWashFormItemDto)
  items?: CreateWashFormItemDto[];
}
