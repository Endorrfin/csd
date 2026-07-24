/**
 * Centralized UA/EN labels for the Recovery needs-form XLSX export.
 * Same shape as `xlsx-export.labels.ts` (WASH): a private `pick` helper plus
 * enum→[ua,en] maps and thin label functions. `recovery.constants.ts` stores
 * only the raw option arrays (no bilingual text), so the human labels live here.
 * `status` / `labelBool` are reused from the WASH labels file (shared FormStatus).
 */

type Lang = 'ua' | 'en';

function pick(
  map: Record<string, [string, string]>,
  key: string | null | undefined,
  lang: Lang,
): string {
  if (!key) return '';
  const pair = map[key];
  if (!pair) return String(key);
  return lang === 'ua' ? pair[0] : pair[1];
}

/** Join an array of option keys into a single "a, b, c" cell of labels. */
function joinList(
  map: Record<string, [string, string]>,
  values: readonly string[] | null | undefined,
  lang: Lang,
): string {
  if (!values || values.length === 0) return '';
  return values.map((v) => pick(map, v, lang)).join(', ');
}

// ── Applicant / object ──

export const APPLICANT_CATEGORY_LABELS: Record<string, [string, string]> = {
  municipality: ['ОМС / орган місцевого самоврядування', 'Municipality / local self-government'],
  education_institution: ['Заклад освіти', 'Education institution'],
  healthcare_institution: ['Заклад охорони здоровʼя', 'Healthcare institution'],
  utility_company: ['Комунальне підприємство', 'Utility company'],
  ngo: ['Громадська організація', 'NGO'],
  other: ['Інше', 'Other'],
};

export const OBJECT_TYPE_LABELS: Record<string, [string, string]> = {
  education: ['Заклад освіти', 'Education'],
  healthcare: ['Заклад охорони здоровʼя', 'Healthcare'],
  shelter: ['Укриття / сховище', 'Shelter'],
  resilience_center: ['Пункт незламності', 'Resilience center'],
  municipal_building: ['Адмінбудівля ОМС', 'Municipal building'],
  social_facility: ['Соціальний обʼєкт', 'Social facility'],
  other: ['Інше', 'Other'],
};

export const OWNERSHIP_TYPE_LABELS: Record<string, [string, string]> = {
  communal: ['Комунальна', 'Communal'],
  state: ['Державна', 'State'],
  other: ['Інше', 'Other'],
};

export const WORK_CATEGORY_LABELS: Record<string, [string, string]> = {
  building_repair: ['Ремонт/відновлення будівлі', 'Building repair'],
  shelter_arrangement: ['Облаштування укриття', 'Shelter arrangement'],
  utilities: ['Комунікації (тепло/вода/електрика)', 'Utilities'],
  equipment: ['Обладнання/меблі/техніка', 'Equipment'],
};

// ── Damage ──

export const DAMAGE_CAUSE_LABELS: Record<string, [string, string]> = {
  shelling: ['Обстріл / ракетний удар', 'Shelling / missile strike'],
  blast_wave: ['Вибухова хвиля', 'Blast wave'],
  fire: ['Пожежа', 'Fire'],
  wear_and_tear: ['Зношеність / аварійність', 'Wear and tear'],
  other: ['Інше', 'Other'],
};

/** Методика №65. */
export const DAMAGE_CATEGORY_LABELS: Record<string, [string, string]> = {
  category_1: ['Категорія 1 (до 40%)', 'Category 1 (up to 40%)'],
  category_2: ['Категорія 2 (41–80%)', 'Category 2 (41–80%)'],
  category_3: ['Категорія 3 (81–100%)', 'Category 3 (81–100%)'],
  undetermined: ['Не визначено', 'Undetermined'],
};

export const FUNCTIONING_STATUS_LABELS: Record<string, [string, string]> = {
  operational: ['Функціонує', 'Operational'],
  partially_operational: ['Частково функціонує', 'Partially operational'],
  not_operational: ['Не функціонує', 'Not operational'],
};

export const ACCESSIBILITY_FEATURE_LABELS: Record<string, [string, string]> = {
  ramp: ['Пандус', 'Ramp'],
  accessible_wc: ['Доступний санвузол', 'Accessible WC'],
  wide_doors: ['Широкі двері (≥90 см)', 'Wide doors (≥90 cm)'],
  elevator: ['Ліфт', 'Elevator'],
  none: ['Немає', 'None'],
};

/** Damaged-elements checklist (Damages sheet). */
export const DAMAGE_ELEMENT_LABELS: Record<string, [string, string]> = {
  roof: ['Дах', 'Roof'],
  windows: ['Вікна', 'Windows'],
  doors: ['Двері', 'Doors'],
  facade: ['Фасад', 'Facade'],
  interior: ['Внутрішні роботи', 'Interior'],
  heating: ['Опалення', 'Heating'],
  water_sewage: ['Водопостачання / каналізація', 'Water / sewage'],
  electricity: ['Електрика', 'Electricity'],
  shelter: ['Укриття', 'Shelter'],
};

/** Damage volume units stored in recovery_form_damages.unit ('m2' | 'pcs'). */
export const DAMAGE_UNIT_LABELS: Record<string, [string, string]> = {
  m2: ['м²', 'm²'],
  pcs: ['шт.', 'pcs'],
};

// ── Conditional blocks: education / healthcare ──

export const EDUCATION_MODE_LABELS: Record<string, [string, string]> = {
  in_person: ['Очно', 'In person'],
  blended: ['Змішано', 'Blended'],
  remote: ['Дистанційно', 'Remote'],
};

export const SHELTER_STATUS_LABELS: Record<string, [string, string]> = {
  functional: ['Є і функціонує', 'Functional'],
  needs_repair: ['Є, потребує ремонту', 'Needs repair'],
  absent: ['Відсутнє', 'Absent'],
};

export const SHELTER_TYPE_LABELS: Record<string, [string, string]> = {
  bomb_shelter: ['Сховище', 'Bomb shelter'],
  radiation_shelter: ['ПРУ', 'Radiation shelter'],
  basic_cover: ['Найпростіше укриття', 'Basic cover'],
};

export const HEALTH_FACILITY_KIND_LABELS: Record<string, [string, string]> = {
  phc_center: ['ЦПМСД', 'PHC center'],
  ambulatory: ['Амбулаторія', 'Ambulatory'],
  fap: ['ФАП', 'FAP'],
  hospital: ['Лікарня', 'Hospital'],
  other: ['Інше', 'Other'],
};

/** canOperateRemotely — yes / no / partially. */
export const REMOTE_OPERATION_LABELS: Record<string, [string, string]> = {
  yes: ['Так', 'Yes'],
  no: ['Ні', 'No'],
  partially: ['Частково', 'Partially'],
};

// ── Budget / docs / timeline ──

export const COST_BASIS_LABELS: Record<string, [string, string]> = {
  cost_estimate: ['Кошторис', 'Cost estimate'],
  defect_act: ['Дефектний акт', 'Defect act'],
  expert_assessment: ['Експертна оцінка', 'Expert assessment'],
  applicant_estimate: ['Попередня оцінка заявника', 'Applicant estimate'],
};

/** cofinancing — yes / no / partial. */
export const COFINANCING_LABELS: Record<string, [string, string]> = {
  yes: ['Так', 'Yes'],
  no: ['Ні', 'No'],
  partial: ['Частково', 'Partial'],
};

export const DOCS_AVAILABLE_LABELS: Record<string, [string, string]> = {
  survey_act_326: ['Акт обстеження (пост. №326)', 'Survey act (Res. №326)'],
  defect_act: ['Дефектний акт', 'Defect act'],
  cost_estimate: ['Кошторис', 'Cost estimate'],
  design_docs: ['ПКД', 'Design docs (PKD)'],
  design_expertise: ['Експертиза ПКД', 'Design expertise'],
  none: ['Немає', 'None'],
};

export const DESIRED_TIMELINE_LABELS: Record<string, [string, string]> = {
  up_to_1m: ['До 1 місяця', 'Up to 1 month'],
  m1_3: ['1–3 місяці', '1–3 months'],
  m3_6: ['3–6 місяців', '3–6 months'],
  m6_12: ['6–12 місяців', '6–12 months'],
};

export const URGENCY_LABELS: Record<string, [string, string]> = {
  urgent_before_winter: ['Терміново (до зими)', 'Urgent (before winter)'],
  planned: ['Планово', 'Planned'],
  strategic: ['Стратегічно', 'Strategic'],
};

/** ECHO environmental screening — asbestos-containing materials. */
export const ASBESTOS_LABELS: Record<string, [string, string]> = {
  yes: ['Так', 'Yes'],
  no: ['Ні', 'No'],
  unknown: ['Невідомо', 'Unknown'],
};

// ── Attachments ──

export const ATTACHMENT_KIND_LABELS: Record<string, [string, string]> = {
  photo: ['Фото', 'Photo'],
  document: ['Документ', 'Document'],
};

// ── Scalar label functions ──

export function labelApplicantCategory(key: string | null | undefined, lang: Lang): string {
  return pick(APPLICANT_CATEGORY_LABELS, key, lang);
}

export function labelObjectType(key: string | null | undefined, lang: Lang): string {
  return pick(OBJECT_TYPE_LABELS, key, lang);
}

export function labelOwnershipType(key: string | null | undefined, lang: Lang): string {
  return pick(OWNERSHIP_TYPE_LABELS, key, lang);
}

export function labelDamageCause(key: string | null | undefined, lang: Lang): string {
  return pick(DAMAGE_CAUSE_LABELS, key, lang);
}

export function labelDamageCategory(key: string | null | undefined, lang: Lang): string {
  return pick(DAMAGE_CATEGORY_LABELS, key, lang);
}

export function labelFunctioningStatus(key: string | null | undefined, lang: Lang): string {
  return pick(FUNCTIONING_STATUS_LABELS, key, lang);
}

export function labelEducationMode(key: string | null | undefined, lang: Lang): string {
  return pick(EDUCATION_MODE_LABELS, key, lang);
}

export function labelShelterStatus(key: string | null | undefined, lang: Lang): string {
  return pick(SHELTER_STATUS_LABELS, key, lang);
}

export function labelShelterType(key: string | null | undefined, lang: Lang): string {
  return pick(SHELTER_TYPE_LABELS, key, lang);
}

export function labelHealthFacilityKind(key: string | null | undefined, lang: Lang): string {
  return pick(HEALTH_FACILITY_KIND_LABELS, key, lang);
}

export function labelRemoteOperation(key: string | null | undefined, lang: Lang): string {
  return pick(REMOTE_OPERATION_LABELS, key, lang);
}

export function labelCostBasis(key: string | null | undefined, lang: Lang): string {
  return pick(COST_BASIS_LABELS, key, lang);
}

export function labelCofinancing(key: string | null | undefined, lang: Lang): string {
  return pick(COFINANCING_LABELS, key, lang);
}

export function labelDesiredTimeline(key: string | null | undefined, lang: Lang): string {
  return pick(DESIRED_TIMELINE_LABELS, key, lang);
}

export function labelUrgency(key: string | null | undefined, lang: Lang): string {
  return pick(URGENCY_LABELS, key, lang);
}

export function labelAsbestos(key: string | null | undefined, lang: Lang): string {
  return pick(ASBESTOS_LABELS, key, lang);
}

export function labelDamageElement(key: string | null | undefined, lang: Lang): string {
  return pick(DAMAGE_ELEMENT_LABELS, key, lang);
}

export function labelDamageUnit(key: string | null | undefined, lang: Lang): string {
  return pick(DAMAGE_UNIT_LABELS, key, lang);
}

export function labelAttachmentKind(key: string | null | undefined, lang: Lang): string {
  return pick(ATTACHMENT_KIND_LABELS, key, lang);
}

// ── Array label functions (text[] columns rendered as joined labels) ──

export function labelWorkCategories(
  values: readonly string[] | null | undefined,
  lang: Lang,
): string {
  return joinList(WORK_CATEGORY_LABELS, values, lang);
}

export function labelAccessibilityFeatures(
  values: readonly string[] | null | undefined,
  lang: Lang,
): string {
  return joinList(ACCESSIBILITY_FEATURE_LABELS, values, lang);
}

export function labelDocsAvailable(
  values: readonly string[] | null | undefined,
  lang: Lang,
): string {
  return joinList(DOCS_AVAILABLE_LABELS, values, lang);
}
