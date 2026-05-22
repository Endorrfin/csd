import { IsIn, IsString } from 'class-validator';

// === validated body for the public testimonial evidence upload ===
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export class TestimonialUploadDto {
  @IsString()
  @IsIn(ALLOWED_MIME_TYPES)
  contentType: string;
}
