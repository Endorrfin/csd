import { IsEnum, IsOptional, IsString } from 'class-validator';
import { InquiryStatus } from '../entities/inquiry.entity';

export class UpdateInquiryStatusDto {
  @IsEnum(InquiryStatus)
  status: InquiryStatus;

  @IsOptional()
  @IsString()
  managerNotes?: string;
}
