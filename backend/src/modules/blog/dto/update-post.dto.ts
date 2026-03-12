import {
  IsString,
  IsBoolean,
  IsOptional,
  MinLength,
  Matches,
} from 'class-validator';

export class UpdatePostDto {
  @IsString()
  @MinLength(2)
  @Matches(/^[a-z0-9-]+$/)
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  titleUa?: string;

  @IsString()
  @IsOptional()
  titleEn?: string;

  @IsString()
  @IsOptional()
  contentUa?: string;

  @IsString()
  @IsOptional()
  contentEn?: string;

  @IsString()
  @IsOptional()
  excerptUa?: string;

  @IsString()
  @IsOptional()
  excerptEn?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  coverImage?: string;

  @IsString()
  @IsOptional()
  videoUrl?: string;

  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;
}
