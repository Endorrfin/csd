import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { CreateWashFormDto } from './create-wash-form.dto';
import { FormStatus } from '../entities/wash-form.entity';

/**
 * Manager/Admin — full-form edit (PATCH /wash/:id/full).
 *
 * Every Create field becomes optional via PartialType so the frontend can
 * send only what changed. Adds status and managerNotes which are not in
 * CreateWashFormDto (applicants do not set those).
 *
 * Child arrays (boreholes/towers/purifications/pumps/items) semantics:
 * when the array is present, the service replaces the entire collection.
 * When omitted, the collection is left untouched. See Task 3.
 */
export class UpdateWashFormFullDto extends PartialType(CreateWashFormDto) {
  @IsOptional()
  @IsEnum(FormStatus)
  status?: FormStatus;

  @IsOptional()
  @IsString()
  managerNotes?: string;
}
