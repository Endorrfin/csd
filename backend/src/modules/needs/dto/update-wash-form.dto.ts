import { IsEnum, IsOptional, IsString } from 'class-validator';
import { FormStatus } from '../entities/wash-form.entity';

/**
 * Manager/Admin — quick update of status and manager notes.
 * Used by inline status change in admin list; for full edits see
 * UpdateWashFormFullDto.
 */
export class UpdateWashFormDto {
  @IsOptional()
  @IsEnum(FormStatus)
  status?: FormStatus;

  @IsOptional()
  @IsString()
  managerNotes?: string;
}
