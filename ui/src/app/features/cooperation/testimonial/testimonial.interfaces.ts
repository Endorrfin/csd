// ui/src/app/features/cooperation/testimonial/testimonial.interfaces.ts
export enum TestimonialStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

// === keep values in sync with backend AssistanceType enum ===
export enum AssistanceType {
  BOREHOLE_DRILLING = 'borehole_drilling',
  WATER_TOWERS = 'water_towers',
  PIPES_VALVES_FITTINGS = 'pipes_valves_fittings',
  PURIFICATION_SYSTEM = 'purification_system',
  PUMPS_EQUIPMENT = 'pumps_equipment',
  WATER_TANKS = 'water_tanks',
  BOTTLED_WATER = 'bottled_water',
  HYGIENE_KITS = 'hygiene_kits',
  EQUIPMENT = 'equipment',
  WASH_REHABILITATION = 'wash_rehabilitation',
  OTHER = 'other',
}

// Ordered list for rendering checkboxes / badges
export const ASSISTANCE_TYPES: AssistanceType[] = [
  AssistanceType.BOREHOLE_DRILLING,
  AssistanceType.WATER_TOWERS,
  AssistanceType.PIPES_VALVES_FITTINGS,
  AssistanceType.PURIFICATION_SYSTEM,
  AssistanceType.PUMPS_EQUIPMENT,
  AssistanceType.WATER_TANKS,
  AssistanceType.BOTTLED_WATER,
  AssistanceType.HYGIENE_KITS,
  AssistanceType.EQUIPMENT,
  AssistanceType.WASH_REHABILITATION,
  AssistanceType.OTHER,
];

// === evidence photo (uploaded S3 file or external link) ===
export interface TestimonialPhoto {
  url: string;
  name?: string;
}

export interface TestimonialItem {
  id: string;
  authorName: string;
  organization: string | null;
  text: string;
  rating: number | null;
  photoUrl: string | null;
  photos: TestimonialPhoto[] | null;
  assistanceTypes: AssistanceType[] | null;
  assistanceTypeOther: string | null;
  region: string | null;
  regionEn: string | null;
  district: string | null;
  districtEn: string | null;
  community: string | null;
  communityEn: string | null;
  communityCode: string | null;
  settlement: string | null;
  settlementEn: string | null;
  settlementCode: string | null;
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
