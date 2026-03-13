import { IsString, IsOptional, IsEnum } from 'class-validator';
import { FormStatus } from '../entities/wash-form.entity';

/** Used by manager/admin to update status and notes */
export class UpdateWashFormDto {
  @IsEnum(FormStatus)
  @IsOptional()
  status?: FormStatus;

  @IsString()
  @IsOptional()
  managerNotes?: string;
}
