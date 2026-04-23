// backend/src/modules/testimonial/dto/verify.dto.ts
import { IsBoolean } from 'class-validator';

export class VerifyTestimonialDto {
  @IsBoolean()
  isVerified: boolean;
}
