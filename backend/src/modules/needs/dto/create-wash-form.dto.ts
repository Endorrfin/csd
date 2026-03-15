import { Type } from 'class-transformer';
import {
  IsString,
  IsEmail,
  IsInt,
  IsOptional,
  IsArray,
  IsUUID,
  IsNumber,
  IsBoolean,
  IsIn,
  Min,
  Max,
  MinLength,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';

export class CreateWashFormItemDto {
  @IsUUID()
  equipmentItemId: string;

  @IsNumber()
  @Min(0.01)
  quantity: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

// ── WASH Activities DTOs ──

export class BoreholeDrillingDto {
  @IsIn(['sand', 'artesian'])
  boreholeType: 'sand' | 'artesian';

  @IsNumber()
  @Min(1)
  @Max(50)
  expectedFlowRate: number;

  @IsNumber()
  @Min(125)
  @Max(160)
  desiredDiameter: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class WaterTowerDto {
  @IsIn(['vbr_15', 'vbr_25', 'vbr_50', 'vbr_over_50'])
  towerType: 'vbr_15' | 'vbr_25' | 'vbr_50' | 'vbr_over_50';

  @IsInt()
  @Min(1)
  quantity: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class PurificationSystemDto {
  @IsBoolean()
  hasRoom: boolean;

  @IsBoolean()
  hasTemperatureControl: boolean;

  @IsBoolean()
  hasWaterInletDrainage: boolean;

  @IsBoolean()
  hasPowerSupply: boolean;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateWashFormDto {
  // ── Загальна інформація ──

  @IsString()
  @MinLength(2)
  region: string;

  @IsString()
  @MinLength(2)
  organizationName: string;

  @IsString()
  @MinLength(2)
  headName: string;

  @IsString()
  @MinLength(6)
  headPhone: string;

  @IsEmail()
  email: string;

  // ── Інформація про об'єкт ──

  @IsString()
  @MinLength(2)
  objectName: string;

  @IsInt()
  @Min(1)
  dependentPopulation: number;

  @IsString()
  @IsOptional()
  socialFacilities?: string;

  @IsString()
  @IsOptional()
  installationDeadline?: string;

  @IsString()
  @MinLength(10)
  replacementReason: string;

  // ── WASH Activities (опціональні) ──

  @IsOptional()
  @ValidateNested()
  @Type(() => BoreholeDrillingDto)
  boreholeDrilling?: BoreholeDrillingDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => WaterTowerDto)
  waterTower?: WaterTowerDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => PurificationSystemDto)
  purificationSystem?: PurificationSystemDto;

  // ── Позиції заявки (опціонально) ──

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateWashFormItemDto)
  items?: CreateWashFormItemDto[];
}
