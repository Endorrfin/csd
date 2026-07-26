/**
 * Centralized UA/EN labels for the Winterization needs-form XLSX export (PR-W4).
 *
 * Same shape as `recovery-xlsx-export.labels.ts`: a private `pick` helper plus
 * key -> [ua, en] maps and thin label functions. `winterization.constants.ts`
 * stores only the raw option arrays (no bilingual text), so the human labels
 * live here. `status` / `labelBool` are reused from the WASH labels file (the
 * 6-value FormStatus enum is shared by every needs form).
 *
 * INVARIANT: every value of every constant array must have an entry here — the
 * spec walks the constants and fails on a missing pair, so adding an option to
 * winterization.constants.ts without a label breaks the build, not the export.
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

export const APPLICANT_TYPE_LABELS: Record<string, [string, string]> = {
  municipality: ['ОМС / громада', 'Municipality / hromada'],
  institution: ['Інституція / заклад', 'Institution / facility'],
  household: ['Домогосподарство / ФО', 'Household / individual'],
};

export const FACILITY_KIND_LABELS: Record<string, [string, string]> = {
  education: ['Заклад освіти', 'Education facility'],
  healthcare: ['Заклад охорони здоровʼя', 'Healthcare facility'],
  idp_collective_site: ['МКП / МТП ВПО', 'IDP collective site'],
  resilience_center: ['Пункт незламності', 'Resilience center'],
  municipal_building: ['Адмінбудівля ОМС', 'Municipal building'],
  social_facility: ['Соціальний заклад', 'Social facility'],
  utility_boiler: ['Котельня / КП', 'Boiler house / utility'],
  other: ['Інше', 'Other'],
};

/** SN201A (utility-based) vs SN201B (solid fuel) — decides the modality. */
export const HEATING_SOURCE_LABELS: Record<string, [string, string]> = {
  district: ['Централізоване', 'District heating'],
  autonomous_gas: ['Автономна котельня (газ)', 'Autonomous boiler (gas)'],
  autonomous_solid_fuel: [
    'Автономна котельня (тверде паливо)',
    'Autonomous boiler (solid fuel)',
  ],
  electric: ['Електричне', 'Electric'],
  stove: ['Пічне', 'Stove'],
  none: ['Опалення відсутнє', 'No heating'],
  other: ['Інше', 'Other'],
};

export const BACKUP_POWER_LABELS: Record<string, [string, string]> = {
  sufficient: ['Є (достатнє)', 'Yes (sufficient)'],
  insufficient: ['Є (недостатнє)', 'Yes (insufficient)'],
  none: ['Немає', 'None'],
};

export const BUILDING_CONDITION_LABELS: Record<string, [string, string]> = {
  satisfactory: ['Задовільний', 'Satisfactory'],
  partial_repair_needed: [
    'Потребує часткового ремонту',
    'Needs partial repair',
  ],
  unsatisfactory: ['Незадовільний', 'Unsatisfactory'],
};

/** Targeting narrative for UHF / ECHO / UNICEF (frontline hromadas first). */
export const FRONTLINE_STATUS_LABELS: Record<string, [string, string]> = {
  frontline: ['Прифронтова (<30 км)', 'Frontline (<30 km)'],
  deoccupied: ['Деокупована', 'Deoccupied'],
  idp_hosting: ['Приймає значну кількість ВПО', 'Hosting many IDPs'],
  rear: ['Тилова', 'Rear'],
};

// ── Needs ──

export const NEED_CATEGORY_LABELS: Record<string, [string, string]> = {
  generators: ['Генератори / резервне живлення', 'Generators / backup power'],
  solid_fuel: ['Тверде паливо', 'Solid fuel'],
  heating_appliances: [
    'Обігрівачі та опалювальні прилади',
    'Heating appliances',
  ],
  heating_system_repair: [
    'Ремонт / модернізація тепло- і водопостачання',
    'Heating / water supply repair',
  ],
  insulation: ['Утеплення будівлі', 'Building insulation'],
  resilience_point_equipment: [
    'Обладнання Пункту Незламності',
    'Resilience point equipment',
  ],
  winter_nfi: ['Зимові речі (NFI)', 'Winter NFI'],
  liquid_fuel: ['Пальне для генераторів', 'Fuel for generators'],
  utilities_cash: [
    'Кошти на комунальні послуги (SN201A)',
    'Cash for utilities (SN201A)',
  ],
  other: ['Інше', 'Other'],
};

/** Flat item catalog — the "Needs" sheet renders one row per item. */
export const NEED_ITEM_LABELS: Record<string, [string, string]> = {
  generator: ['Генератор', 'Generator'],
  coal: ['Вугілля', 'Coal'],
  pellets: ['Пелети', 'Pellets'],
  firewood: ['Дрова', 'Firewood'],
  briquettes: ['Брикети', 'Briquettes'],
  convector: ['Конвектор', 'Convector'],
  oil_heater: ['Масляний радіатор', 'Oil heater'],
  fan_heater: ['Тепловентилятор', 'Fan heater'],
  solid_fuel_stove: ['Твердопаливна піч', 'Solid-fuel stove'],
  potbelly_stove: ['Буржуйка', 'Potbelly stove'],
  gas_heater: ['Газовий обігрівач', 'Gas heater'],
  boiler: ['Заміна / ремонт котла', 'Boiler replacement / repair'],
  heat_networks: ['Теплові мережі', 'Heat networks'],
  pumps: ['Насоси', 'Pumps'],
  heat_substation: ['ІТП (тепловий пункт)', 'Heating substation'],
  water_heating_equipment: ['Бойлерне обладнання', 'Water-heating equipment'],
  windows: ['Вікна', 'Windows'],
  doors: ['Двері', 'Doors'],
  roof: ['Покрівля', 'Roof'],
  facade: ['Утеплення фасаду / горища', 'Facade / attic insulation'],
  heating: ['Обігрів', 'Heating'],
  furniture: ['Меблі / спальні місця', 'Furniture / sleeping places'],
  water_boiler: ['Бойлер / термопоти', 'Water boiler / thermopots'],
  connectivity: ['Звʼязок / Starlink', 'Connectivity / Starlink'],
  powerbanks: ['Павербанки', 'Powerbanks'],
  other: ['Інше', 'Other'],
  blankets: ['Ковдри', 'Blankets'],
  sleeping_bags: ['Спальники', 'Sleeping bags'],
  thermal_underwear: ['Термобілизна', 'Thermal underwear'],
  warm_clothing: ['Теплий одяг', 'Warm clothing'],
  thermoses: ['Термоси', 'Thermoses'],
  flashlights: ['Ліхтарі', 'Flashlights'],
  diesel: ['Дизель', 'Diesel'],
  petrol: ['Бензин', 'Petrol'],
  lpg: ['Газ (LPG)', 'LPG'],
};

export const NEED_UNIT_LABELS: Record<string, [string, string]> = {
  t: ['т', 't'],
  m3: ['м³', 'm³'],
  pcs: ['шт.', 'pcs'],
  m: ['м', 'm'],
  m2: ['м²', 'm²'],
  l: ['л', 'l'],
  set: ['компл.', 'set'],
};

export const GENERATOR_FUEL_TYPE_LABELS: Record<string, [string, string]> = {
  diesel: ['Дизель', 'Diesel'],
  petrol: ['Бензин', 'Petrol'],
  gas: ['Газ', 'Gas'],
};

/** What the generator powers — CI support vs facility-level. */
export const GENERATOR_PURPOSE_LABELS: Record<string, [string, string]> = {
  boiler_house: ['Котельня', 'Boiler house'],
  water_utility: ['Водоканал', 'Water utility'],
  resilience_point: ['Пункт незламності', 'Resilience point'],
  facility: ['Заклад', 'Facility'],
  other: ['Інше', 'Other'],
};

export const RESILIENCE_POINT_STATUS_LABELS: Record<string, [string, string]> =
  {
    operational: ['Діючий', 'Operational'],
    planned: ['Планується', 'Planned'],
  };

// ── Budget & coordination ──

/** SN201B: fuel delivered after October is reported as an incomplete season. */
export const NEED_BY_LABELS: Record<string, [string, string]> = {
  by_october: ['До 1 жовтня', 'By 1 October'],
  by_november: ['До 1 листопада', 'By 1 November'],
  by_december: ['До 1 грудня', 'By 1 December'],
  during_season: ['Протягом сезону', 'During the season'],
};

export const URGENCY_LABELS: Record<string, [string, string]> = {
  critical: ['Критична', 'Critical'],
  high: ['Висока', 'High'],
  medium: ['Середня', 'Medium'],
};

export const COST_BASIS_LABELS: Record<string, [string, string]> = {
  cost_estimate: ['Кошторис', 'Cost estimate'],
  price_offer: ['Комерційна пропозиція / прайс', 'Price offer / quotation'],
  expert_assessment: ['Експертна оцінка', 'Expert assessment'],
  applicant_estimate: ['Попередня оцінка заявника', 'Applicant estimate'],
};

export const COFINANCING_LABELS: Record<string, [string, string]> = {
  yes: ['Так', 'Yes'],
  no: ['Ні', 'No'],
  partial: ['Частково', 'Partially'],
};

/** Transport is a material share of SN201B cost; storage is a precondition. */
export const LOGISTICS_LABELS: Record<string, [string, string]> = {
  own_transport: [
    'Власний транспорт (самовивіз)',
    'Own transport (self-pickup)',
  ],
  storage: ['Склад для зберігання', 'Storage warehouse'],
  staff_for_unloading: [
    'Персонал для розвантаження / монтажу',
    'Staff for unloading / installation',
  ],
  none: ['Нічого з переліченого', 'None of the above'],
};

export const DOCS_AVAILABLE_LABELS: Record<string, [string, string]> = {
  guarantee_letter: ['Гарантійний лист ОМС', 'Guarantee letter'],
  council_decision: ['Рішення виконкому / сесії', 'Council decision'],
  survey_act: ['Акт обстеження', 'Survey act'],
  defect_act: ['Дефектний акт', 'Defect act'],
  cost_estimate: ['Кошторис / КП', 'Cost estimate / price offer'],
  tech_specs: ['Технічні специфікації', 'Technical specifications'],
  none: ['Відсутні', 'None'],
};

// ── Attachments ──

export const ATTACHMENT_KIND_LABELS: Record<string, [string, string]> = {
  photo: ['Фото', 'Photo'],
  document: ['Документ', 'Document'],
};

// ── Scalar label functions ──

export function labelApplicantType(
  key: string | null | undefined,
  lang: Lang,
): string {
  return pick(APPLICANT_TYPE_LABELS, key, lang);
}

export function labelFacilityKind(
  key: string | null | undefined,
  lang: Lang,
): string {
  return pick(FACILITY_KIND_LABELS, key, lang);
}

export function labelHeatingSource(
  key: string | null | undefined,
  lang: Lang,
): string {
  return pick(HEATING_SOURCE_LABELS, key, lang);
}

export function labelBackupPower(
  key: string | null | undefined,
  lang: Lang,
): string {
  return pick(BACKUP_POWER_LABELS, key, lang);
}

export function labelBuildingCondition(
  key: string | null | undefined,
  lang: Lang,
): string {
  return pick(BUILDING_CONDITION_LABELS, key, lang);
}

export function labelFrontlineStatus(
  key: string | null | undefined,
  lang: Lang,
): string {
  return pick(FRONTLINE_STATUS_LABELS, key, lang);
}

export function labelNeedCategory(
  key: string | null | undefined,
  lang: Lang,
): string {
  return pick(NEED_CATEGORY_LABELS, key, lang);
}

export function labelNeedItem(
  key: string | null | undefined,
  lang: Lang,
): string {
  return pick(NEED_ITEM_LABELS, key, lang);
}

export function labelNeedUnit(
  key: string | null | undefined,
  lang: Lang,
): string {
  return pick(NEED_UNIT_LABELS, key, lang);
}

export function labelGeneratorFuelType(
  key: string | null | undefined,
  lang: Lang,
): string {
  return pick(GENERATOR_FUEL_TYPE_LABELS, key, lang);
}

export function labelGeneratorPurpose(
  key: string | null | undefined,
  lang: Lang,
): string {
  return pick(GENERATOR_PURPOSE_LABELS, key, lang);
}

export function labelResiliencePointStatus(
  key: string | null | undefined,
  lang: Lang,
): string {
  return pick(RESILIENCE_POINT_STATUS_LABELS, key, lang);
}

export function labelNeedBy(
  key: string | null | undefined,
  lang: Lang,
): string {
  return pick(NEED_BY_LABELS, key, lang);
}

export function labelUrgency(
  key: string | null | undefined,
  lang: Lang,
): string {
  return pick(URGENCY_LABELS, key, lang);
}

export function labelCostBasis(
  key: string | null | undefined,
  lang: Lang,
): string {
  return pick(COST_BASIS_LABELS, key, lang);
}

export function labelCofinancing(
  key: string | null | undefined,
  lang: Lang,
): string {
  return pick(COFINANCING_LABELS, key, lang);
}

export function labelAttachmentKind(
  key: string | null | undefined,
  lang: Lang,
): string {
  return pick(ATTACHMENT_KIND_LABELS, key, lang);
}

// ── Array label functions (text[] columns rendered as joined labels) ──

export function labelNeedCategories(
  values: readonly string[] | null | undefined,
  lang: Lang,
): string {
  return joinList(NEED_CATEGORY_LABELS, values, lang);
}

export function labelLogistics(
  values: readonly string[] | null | undefined,
  lang: Lang,
): string {
  return joinList(LOGISTICS_LABELS, values, lang);
}

export function labelDocsAvailable(
  values: readonly string[] | null | undefined,
  lang: Lang,
): string {
  return joinList(DOCS_AVAILABLE_LABELS, values, lang);
}
