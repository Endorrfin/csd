import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

/** Matches WashFormPurification entity. */
export class CreatePurificationDto {
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

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
