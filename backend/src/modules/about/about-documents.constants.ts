// === ADDED: PR-D1 — shared catalogs for the public About document registry.
// Values are stored as varchar in Postgres (NOT pg enums) so adding a type is a
// DTO-level change with no ALTER TYPE migration — same rationale as
// `needs/recovery.constants.ts`. The list mirrors the "Тип документа" column of
// docs/about-documents/Register of documents.xlsx (32 documents). ===

export const ABOUT_DOCUMENT_TYPES = [
  'POLICY', // Політика (16 in the register)
  'PROCEDURE', // Процедура (1)
  'REGULATION', // Положення (7)
  // Правила (1) — deliberately a separate key from REGULATION: both translate to
  // "Regulation(s)" in EN and would collapse into one group on the EN site.
  'RULES',
  'CODE', // Кодекс (2)
  'MECHANISM', // Механізм (2)
  'MANUAL', // Посібник (1)
  'DIRECTIVE', // Наказ (1)
  'TEMPLATE', // Шаблон (1)
  'REPORT', // Звіт — unused today, kept for future annual / financial reports
] as const;
export type AboutDocumentType = (typeof ABOUT_DOCUMENT_TYPES)[number];
export const DEFAULT_ABOUT_DOCUMENT_TYPE: AboutDocumentType = 'POLICY';

/**
 * Access mode is a property of the document, not of the platform.
 * - public_download — the file must be fetchable (PSEA, Code of Conduct and the
 *   complaints mechanism are routinely cited in grant applications);
 * - view_only — readable in the on-site viewer, no download button;
 * - on_request — viewer now, original released after an explicit request (PR-D5).
 */
export const ABOUT_DOCUMENT_ACCESS_MODES = [
  'public_download',
  'view_only',
  'on_request',
] as const;
export type AboutDocumentAccessMode =
  (typeof ABOUT_DOCUMENT_ACCESS_MODES)[number];
export const DEFAULT_ABOUT_DOCUMENT_ACCESS_MODE: AboutDocumentAccessMode =
  'view_only';

/**
 * Locales a document file can be published in. The register lists UA + EN for all
 * 32 documents; CSD-COD-01 also exists in RU, which is not published on the site.
 */
export const ABOUT_DOCUMENT_LOCALES = ['ua', 'en'] as const;
export type AboutDocumentLocale = (typeof ABOUT_DOCUMENT_LOCALES)[number];

/** Only PDF is published — DOCX stays internal (Drive remains the editing surface). */
export const ABOUT_DOCUMENT_MIME_TYPES = ['application/pdf'] as const;

/**
 * Upload cap enforced by the S3 POST policy. The largest register PDF today is
 * 884 KB and the fund expects <= 2 MB; 4 MB leaves headroom for documents with
 * annexes while still rejecting an accidental multi-hundred-MB upload.
 */
export const ABOUT_DOCUMENT_MAX_BYTES = 4 * 1024 * 1024;

export const ABOUT_DOCS_S3_PREFIX = 'media/about/docs/';

/** Register codes: CSD-POL-01, CSD-COD-01, CSD-MEC-02, CSD-FORM-01 … */
export const ABOUT_DOCUMENT_CODE_PATTERN = /^CSD-[A-Z]{3,4}-\d{2}$/;

/** Versions as written in the register: v1 … v4. */
export const ABOUT_DOCUMENT_VERSION_PATTERN = /^v\d{1,3}$/;

/**
 * Re-validated server-side before a client-supplied key is persisted: it must sit
 * under the about-docs prefix and must not contain traversal segments.
 */
export const ABOUT_DOCUMENT_S3_KEY_PATTERN =
  /^(?!.*\.\.)media\/about\/docs\/CSD-[A-Z]{3,4}-\d{2}\/(ua|en)\/v\d{1,3}\/[A-Za-z0-9._-]+\.pdf$/;

/** TTL of the presigned GET handed to the viewer. Deliberately short. */
export const ABOUT_DOCUMENT_URL_TTL_SECONDS = 300;
