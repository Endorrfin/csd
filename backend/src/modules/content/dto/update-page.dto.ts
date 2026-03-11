import {
  IsString,
  IsBoolean,
  IsOptional,
  IsInt,
  MinLength,
  Matches,
} from 'class-validator';

export class UpdatePageDto {
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

  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;

  @IsInt()
  @IsOptional()
  sortOrder?: number;
}
