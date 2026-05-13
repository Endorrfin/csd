import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';
import { AboutDocumentType } from '../entities/about-document.entity';

export class CreateAboutDocumentDto {
  @IsString()
  @MaxLength(255)
  titleUa: string;

  @IsString()
  @MaxLength(255)
  titleEn: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  descriptionUa?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  descriptionEn?: string;

  @IsOptional()
  @IsEnum(AboutDocumentType)
  documentType?: AboutDocumentType;

  // CHANGED: optional — record can be created before PDF is uploaded
  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(2000)
  fileUrl?: string;

  @IsOptional()
  @IsDateString()
  lastReviewDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  version?: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
