// nested DTO — one damaged element row
import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { DAMAGE_ELEMENTS } from '../recovery.constants';
// type-only import — required by isolatedModules + emitDecoratorMetadata (TS1272)
import type { DamageElement } from '../recovery.constants';

export class RecoveryDamageDto {
  @IsIn(DAMAGE_ELEMENTS)
  element: DamageElement;

  /** Scope of works (m²/pcs). Optional — checkbox without measurement is valid. */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(1_000_000)
  volume?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
