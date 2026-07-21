// ui/src/app/features/needs/recovery-form/recovery-form.interfaces.ts
// === ADDED: PR-3 UI contract for the Recovery form ("Ремонт і відновлення
// соціальної інфраструктури"). Option unions, bilingual label lists and the
// submit payload mirror backend recovery.constants.ts + CreateRecoveryFormDto,
// so buildPayload() stays in lockstep with server-side validation. ===

/** Bilingual select/radio option (optional hint renders as helper text). */
export interface LabeledOption<T extends string> {
  value: T;
  ua: string;
  en: string;
  hintUa?: string;
  hintEn?: string;
}

// ── Applicant ──

export type ApplicantCategory =
  | 'municipality'
  | 'education_institution'
  | 'healthcare_institution'
  | 'utility_company'
  | 'ngo'
  | 'other';

export const APPLICANT_CATEGORY_OPTIONS: readonly LabeledOption<ApplicantCategory>[] = [
  {
    value: 'municipality',
    ua: 'Орган місцевого самоврядування (ОМС)',
    en: 'Local self-government body',
  },
  { value: 'education_institution', ua: 'Заклад освіти', en: 'Education institution' },
  { value: 'healthcare_institution', ua: 'Заклад охорони здоровʼя', en: 'Healthcare institution' },
  { value: 'utility_company', ua: 'Комунальне підприємство (КП)', en: 'Utility company' },
  { value: 'ngo', ua: 'Громадська організація', en: 'NGO' },
  { value: 'other', ua: 'Інше', en: 'Other' },
];

// ── Object ──

export type ObjectType =
  | 'education'
  | 'healthcare'
  | 'shelter'
  | 'resilience_center'
  | 'municipal_building'
  | 'social_facility'
  | 'other';

export const OBJECT_TYPE_OPTIONS: readonly LabeledOption<ObjectType>[] = [
  { value: 'education', ua: 'Заклад освіти', en: 'Education facility' },
  { value: 'healthcare', ua: 'Заклад охорони здоровʼя', en: 'Healthcare facility' },
  {
    value: 'shelter',
    ua: 'Укриття / сховище (окрема споруда)',
    en: 'Shelter (separate structure)',
  },
  { value: 'resilience_center', ua: 'Пункт незламності', en: 'Resilience center' },
  {
    value: 'municipal_building',
    ua: 'Адміністративна будівля ОМС',
    en: 'Municipal administrative building',
  },
  { value: 'social_facility', ua: 'Інший соціальний обʼєкт', en: 'Other social facility' },
  { value: 'other', ua: 'Інше', en: 'Other' },
];

export type WorkCategory = 'building_repair' | 'shelter_arrangement' | 'utilities' | 'equipment';

export const WORK_CATEGORY_OPTIONS: readonly LabeledOption<WorkCategory>[] = [
  {
    value: 'building_repair',
    ua: 'Ремонт / відновлення будівлі',
    en: 'Building repair / restoration',
  },
  { value: 'shelter_arrangement', ua: 'Облаштування укриття', en: 'Shelter arrangement' },
  {
    value: 'utilities',
    ua: 'Опалення / водопостачання / електрика',
    en: 'Heating / water / electricity',
  },
  {
    value: 'equipment',
    ua: 'Обладнання / меблі / техніка',
    en: 'Equipment / furniture / appliances',
  },
];

export type OwnershipType = 'communal' | 'state' | 'other';

export const OWNERSHIP_TYPE_OPTIONS: readonly LabeledOption<OwnershipType>[] = [
  { value: 'communal', ua: 'Комунальна', en: 'Communal' },
  { value: 'state', ua: 'Державна', en: 'State' },
  { value: 'other', ua: 'Інша', en: 'Other' },
];

// ── Damaged-elements checklist (drives BoQ/budget) ──

export type DamageElement =
  | 'roof'
  | 'windows'
  | 'doors'
  | 'facade'
  | 'interior'
  | 'heating'
  | 'water_sewage'
  | 'electricity'
  | 'shelter';

/** unit=null → checkbox only (no measurable volume). */
export interface DamageElementDef {
  element: DamageElement;
  ua: string;
  en: string;
  unit: 'm2' | 'pcs' | null;
  unitUa: string;
  unitEn: string;
}

export const DAMAGE_ELEMENTS: readonly DamageElementDef[] = [
  { element: 'roof', ua: 'Покрівля', en: 'Roof', unit: 'm2', unitUa: 'м²', unitEn: 'm²' },
  { element: 'windows', ua: 'Вікна', en: 'Windows', unit: 'pcs', unitUa: 'шт', unitEn: 'pcs' },
  { element: 'doors', ua: 'Двері', en: 'Doors', unit: 'pcs', unitUa: 'шт', unitEn: 'pcs' },
  {
    element: 'facade',
    ua: 'Фасад / утеплення',
    en: 'Facade / insulation',
    unit: 'm2',
    unitUa: 'м²',
    unitEn: 'm²',
  },
  {
    element: 'interior',
    ua: 'Внутрішні приміщення',
    en: 'Interior spaces',
    unit: 'm2',
    unitUa: 'м²',
    unitEn: 'm²',
  },
  { element: 'heating', ua: 'Опалення', en: 'Heating', unit: null, unitUa: '', unitEn: '' },
  {
    element: 'water_sewage',
    ua: 'Водопостачання / каналізація',
    en: 'Water supply / sewage',
    unit: null,
    unitUa: '',
    unitEn: '',
  },
  {
    element: 'electricity',
    ua: 'Електромережі',
    en: 'Electrical networks',
    unit: null,
    unitUa: '',
    unitEn: '',
  },
  { element: 'shelter', ua: 'Укриття', en: 'Shelter', unit: null, unitUa: '', unitEn: '' },
];

export type DamageCause = 'shelling' | 'blast_wave' | 'fire' | 'wear_and_tear' | 'other';

export const DAMAGE_CAUSE_OPTIONS: readonly LabeledOption<DamageCause>[] = [
  { value: 'shelling', ua: 'Обстріл / ракетний удар', en: 'Shelling / missile strike' },
  { value: 'blast_wave', ua: 'Вибухова хвиля', en: 'Blast wave' },
  { value: 'fire', ua: 'Пожежа внаслідок бойових дій', en: 'Fire due to hostilities' },
  { value: 'wear_and_tear', ua: 'Зношеність / аварійність', en: 'Wear and tear / disrepair' },
  { value: 'other', ua: 'Інше', en: 'Other' },
];

export type DamageCategory = 'category_1' | 'category_2' | 'category_3' | 'undetermined';

export const DAMAGE_CATEGORY_OPTIONS: readonly LabeledOption<DamageCategory>[] = [
  {
    value: 'category_1',
    ua: 'Категорія I (до 40%)',
    en: 'Category I (up to 40%)',
    hintUa: 'Поточний або капітальний ремонт (Методика №65)',
    hintEn: 'Current or capital repair (Methodology No. 65)',
  },
  {
    value: 'category_2',
    ua: 'Категорія II (41–80%)',
    en: 'Category II (41–80%)',
    hintUa: 'Капітальний ремонт / реконструкція',
    hintEn: 'Capital repair / reconstruction',
  },
  {
    value: 'category_3',
    ua: 'Категорія III (81–100%)',
    en: 'Category III (81–100%)',
    hintUa: 'Демонтаж',
    hintEn: 'Demolition',
  },
  {
    value: 'undetermined',
    ua: 'Не визначено',
    en: 'Undetermined',
    hintUa: 'Обстеження не проводилось',
    hintEn: 'No survey conducted',
  },
];

export type FunctioningStatus = 'operational' | 'partially_operational' | 'not_operational';

export const FUNCTIONING_STATUS_OPTIONS: readonly LabeledOption<FunctioningStatus>[] = [
  { value: 'operational', ua: 'Функціонує', en: 'Operational' },
  { value: 'partially_operational', ua: 'Частково функціонує', en: 'Partially operational' },
  { value: 'not_operational', ua: 'Не функціонує', en: 'Not operational' },
];

export type AccessibilityFeature = 'ramp' | 'accessible_wc' | 'wide_doors' | 'elevator' | 'none';

export const ACCESSIBILITY_FEATURE_OPTIONS: readonly LabeledOption<AccessibilityFeature>[] = [
  { value: 'ramp', ua: 'Пандус', en: 'Ramp' },
  { value: 'accessible_wc', ua: 'Доступний санвузол', en: 'Accessible restroom' },
  { value: 'wide_doors', ua: 'Двері ≥90 см', en: 'Doors ≥90 cm' },
  { value: 'elevator', ua: 'Ліфт / підйомник', en: 'Elevator / lift' },
  { value: 'none', ua: 'Нічого з переліченого', en: 'None of the above' },
];

// ── Conditional: education ──

export type EducationMode = 'in_person' | 'blended' | 'remote';

export const EDUCATION_MODE_OPTIONS: readonly LabeledOption<EducationMode>[] = [
  { value: 'in_person', ua: 'Очно', en: 'In-person' },
  { value: 'blended', ua: 'Змішано', en: 'Blended' },
  { value: 'remote', ua: 'Дистанційно', en: 'Remote' },
];

export type ShelterStatus = 'functional' | 'needs_repair' | 'absent';

export const SHELTER_STATUS_OPTIONS: readonly LabeledOption<ShelterStatus>[] = [
  { value: 'functional', ua: 'Є і функціонує', en: 'Present and functional' },
  { value: 'needs_repair', ua: 'Є, потребує ремонту', en: 'Present, needs repair' },
  { value: 'absent', ua: 'Немає', en: 'Absent' },
];

export type ShelterType = 'bomb_shelter' | 'radiation_shelter' | 'basic_cover';

export const SHELTER_TYPE_OPTIONS: readonly LabeledOption<ShelterType>[] = [
  { value: 'bomb_shelter', ua: 'Сховище', en: 'Bomb shelter' },
  { value: 'radiation_shelter', ua: 'ПРУ (протирадіаційне укриття)', en: 'Radiation shelter' },
  { value: 'basic_cover', ua: 'Найпростіше укриття', en: 'Basic cover' },
];

// ── Conditional: healthcare ──

export type HealthFacilityKind = 'phc_center' | 'ambulatory' | 'fap' | 'hospital' | 'other';

export const HEALTH_FACILITY_KIND_OPTIONS: readonly LabeledOption<HealthFacilityKind>[] = [
  { value: 'phc_center', ua: 'ЦПМСД', en: 'Primary healthcare center' },
  { value: 'ambulatory', ua: 'Амбулаторія', en: 'Ambulatory' },
  { value: 'fap', ua: 'ФАП / ФП', en: 'Feldsher-midwife post' },
  { value: 'hospital', ua: 'Лікарня', en: 'Hospital' },
  { value: 'other', ua: 'Інше', en: 'Other' },
];

export type RemoteOperationOption = 'yes' | 'no' | 'partially';

export const REMOTE_OPERATION_OPTIONS: readonly LabeledOption<RemoteOperationOption>[] = [
  { value: 'yes', ua: 'Так', en: 'Yes' },
  { value: 'no', ua: 'Ні', en: 'No' },
  { value: 'partially', ua: 'Частково', en: 'Partially' },
];

// ── Budget / docs / timeline ──

export type CostBasis = 'cost_estimate' | 'defect_act' | 'expert_assessment' | 'applicant_estimate';

export const COST_BASIS_OPTIONS: readonly LabeledOption<CostBasis>[] = [
  { value: 'cost_estimate', ua: 'Кошторис', en: 'Cost estimate' },
  { value: 'defect_act', ua: 'Дефектний акт', en: 'Defect act' },
  { value: 'expert_assessment', ua: 'Експертна оцінка', en: 'Expert assessment' },
  {
    value: 'applicant_estimate',
    ua: 'Попередня оцінка заявника',
    en: 'Applicant preliminary estimate',
  },
];

export type CofinancingOption = 'yes' | 'no' | 'partial';

export const COFINANCING_OPTIONS: readonly LabeledOption<CofinancingOption>[] = [
  { value: 'yes', ua: 'Так', en: 'Yes' },
  { value: 'no', ua: 'Ні', en: 'No' },
  { value: 'partial', ua: 'Частково', en: 'Partially' },
];

export type DocsAvailableOption =
  | 'survey_act_326'
  | 'defect_act'
  | 'cost_estimate'
  | 'design_docs'
  | 'design_expertise'
  | 'none';

export const DOCS_AVAILABLE_OPTIONS: readonly LabeledOption<DocsAvailableOption>[] = [
  {
    value: 'survey_act_326',
    ua: 'Акт обстеження (пост. КМУ №326)',
    en: 'Survey act (CMU Res. No. 326)',
  },
  { value: 'defect_act', ua: 'Дефектний акт', en: 'Defect act' },
  { value: 'cost_estimate', ua: 'Кошторис', en: 'Cost estimate' },
  {
    value: 'design_docs',
    ua: 'Проєктно-кошторисна документація (ПКД)',
    en: 'Design & cost documentation',
  },
  { value: 'design_expertise', ua: 'Експертиза ПКД', en: 'Design documentation expertise' },
  { value: 'none', ua: 'Документація відсутня', en: 'No documentation' },
];

export type DesiredTimeline = 'up_to_1m' | 'm1_3' | 'm3_6' | 'm6_12';

export const DESIRED_TIMELINE_OPTIONS: readonly LabeledOption<DesiredTimeline>[] = [
  { value: 'up_to_1m', ua: 'До 1 місяця', en: 'Up to 1 month' },
  { value: 'm1_3', ua: '1–3 місяці', en: '1–3 months' },
  { value: 'm3_6', ua: '3–6 місяців', en: '3–6 months' },
  { value: 'm6_12', ua: '6–12 місяців', en: '6–12 months' },
];

export type UrgencyOption = 'urgent_before_winter' | 'planned' | 'strategic';

export const URGENCY_OPTIONS: readonly LabeledOption<UrgencyOption>[] = [
  {
    value: 'urgent_before_winter',
    ua: 'Терміново (до опалювального сезону)',
    en: 'Urgent (before heating season)',
  },
  { value: 'planned', ua: 'Планово', en: 'Planned' },
  { value: 'strategic', ua: 'Стратегічно', en: 'Strategic' },
];

export type AsbestosOption = 'yes' | 'no' | 'unknown';

export const ASBESTOS_OPTIONS: readonly LabeledOption<AsbestosOption>[] = [
  {
    value: 'yes',
    ua: 'Так (шифер / азбестовмісні матеріали)',
    en: 'Yes (slate / asbestos-containing materials)',
  },
  { value: 'no', ua: 'Ні', en: 'No' },
  { value: 'unknown', ua: 'Невідомо', en: 'Unknown' },
];

// ── Submit payload (mirrors CreateRecoveryFormDto) ──

export interface RecoveryDamagePayload {
  element: DamageElement;
  volume?: number;
  notes?: string;
  sortOrder?: number;
}

export interface RecoveryAttachmentPayload {
  s3Key: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  sortOrder?: number;
}

export interface CreateRecoveryFormPayload {
  applicantCategory: ApplicantCategory;
  applicantCategoryOther?: string;
  organizationName: string;

  region: string;
  regionEn: string;
  district: string;
  districtEn: string;
  community: string;
  communityEn: string;
  communityCode: string;
  settlement?: string;
  settlementEn?: string;
  settlementCode?: string;

  contactName: string;
  contactPosition: string;
  phone: string;
  email: string;
  messenger?: string;
  altContactName?: string;
  altContactPhone?: string;
  website?: string;

  objectName: string;
  objectType: ObjectType;
  objectTypeOther?: string;
  streetAddress?: string;
  ownershipType?: OwnershipType;
  ownershipTypeOther?: string;
  onApplicantBalance?: boolean;
  buildYear?: number;
  totalArea?: number;
  floors?: number;
  workCategories: WorkCategory[];
  damages: RecoveryDamagePayload[];
  damageDescription: string;
  damageCause: DamageCause;
  damageCauseOther?: string;
  damageDate?: string;
  damageCategory: DamageCategory;
  functioningStatus: FunctioningStatus;
  accessibilityFeatures?: AccessibilityFeature[];

  educationMode?: EducationMode;
  shelterStatus?: ShelterStatus;
  shelterType?: ShelterType;
  shelterCapacity?: number;

  healthFacilityKind?: HealthFacilityKind;
  suspendedServices?: string;
  declarationsCount?: number;

  directBeneficiaries: number;
  idpCount: number;
  childrenCount: number;
  pwdCount: number;
  elderlyCount: number;
  femaleCount?: number;
  maleCount?: number;
  indirectBeneficiaries?: number;
  staffCount?: number;
  canOperateRemotely?: RemoteOperationOption;

  estimatedCost: number;
  costBasis: CostBasis;
  cofinancing: CofinancingOption;
  cofinancingDetails?: string;
  docsAvailable: DocsAvailableOption[];
  desiredTimeline?: DesiredTimeline;
  urgency?: UrgencyOption;
  otherDonors: boolean;
  otherDonorsDetails?: string;
  asbestosPresence: AsbestosOption;
  cloudLink?: string;

  photos: RecoveryAttachmentPayload[];
  documents?: RecoveryAttachmentPayload[];
  consentGiven: boolean;
}

/**
 * Data portion produced by the PR-3 form (steps 1–4). Files (photos/documents)
 * and consent are added in PR-4 when steps 5–6 and the submit flow land.
 */
export type RecoveryDataPayload = Omit<
  CreateRecoveryFormPayload,
  'photos' | 'documents' | 'consentGiven'
>;

/** localStorage draft envelope (files are never persisted). */
export interface RecoveryDraft {
  version: 1;
  savedAt: number;
  value: Record<string, unknown>;
}
