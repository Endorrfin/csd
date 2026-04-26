import { IsInt, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

/** Matches WashFormItem entity. */
export class CreateWashFormItemDto {
  @IsUUID()
  equipmentItemId: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  quantity: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
