import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateTestimonialDto } from './create-testimonial.dto';

export class UpdateTestimonialDto extends PartialType(CreateTestimonialDto) {
  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;
}
