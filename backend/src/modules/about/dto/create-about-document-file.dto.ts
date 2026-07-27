// === ADDED: PR-D1 — attach an already-uploaded PDF to a document.
// The client uploads straight to the private bucket via a presigned POST and then
// echoes the key back here; every field is re-validated server-side because the
// browser is not a trusted source for an S3 key. ===
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  ABOUT_DOCUMENT_LOCALES,
  ABOUT_DOCUMENT_MAX_BYTES,
  ABOUT_DOCUMENT_MIME_TYPES,
  ABOUT_DOCUMENT_S3_KEY_PATTERN,
  ABOUT_DOCUMENT_VERSION_PATTERN,
} from '../about-documents.constants';
import type { AboutDocumentLocale } from '../about-documents.constants';

export class CreateAboutDocumentFileDto {
  @IsIn(ABOUT_DOCUMENT_LOCALES)
  locale: AboutDocumentLocale;

  @Matches(ABOUT_DOCUMENT_VERSION_PATTERN, {
    message: 'version must look like v1',
  })
  @MaxLength(20)
  version: string;

  @Matches(ABOUT_DOCUMENT_S3_KEY_PATTERN, {
    message: 's3Key must point inside media/about/docs/<code>/<locale>/v<n>/',
  })
  @MaxLength(512)
  s3Key: string;

  @IsString()
  @MaxLength(255)
  originalName: string;

  @IsIn(ABOUT_DOCUMENT_MIME_TYPES)
  mimeType: string;

  @IsInt()
  @Min(1)
  @Max(ABOUT_DOCUMENT_MAX_BYTES)
  sizeBytes: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  pageCount?: number;

  @IsOptional()
  @IsDateString()
  effectiveDate?: string;
}
