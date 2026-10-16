import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { CreateTestimonialDto } from './create-testimonial.dto';
import { TestimonialStatus } from '../entities/testimonial.entity';

export class UpdateTestimonialDto extends PartialType(CreateTestimonialDto) {
  // CHANGED: staff-only fields now declared here instead of inherited from the public create dto
  @IsOptional()
  @IsEnum(TestimonialStatus)
  status?: TestimonialStatus;

  @IsOptional()
  @IsString()
  managerNotes?: string;

  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;
}
