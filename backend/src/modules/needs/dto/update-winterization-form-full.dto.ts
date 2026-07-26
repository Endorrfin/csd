// PR-W1 full-form edit (PATCH /winterization/:id/full)
import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { CreateWinterizationFormDto } from './create-winterization-form.dto';
import { FormStatus } from '../entities/wash-form.entity';

/**
 * Every Create field becomes optional via PartialType. Replace semantics for
 * arrays: when needs / photos / documents is present the service replaces the
 * whole collection; when omitted the collection is left untouched (same
 * contract as UpdateRecoveryFormFullDto).
 *
 * NOTE: because `applicantType` is optional here, the service re-checks the
 * household gate against the RESULTING type (payload value, else the stored
 * one) — an admin edit must not be able to smuggle in a household application
 * while the feature flag is off.
 */
export class UpdateWinterizationFormFullDto extends PartialType(
  CreateWinterizationFormDto,
) {
  @IsOptional()
  @IsEnum(FormStatus)
  status?: FormStatus;

  @IsOptional()
  @IsString()
  managerNotes?: string;
}
