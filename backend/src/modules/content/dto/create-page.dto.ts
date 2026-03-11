import {
  IsString,
  IsBoolean,
  IsOptional,
  IsInt,
  MinLength,
  Matches,
} from 'class-validator';

export class CreatePageDto {
  // Slug: only lowercase letters, numbers, and hyphens
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

  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;

  @IsInt()
  @IsOptional()
  sortOrder?: number;
}
