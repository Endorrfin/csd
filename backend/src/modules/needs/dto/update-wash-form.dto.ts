import { IsString, IsOptional, IsEnum } from 'class-validator';
import { FormStatus } from '../entities/wash-form.entity';

// Менеджер обновляет только статус и заметки
export class UpdateWashFormDto {
  @IsEnum(FormStatus)
  @IsOptional()
  status?: FormStatus;

  @IsString()
  @IsOptional()
  managerNotes?: string;

  @IsString()
  @IsOptional()
  priority?: string;
}
