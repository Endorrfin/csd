// backend/src/modules/testimonial/dto/admin-query.dto.ts
// extend reusable PaginationQueryDto (page/limit/sort); drop duplicated page/limit
import { IsBooleanString, IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { TestimonialStatus } from '../entities/testimonial.entity';

export class AdminTestimonialQueryDto extends PaginationQueryDto {
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
