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
  @IsIn(['new_drilling', 'repair_cleaning', 'new_near_existing'])
  workType: 'new_drilling' | 'repair_cleaning' | 'new_near_existing';

  @IsBoolean()
  @IsOptional()
  hasAquiferInfo?: boolean;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(280)
  existingDepth?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(30)
  existingDebit?: number;

  @IsBoolean()
  @IsOptional()
  hasDesignInfo?: boolean;

  @IsBoolean()
  @IsOptional()
  hasPassport?: boolean;

  @IsString()
  @IsOptional()
  oldLocation?: string;

  @IsNumber()
  @Min(1)
  @Max(50)
  expectedFlowRate: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class WaterTowerDto {
  @IsIn(['vbr_15', 'vbr_25', 'vbr_50', 'vbr_over_50'])
  towerType: 'vbr_15' | 'vbr_25' | 'vbr_50' | 'vbr_over_50';

  @IsIn(['8', '12', '15', '18', '20', '25', 'over_25'])
  towerHeight: '8' | '12' | '15' | '18' | '20' | '25' | 'over_25';

  @IsNumber()
  @IsOptional()
  @Min(26)
  customHeight?: number;

  @IsBoolean()
  hasFoundation: boolean;

  @IsBoolean()
  isFoundationSuitable: boolean;

  @IsBoolean()
  needsFoundationReconstruction: boolean;

  @IsBoolean()
  canSelfReconstruct: boolean;

  @IsBoolean()
  canProvideCrane: boolean;

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

  @IsBoolean()
  canMaintainSystem: boolean;

  @IsBoolean()
  willingToProvideWater: boolean;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateWashFormDto {
  // ── Загальна інформація ──

  @IsString()
  @MinLength(2)
  region: string;

  // ── LOCATION FIELDS ──
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
