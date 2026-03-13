import {
  IsString,
  IsBoolean,
  IsOptional,
  IsArray,
  ArrayMaxSize,
  MinLength,
  Matches,
} from 'class-validator';

export class CreatePostDto {
  @IsString()
  @MinLength(2)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'slug must contain only lowercase letters, numbers and hyphens',
  })
  slug: string;

  @IsString()
  @MinLength(1)
  titleUa: string;

  @IsString()
  @MinLength(1)
  titleEn: string;

  @IsString()
  contentUa: string;

  @IsString()
  contentEn: string;

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
