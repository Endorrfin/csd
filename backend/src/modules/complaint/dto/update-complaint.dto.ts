import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { CreateComplaintDto } from './create-complaint.dto';
import { ComplaintStatus } from '../entities/complaint.entity';

export class UpdateComplaintDto extends PartialType(CreateComplaintDto) {
  @IsOptional()
  @IsEnum(ComplaintStatus)
  status?: ComplaintStatus;

  @IsOptional()
  @IsString()
  managerNotes?: string;
}
