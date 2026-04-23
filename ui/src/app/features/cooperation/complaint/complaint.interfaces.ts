// ui/src/app/features/cooperation/complaint/complaint.interfaces.ts
export enum ComplaintCategory {
  SERVICE_QUALITY = 'service_quality',
  STAFF_BEHAVIOR = 'staff_behavior',
  CORRUPTION = 'corruption',
  DELAY = 'delay',
  OTHER = 'other',
}

export enum ComplaintStatus {
  NEW = 'new',
  IN_REVIEW = 'in_review',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export interface ComplaintAttachment {
  name: string;
  url: string;
}

export interface ComplaintItem {
  id: string;
  category: ComplaintCategory;
  description: string;
  phone: string | null;
  email: string | null;
  region: string | null;
  regionEn: string | null;
  district: string | null;
  districtEn: string | null;
  community: string | null;
  communityEn: string | null;
  settlement: string | null;
  settlementEn: string | null;
  attachments: ComplaintAttachment[] | null;
  expectedResolution: string | null;
  status: ComplaintStatus;
  submittedAt: string | null;
  managerNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedComplaints {
  data: ComplaintItem[];
  total: number;
  page: number;
  limit: number;
}
