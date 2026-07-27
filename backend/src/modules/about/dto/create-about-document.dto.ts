import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
// CHANGED: PR-D1 — enum imports replaced by the shared `as const` catalogs.
import {
  ABOUT_DOCUMENT_ACCESS_MODES,
  ABOUT_DOCUMENT_CODE_PATTERN,
  ABOUT_DOCUMENT_TYPES,
  ABOUT_DOCUMENT_VERSION_PATTERN,
} from '../about-documents.constants';
import type {
  AboutDocumentAccessMode,
  AboutDocumentType,
} from '../about-documents.constants';

export class CreateAboutDocumentDto {
  // === ADDED: PR-D1 — register code is the public identifier, so it is required ===
  @IsString()
  @Matches(ABOUT_DOCUMENT_CODE_PATTERN, {
    message: 'code must look like CSD-POL-01',
  })
  @MaxLength(32)
  code: string;

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
  @IsIn(ABOUT_DOCUMENT_TYPES)
  documentType?: AboutDocumentType;

  // === ADDED: PR-D1 — defaults to view_only in the entity; must be an explicit
  // decision to loosen it to public_download. ===
  @IsOptional()
  @IsIn(ABOUT_DOCUMENT_ACCESS_MODES)
  accessMode?: AboutDocumentAccessMode;

  // CHANGED: PR-D1 — `fileUrl` is gone. Files are attached through
  // POST /api/about/admin/documents/:id/files after a presigned upload.

  @IsOptional()
  @IsDateString()
  lastReviewDate?: string;

  @IsOptional()
  @IsDateString()
  nextReviewDate?: string;

  @IsOptional()
  @Matches(ABOUT_DOCUMENT_VERSION_PATTERN, {
    message: 'version must look like v1',
  })
  @MaxLength(20)
  version?: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
