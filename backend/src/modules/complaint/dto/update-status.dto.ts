import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ComplaintStatus } from '../entities/complaint.entity';

export class UpdateComplaintStatusDto {
  @IsEnum(ComplaintStatus)
  status: ComplaintStatus;

  @IsOptional()
  @IsString()
  managerNotes?: string;
}
