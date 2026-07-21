// PR-1 full-form edit (PATCH /recovery/:id/full)
import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { CreateRecoveryFormDto } from './create-recovery-form.dto';
import { FormStatus } from '../entities/wash-form.entity';

/**
 * Every Create field becomes optional via PartialType. Replace semantics for
 * arrays: when damages / photos / documents is present, the service replaces
 * the whole collection; when omitted — the collection is left untouched
 * (same contract as UpdateWashFormFullDto).
 */
export class UpdateRecoveryFormFullDto extends PartialType(
  CreateRecoveryFormDto,
) {
  @IsOptional()
  @IsEnum(FormStatus)
  status?: FormStatus;

  @IsOptional()
  @IsString()
  managerNotes?: string;
}
