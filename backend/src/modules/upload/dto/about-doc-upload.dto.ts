// === ADDED: PR-D1 — body for the admin About-document presigned upload.
// Everything here ends up in the S3 key, so each field is pattern-validated: the key
// is later re-derived from the document's own code before the file is attached. ===
import { IsIn, Matches, MaxLength } from 'class-validator';
import {
  ABOUT_DOCUMENT_CODE_PATTERN,
  ABOUT_DOCUMENT_LOCALES,
  ABOUT_DOCUMENT_MIME_TYPES,
  ABOUT_DOCUMENT_VERSION_PATTERN,
} from '../../about/about-documents.constants';
import type { AboutDocumentLocale } from '../../about/about-documents.constants';

export class AboutDocUploadDto {
  @Matches(ABOUT_DOCUMENT_CODE_PATTERN, {
    message: 'code must look like CSD-POL-01',
  })
  @MaxLength(32)
  code: string;

  @IsIn(ABOUT_DOCUMENT_LOCALES)
  locale: AboutDocumentLocale;

  @Matches(ABOUT_DOCUMENT_VERSION_PATTERN, {
    message: 'version must look like v1',
  })
  @MaxLength(20)
  version: string;

  @IsIn(ABOUT_DOCUMENT_MIME_TYPES)
  contentType: string;
}
