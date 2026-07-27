// === ADDED: PR-D1 — query for the public per-document file endpoint ===
import { IsIn } from 'class-validator';
import { ABOUT_DOCUMENT_LOCALES } from '../about-documents.constants';
import type { AboutDocumentLocale } from '../about-documents.constants';

export class AboutDocumentFileQueryDto {
  @IsIn(ABOUT_DOCUMENT_LOCALES)
  locale: AboutDocumentLocale;
}
