// ui/src/app/features/admin/inquiries/inquiry.interfaces.ts
export enum InquiryReason {
  PARTNERSHIP = 'partnership',
  VOLUNTEERING = 'volunteering',
  PRESS = 'press',
  GENERAL = 'general',
  OTHER = 'other',
}

export enum InquiryStatus {
  NEW = 'new',
  READ = 'read',
  REPLIED = 'replied',
  ARCHIVED = 'archived',
}

export enum MessengerType {
  TELEGRAM = 'telegram',
  VIBER = 'viber',
  WHATSAPP = 'whatsapp',
  OTHER = 'other',
}

export interface InquiryItem {
  id: string;
  reason: InquiryReason;
  reasonOther: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  messengerType: MessengerType | null;
  messengerHandle: string | null;
  preferredLang: 'ua' | 'en';
  message: string;
  consent: boolean;
  status: InquiryStatus;
  managerNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedInquiries {
  data: InquiryItem[];
  total: number;
  page: number;
  limit: number;
}
