import {
  IsString,
  IsOptional,
  IsInt,
  IsEnum,
  IsUrl,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { TestimonialStatus } from '../entities/testimonial.entity';

export class CreateTestimonialDto {
  @IsString()
  authorName: string;

  @IsOptional()
  @IsString()
  organization?: string;

  @IsString()
  text: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsUrl()
  photoUrl?: string;

  // ── Location fields ──
  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsString()
  regionEn?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsString()
  districtEn?: string;

  @IsOptional()
  @IsString()
  community?: string;

  @IsOptional()
  @IsString()
  communityEn?: string;

  @IsOptional()
  @IsString()
  communityCode?: string;

  @IsOptional()
  @IsString()
  settlement?: string;

  @IsOptional()
  @IsString()
  settlementEn?: string;

  @IsOptional()
  @IsString()
  settlementCode?: string;

  // Historical publication date (data migration support)
  @IsOptional()
  @IsDateString()
  publishedAt?: string;

  // Manager-only fields (ignored on user create, set via PATCH)
  @IsOptional()
  @IsEnum(TestimonialStatus)
  status?: TestimonialStatus;

  @IsOptional()
  @IsString()
  managerNotes?: string;
}
