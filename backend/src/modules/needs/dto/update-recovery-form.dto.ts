// quick status/notes update (admin list inline actions)
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { FormStatus } from '../entities/wash-form.entity';

export class UpdateRecoveryFormDto {
  @IsOptional()
  @IsEnum(FormStatus)
  status?: FormStatus;

  @IsOptional()
  @IsString()
  managerNotes?: string;
}
