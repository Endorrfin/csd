import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

import {
  WaterTowerType,
  WaterTowerHeight,
} from '../entities/wash-form-tower.entity';

/** Matches WashFormTower entity. */
export class CreateTowerDto {
  @IsEnum(WaterTowerType)
  towerType: WaterTowerType;

  /** '10' added — previously missing, caused submit error. */
  @IsEnum(WaterTowerHeight)
  towerHeight: WaterTowerHeight;

  @IsOptional()
  @IsInt()
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

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
