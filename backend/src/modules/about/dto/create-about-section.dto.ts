import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AboutSectionKey } from '../entities/about-section.entity';

export class KeyFactItemDto {
  @IsString()
  @MaxLength(200)
  labelUa: string;

  @IsString()
  @MaxLength(200)
  labelEn: string;

  @IsString()
  @MaxLength(200)
  value: string;
}

export class AboutSectionMetadataDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KeyFactItemDto)
  items?: KeyFactItemDto[];
}

export class CreateAboutSectionDto {
  @IsEnum(AboutSectionKey)
  key: AboutSectionKey;

  @IsString()
  @MaxLength(255)
  titleUa: string;

  @IsString()
  @MaxLength(255)
  titleEn: string;

  @IsOptional()
  @IsString()
  contentUa?: string;

  @IsOptional()
  @IsString()
  contentEn?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => AboutSectionMetadataDto)
  metadata?: AboutSectionMetadataDto;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
