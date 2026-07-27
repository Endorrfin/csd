// ui/src/app/features/admin/about/about.interfaces.ts

export type AboutSectionKey =
  | 'INTRO'
  | 'MISSION'
  | 'VISION'
  | 'VALUES'
  | 'DIRECTIONS'
  | 'KEY_FACTS'
  | 'RESULTS'
  | 'TEAM_INTRO'
  | 'CONTACTS_INTRO'
  | 'DOCUMENTS_INTRO';

export const ALL_SECTION_KEYS: AboutSectionKey[] = [
  'INTRO',
  'MISSION',
  'VISION',
  'VALUES',
  'DIRECTIONS',
  'KEY_FACTS',
  'RESULTS',
  'TEAM_INTRO',
  'CONTACTS_INTRO',
  'DOCUMENTS_INTRO',
];

// CHANGED: PR-D1 — mirrors backend ABOUT_DOCUMENT_TYPES. RULES ("Правила") is a
// separate key from REGULATION ("Положення") on purpose: both read as
// "Regulation(s)" in EN and would otherwise collapse into one group.
export type AboutDocumentType =
  | 'POLICY'
  | 'PROCEDURE'
  | 'REGULATION'
  | 'RULES'
  | 'CODE'
  | 'MECHANISM'
  | 'MANUAL'
  | 'DIRECTIVE'
  | 'TEMPLATE'
  | 'REPORT';

export const ALL_DOCUMENT_TYPES: AboutDocumentType[] = [
  'POLICY',
  'PROCEDURE',
  'REGULATION',
  'RULES',
  'CODE',
  'MECHANISM',
  'MANUAL',
  'DIRECTIVE',
  'TEMPLATE',
  'REPORT',
];

// === ADDED: PR-D1 — access mode is a property of the document, not of the site ===
export type AboutDocumentAccessMode = 'public_download' | 'view_only' | 'on_request';

export const ALL_ACCESS_MODES: AboutDocumentAccessMode[] = [
  'public_download',
  'view_only',
  'on_request',
];

export type AboutDocumentLocale = 'ua' | 'en';

export const ALL_DOCUMENT_LOCALES: AboutDocumentLocale[] = ['ua', 'en'];

export interface KeyFactItem {
  labelUa: string;
  labelEn: string;
  value: string;
}

export interface AboutSectionMetadata {
  items?: KeyFactItem[];
}

export interface AboutSection {
  id: string;
  key: AboutSectionKey;
  titleUa: string;
  titleEn: string;
  contentUa: string | null;
  contentEn: string | null;
  metadata: AboutSectionMetadata | null;
  isPublished: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// === ADDED: PR-D1 — one language/version variant of a document ===
export interface AboutDocumentFile {
  id: string;
  documentId: string;
  locale: AboutDocumentLocale;
  version: string;
  effectiveDate: string | null;
  s3Key: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  pageCount: number | null;
  isCurrent: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Admin shape — returned by /about/admin/documents. */
export interface AboutDocument {
  id: string;
  code: string;
  titleUa: string;
  titleEn: string;
  descriptionUa: string | null;
  descriptionEn: string | null;
  documentType: AboutDocumentType;
  accessMode: AboutDocumentAccessMode;
  // PR-D1 — was `fileUrl`. Read-only leftover of the Google Drive era,
  // never rendered on the public site.
  legacyFileUrl: string | null;
  lastReviewDate: string | null;
  nextReviewDate: string | null;
  version: string | null;
  isPublished: boolean;
  sortOrder: number;
  files?: AboutDocumentFile[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Public shape — returned by GET /api/about. Deliberately carries NO file URL:
 * links are issued one document at a time by GET /api/about/documents/:code/file.
 */
export interface PublicAboutDocument {
  code: string;
  documentType: AboutDocumentType;
  accessMode: AboutDocumentAccessMode;
  titleUa: string;
  titleEn: string;
  descriptionUa: string | null;
  descriptionEn: string | null;
  version: string | null;
  lastReviewDate: string | null;
  nextReviewDate: string | null;
  sortOrder: number;
  locales: AboutDocumentLocale[];
}

export interface AboutDocumentFileLink {
  code: string;
  locale: AboutDocumentLocale;
  version: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  pageCount: number | null;
  downloadAllowed: boolean;
  url: string;
  expiresIn: number;
}

export interface CreateAboutSectionDto {
  key: AboutSectionKey;
  titleUa: string;
  titleEn: string;
  contentUa?: string;
  contentEn?: string;
  metadata?: AboutSectionMetadata;
  isPublished?: boolean;
  sortOrder?: number;
}

export type UpdateAboutSectionDto = Partial<Omit<CreateAboutSectionDto, 'key'>>;

export interface CreateAboutDocumentDto {
  code: string;
  titleUa: string;
  titleEn: string;
  descriptionUa?: string;
  descriptionEn?: string;
  documentType?: AboutDocumentType;
  accessMode?: AboutDocumentAccessMode;
  lastReviewDate?: string;
  nextReviewDate?: string;
  version?: string;
  isPublished?: boolean;
  sortOrder?: number;
}

// PR-D1 — `code` is immutable: it is the public URL segment and the S3 prefix.
export type UpdateAboutDocumentDto = Partial<Omit<CreateAboutDocumentDto, 'code'>>;

export interface CreateAboutDocumentFileDto {
  locale: AboutDocumentLocale;
  version: string;
  s3Key: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  pageCount?: number;
  effectiveDate?: string;
}
