// Recovery form — shared option catalogs (entity types + DTO IsIn + future XLSX labels)
// Stored as varchar/text[] in Postgres (NOT pg enums) so adding a value is a
// DTO-level change without an ALTER TYPE migration. See implementation-plan §3.

export const APPLICANT_CATEGORIES = [
  'municipality', // ОМС / орган місцевого самоврядування
  'education_institution',
  'healthcare_institution',
  'utility_company', // КП
  'ngo',
  'other',
] as const;
export type ApplicantCategory = (typeof APPLICANT_CATEGORIES)[number];

export const OBJECT_TYPES = [
  'education', // заклад освіти
  'healthcare', // заклад охорони здоров'я
  'shelter', // укриття / сховище (окрема споруда)
  'resilience_center', // пункт незламності
  'municipal_building', // адмінбудівля ОМС
  'social_facility', // інший соціальний об'єкт
  'other',
] as const;
export type ObjectType = (typeof OBJECT_TYPES)[number];

/** Cluster-level work direction (ТЗ Крок 2). */
export const WORK_CATEGORIES = [
  'building_repair', // ремонт/відновлення будівлі
  'shelter_arrangement', // облаштування укриття
  'utilities', // опалення / водопостачання / електрика
  'equipment', // обладнання / меблі / техніка
] as const;
export type WorkCategory = (typeof WORK_CATEGORIES)[number];

/** Damaged-elements checklist — drives BoQ/budget (Shelter Cluster SN301E). */
export const DAMAGE_ELEMENTS = [
  'roof',
  'windows',
  'doors',
  'facade',
  'interior',
  'heating',
  'water_sewage',
  'electricity',
  'shelter',
] as const;
export type DamageElement = (typeof DAMAGE_ELEMENTS)[number];

/** Measurement unit per element; null = state-only (працює/пошкоджено). */
export const DAMAGE_ELEMENT_UNITS: Record<DamageElement, string | null> = {
  roof: 'm2',
  windows: 'pcs',
  doors: 'pcs',
  facade: 'm2',
  interior: 'm2',
  heating: null,
  water_sewage: null,
  electricity: null,
  shelter: null,
};

export const DAMAGE_CAUSES = [
  'shelling', // обстріл / ракетний удар
  'blast_wave',
  'fire',
  'wear_and_tear', // зношеність / аварійність (не war-damage)
  'other',
] as const;
export type DamageCause = (typeof DAMAGE_CAUSES)[number];

/** Методика №65 (наказ від 28.04.2022): категорії пошкодження будівель. */
export const DAMAGE_CATEGORIES = [
  'category_1', // до 40% — поточний/капітальний ремонт
  'category_2', // 41–80% — капремонт / реконструкція
  'category_3', // 81–100% — демонтаж
  'undetermined', // обстеження не проводилось
] as const;
export type DamageCategory = (typeof DAMAGE_CATEGORIES)[number];

/** HeRAMS-style functionality status (WHO taxonomy). */
export const FUNCTIONING_STATUSES = [
  'operational',
  'partially_operational',
  'not_operational',
] as const;
export type FunctioningStatus = (typeof FUNCTIONING_STATUSES)[number];

export const OWNERSHIP_TYPES = ['communal', 'state', 'other'] as const;
export type OwnershipType = (typeof OWNERSHIP_TYPES)[number];

/** ДБН В.2.2-40:2018 quick checklist (GIZ/UNICEF/ECHO accessibility). */
export const ACCESSIBILITY_FEATURES = [
  'ramp',
  'accessible_wc',
  'wide_doors', // двері ≥90 см
  'elevator',
  'none',
] as const;
export type AccessibilityFeature = (typeof ACCESSIBILITY_FEATURES)[number];

// ── Conditional block: education (МОН «Школа офлайн» / Education Cluster) ──

export const EDUCATION_MODES = ['in_person', 'blended', 'remote'] as const;
export type EducationMode = (typeof EDUCATION_MODES)[number];

export const SHELTER_STATUSES = [
  'functional', // є і функціонує
  'needs_repair', // є, потребує ремонту
  'absent',
] as const;
export type ShelterStatus = (typeof SHELTER_STATUSES)[number];

/** ДБН В.2.2-5:2023: сховище / ПРУ / найпростіше укриття. */
export const SHELTER_TYPES = [
  'bomb_shelter',
  'radiation_shelter',
  'basic_cover',
] as const;
export type ShelterType = (typeof SHELTER_TYPES)[number];

// ── Conditional block: healthcare (HeRAMS facility kinds) ──

export const HEALTH_FACILITY_KINDS = [
  'phc_center', // ЦПМСД
  'ambulatory',
  'fap', // фельдшерсько-акушерський пункт
  'hospital',
  'other',
] as const;
export type HealthFacilityKind = (typeof HEALTH_FACILITY_KINDS)[number];

export const REMOTE_OPERATION_OPTIONS = ['yes', 'no', 'partially'] as const;
export type RemoteOperationOption = (typeof REMOTE_OPERATION_OPTIONS)[number];

// ── Budget / docs / timeline ──

/** Source of the estimated cost — donor trust level of the figure. */
export const COST_BASIS_OPTIONS = [
  'cost_estimate', // кошторис
  'defect_act', // дефектний акт
  'expert_assessment',
  'applicant_estimate', // попередня оцінка заявника
] as const;
export type CostBasis = (typeof COST_BASIS_OPTIONS)[number];

export const COFINANCING_OPTIONS = ['yes', 'no', 'partial'] as const;
export type CofinancingOption = (typeof COFINANCING_OPTIONS)[number];

/** Documentation trail (Постанова №326 → дефектний акт → кошторис → ПКД → експертиза). */
export const DOCS_AVAILABLE_OPTIONS = [
  'survey_act_326', // акт обстеження за пост. КМУ №326
  'defect_act',
  'cost_estimate',
  'design_docs', // ПКД
  'design_expertise', // експертиза ПКД
  'none',
] as const;
export type DocsAvailableOption = (typeof DOCS_AVAILABLE_OPTIONS)[number];

export const DESIRED_TIMELINES = ['up_to_1m', 'm1_3', 'm3_6', 'm6_12'] as const;
export type DesiredTimeline = (typeof DESIRED_TIMELINES)[number];

export const URGENCY_OPTIONS = [
  'urgent_before_winter',
  'planned',
  'strategic',
] as const;
export type UrgencyOption = (typeof URGENCY_OPTIONS)[number];

/** ECHO environmental screening — asbestos-containing materials. */
export const ASBESTOS_OPTIONS = ['yes', 'no', 'unknown'] as const;
export type AsbestosOption = (typeof ASBESTOS_OPTIONS)[number];

// ── Attachments ──

export const ATTACHMENT_KINDS = ['photo', 'document'] as const;
export type AttachmentKind = (typeof ATTACHMENT_KINDS)[number];

/** Uploaded keys must live under this prefix (guards against foreign S3 keys). */
export const RECOVERY_S3_PREFIX = 'media/needs/recovery/';

export const PHOTO_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/zip',
] as const;

export const PHOTOS_MIN = 3;
export const PHOTOS_MAX = 10;
export const DOCUMENTS_MAX = 5;
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
export const DOCUMENT_MAX_BYTES = 15 * 1024 * 1024; // 15 MB

/** form_type discriminator used by shared needs_* tables. */
export const RECOVERY_FORM_TYPE = 'recovery';
/** Tracking number prefix letter: CSD-R-2026-0042. */
export const RECOVERY_NUMBER_PREFIX = 'R';
