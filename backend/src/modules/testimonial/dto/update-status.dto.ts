import { IsEnum, IsOptional, IsString } from 'class-validator';
import { TestimonialStatus } from '../entities/testimonial.entity';

export class UpdateTestimonialStatusDto {
  @IsEnum(TestimonialStatus)
  status: TestimonialStatus;

  // Optional notes set when rejecting (e.g. reason)
  @IsOptional()
  @IsString()
  managerNotes?: string;
}
