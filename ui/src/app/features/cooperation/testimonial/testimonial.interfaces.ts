// ui/src/app/features/cooperation/testimonial/testimonial.interfaces.ts
export enum TestimonialStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export interface TestimonialItem {
  id: string;
  authorName: string;
  organization: string | null;
  text: string;
  rating: number | null;
  photoUrl: string | null;
  region: string | null;
  isVerified: boolean;
  status: TestimonialStatus;
  publishedAt: string | null;
  managerNotes: string | null;
  createdAt: string;
}

export interface PaginatedTestimonials {
  data: TestimonialItem[];
  total: number;
  page: number;
  limit: number;
}
