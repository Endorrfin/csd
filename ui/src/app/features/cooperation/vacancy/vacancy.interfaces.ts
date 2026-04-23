// ui/src/app/features/cooperation/vacancy/vacancy.interfaces.ts
export enum EmploymentType {
  FULL_TIME = 'full_time',
  PART_TIME = 'part_time',
  VOLUNTEER = 'volunteer',
}

export enum VacancyStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  EXTENDED = 'extended',
  ON_HOLD = 'on_hold',
  SUSPENDED = 'suspended',
  CANCELLED = 'cancelled',
  HIRED = 'hired',
  /** @deprecated kept for PostgreSQL enum compatibility; remapped to HIRED */
  CLOSED = 'closed',
}

export interface VacancyListItem {
  id: string;
  titleUa: string;
  titleEn: string;
  employmentType: EmploymentType;
  region: string | null;
  applicationDeadline: string | null;
  salary: string | null;
  status: VacancyStatus;
  publishedAt: string | null;
  createdAt: string;
}

export interface PaginatedVacancies {
  data: VacancyListItem[];
  total: number;
  page: number;
  limit: number;
}
