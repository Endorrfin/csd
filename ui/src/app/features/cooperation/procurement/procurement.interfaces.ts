// ui/src/app/features/cooperation/procurement/procurement.interfaces.ts
export enum ProcurementDonor {
  UNICEF = 'UNICEF',
  UHF = 'UHF',
  GIZ = 'GIZ',
  LDS = 'LDS',
  OTHER = 'OTHER',
}

export enum ProcurementMethod {
  OPEN_TENDER = 'open_tender',
  RFQ = 'rfq',
  RFP = 'rfp',
}

export enum ProcurementCategory {
  GOODS = 'goods',
  WORKS = 'works',
  SERVICES = 'services',
}

export enum LotStructure {
  SINGLE = 'single',
  MULTIPLE = 'multiple',
}

export enum SubmissionMethod {
  EMAIL = 'email',
  COURIER = 'courier',
  EPLATFORM = 'eplatform',
}

// synced with backend entity (8 active + 1 legacy)
export enum ProcurementStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  EXTENDED = 'extended',
  EVALUATION = 'evaluation',
  AWARDED = 'awarded',
  SUSPENDED = 'suspended',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
  /** @deprecated kept for PostgreSQL enum compatibility; remapped to COMPLETED */
  CLOSED = 'closed',
}

export interface EvaluationCriteriaItem {
  criteriaUa: string;
  criteriaEn: string;
  weight: number;
}

export interface AttachmentItem {
  name: string;
  url: string;
  fileType?: string;
}

export interface ProcurementListItem {
  id: string;
  tenderTitleUa: string;
  tenderTitleEn: string;
  referenceNumber: string | null;
  donor: ProcurementDonor | null;
  procurementMethod: ProcurementMethod | null;
  procurementCategory: ProcurementCategory | null;
  bidSubmissionDeadline: string | null;
  publicationDate: string | null;
  status: ProcurementStatus;
  createdAt: string;
}

// paginated response shape — matches GET /procurement/admin/list
export interface PaginatedProcurements {
  data: ProcurementListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface Procurement extends ProcurementListItem {
  projectName: string | null;
  projectCode: string | null;
  implementingOrganization: string | null;
  lotStructure: LotStructure;
  shortDescriptionUa: string | null;
  shortDescriptionEn: string | null;
  detailedDescriptionUa: string | null;
  detailedDescriptionEn: string | null;
  region: string | null;
  communities: string[] | null;
  implementationPeriodDays: number | null;
  technicalDocuments: AttachmentItem[] | null;
  clarificationDeadline: string | null;
  expectedStartDate: string | null;
  submissionMethods: SubmissionMethod[] | null;
  submissionEmail: string | null;
  submissionLanguages: string[] | null;
  fileRequirements: string | null;
  evaluationMethod: string | null;
  evaluationCriteria: EvaluationCriteriaItem[] | null;
  eligibilityRequirements: string[] | null;
  complianceChecks: { labelUa: string; labelEn: string }[] | null;
  attachments: AttachmentItem[] | null;
  updatedAt: string;
}
