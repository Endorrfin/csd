// NEW FILE
import { ArrayMaxSize, ArrayMinSize, IsArray, IsEnum, IsUUID } from 'class-validator';
import { FormStatus } from '../entities/wash-form.entity';

export class BulkUpdateStatusDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)            // safety cap — adjust if you expect more
  @IsUUID('4', { each: true })
  ids!: string[];

  @IsEnum(FormStatus)
  status!: FormStatus;
}
