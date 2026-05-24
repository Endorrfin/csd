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

export type AboutDocumentType = 'POLICY' | 'PROCEDURE' | 'REGULATION' | 'CODE' | 'REPORT';

export const ALL_DOCUMENT_TYPES: AboutDocumentType[] = [
  'POLICY',
  'PROCEDURE',
  'REGULATION',
  'CODE',
  'REPORT',
];

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

export interface AboutDocument {
  id: string;
  titleUa: string;
  titleEn: string;
  descriptionUa: string | null;
  descriptionEn: string | null;
  documentType: AboutDocumentType;
  fileUrl: string | null;
  lastReviewDate: string | null;
  version: string | null;
  isPublished: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
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
  titleUa: string;
  titleEn: string;
  descriptionUa?: string;
  descriptionEn?: string;
  documentType?: AboutDocumentType;
  fileUrl?: string;
  lastReviewDate?: string;
  version?: string;
  isPublished?: boolean;
  sortOrder?: number;
}

export type UpdateAboutDocumentDto = Partial<CreateAboutDocumentDto>;
