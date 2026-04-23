// backend/src/modules/testimonial/dto/admin-query.dto.ts
import {
  IsBooleanString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TestimonialStatus } from '../entities/testimonial.entity';

export class AdminTestimonialQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @IsOptional()
  @IsEnum(TestimonialStatus)
  status?: TestimonialStatus;

  @IsOptional()
  @IsString()
  search?: string;

  // When 'true', returns only testimonials with isVerified = true
  @IsOptional()
  @IsBooleanString()
  verifiedOnly?: string;
}
