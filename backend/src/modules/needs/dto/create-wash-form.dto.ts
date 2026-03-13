import { Type } from 'class-transformer';
import {
  IsString,
  IsEmail,
  IsInt,
  IsOptional,
  IsArray,
  IsUUID,
  IsNumber,
  Min,
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

  // ── Позиції заявки ──

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateWashFormItemDto)
  items: CreateWashFormItemDto[];
}
