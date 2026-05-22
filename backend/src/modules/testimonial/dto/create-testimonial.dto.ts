import {
  IsString,
  IsOptional,
  IsInt,
  IsEnum,
  IsUrl,
  IsDateString,
  IsArray,
  ArrayMaxSize,
  ValidateNested,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  AssistanceType,
  TestimonialStatus,
} from '../entities/testimonial.entity';

// === one evidence photo (uploaded S3 url or external link) ===
export class TestimonialPhotoDto {
  @IsUrl({ require_protocol: true })
  url: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;
}

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

  // === evidence gallery — max 3 photos ===
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => TestimonialPhotoDto)
  photos?: TestimonialPhotoDto[];

  // === kinds of assistance received (multi-select) ===
  @IsOptional()
  @IsArray()
  @IsEnum(AssistanceType, { each: true })
  assistanceTypes?: AssistanceType[];

  // === free text shown when AssistanceType.OTHER is selected ===
  @IsOptional()
  @IsString()
  @MaxLength(255)
  assistanceTypeOther?: string;

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
