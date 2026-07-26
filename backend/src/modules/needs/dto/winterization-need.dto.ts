// PR-W1 nested DTO — one requested need position
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
import {
  GENERATOR_FUEL_TYPES,
  GENERATOR_PURPOSES,
  NEED_CATEGORIES,
  NEED_ITEMS,
  NEED_UNITS,
} from '../winterization.constants';
// type-only imports — required by isolatedModules + emitDecoratorMetadata (TS1272)
import type {
  GeneratorFuelType,
  GeneratorPurpose,
  NeedCategory,
  NeedItem,
  NeedUnit,
} from '../winterization.constants';

/**
 * One line of the winterization specification.
 *
 * Cross-field rules the DTO cannot express are enforced in
 * WinterizationService.assertNeedsConsistency:
 *   • `category` must be one of the form's needCategories;
 *   • `item` must belong to that category (NEED_ITEMS_BY_CATEGORY);
 *   • categories in NEED_CATEGORY_RULES with requiresQuantity need a number;
 *   • only `generators` may repeat an item (one row per power rating).
 *
 * `unit` is normally derived server-side from NEED_ITEM_UNITS; a client value is
 * honoured only for solid fuel, where t vs m³ is a legitimate applicant choice.
 */
export class WinterizationNeedDto {
  @IsIn(NEED_CATEGORIES)
  category: NeedCategory;

  @IsIn(NEED_ITEMS)
  item: NeedItem;

  /** Optional for most categories — the checkbox is mandatory, the number is not. */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(1_000_000)
  quantity?: number;

  @IsOptional()
  @IsIn(NEED_UNITS)
  unit?: NeedUnit;

  /** Generators: kW rating — without it the line cannot be costed. */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.1)
  @Max(5000)
  powerKw?: number;

  @IsOptional()
  @IsIn(GENERATOR_FUEL_TYPES)
  fuelType?: GeneratorFuelType;

  @IsOptional()
  @IsIn(GENERATOR_PURPOSES)
  purpose?: GeneratorPurpose;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  details?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
