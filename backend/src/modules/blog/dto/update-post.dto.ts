import {
  IsString,
  IsBoolean,
  IsOptional,
  IsArray,
  ArrayMaxSize,
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

  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(5)
  @IsOptional()
  images?: string[];

  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;
}
