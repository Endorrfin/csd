// ui/src/app/features/needs/winterization-form/winterization-form.interfaces.ts
// === ADDED: PR-W2 UI contract for the Winterization form («Підготовка до
// зими»). Option unions, bilingual label lists and the submit payload mirror
// backend winterization.constants.ts + CreateWinterizationFormDto — NOT §2 of
// the plan, which the implemented contract deliberately diverges from
// (implementation-plan §14.3). buildPayload() stays in lockstep with
// server-side validation as long as this file does. ===

/**
 * Bilingual select/radio option (optional hint renders as helper text).
 *
 * Declared locally rather than imported from recovery-form.interfaces.ts: each
 * needs-form owns its UI contract, and a cross-feature import would couple two
 * lazy chunks for five lines of shape.
 */
export interface LabeledOption<T extends string> {
  value: T;
  ua: string;
  en: string;
  hintUa?: string;
  hintEn?: string;
}

/** One measurable spec item: a checkbox plus an optional quantity in `unit`. */
export interface NeedItemDef<T extends string> {
  item: T;
  ua: string;
  en: string;
  /** Label of the quantity unit; null → checkbox only, no number field. */
  unitUa: string | null;
  unitEn: string | null;
}

// ── Крок 0/1: applicant type ──

export type WinterizationApplicantType = 'municipality' | 'institution' | 'household';

/**
 * `household` is designed end-to-end but gated off at launch: the card renders
 * disabled behind environment.winterizationHouseholdEnabled, and the server
 * answers 422 regardless (implementation-plan §7). Its own step layout and the
 * hh* fields land with the flag, not with PR-W2.
 */
export const APPLICANT_TYPE_OPTIONS: readonly LabeledOption<WinterizationApplicantType>[] = [
  {
    value: 'municipality',
    ua: 'ОМС / Громада',
    en: 'Local self-government / Hromada',
    hintUa: 'Потреба рівня громади: паливо для котелень, генератори для критичної інфраструктури',
    hintEn: 'Community-level need: fuel for boiler houses, generators for critical infrastructure',
  },
  {
    value: 'institution',
    ua: 'Інституція / Заклад',
    en: 'Institution / Facility',
    hintUa: 'Одна заявка = один заклад (школа, амбулаторія, пункт незламності…)',
    hintEn: 'One application = one facility (school, clinic, resilience center…)',
  },
  {
    value: 'household',
    ua: 'Домогосподарство / ФО',
    en: 'Household / Individual',
    hintUa: 'Наразі заявки від фізичних осіб не приймаються',
    hintEn: 'Applications from individuals are not accepted yet',
  },
];

// ── Крок 2а: institution ──

export type FacilityKind =
  | 'education'
  | 'healthcare'
  | 'idp_collective_site'
  | 'resilience_center'
  | 'municipal_building'
  | 'social_facility'
  | 'utility_boiler'
  | 'other';

export const FACILITY_KIND_OPTIONS: readonly LabeledOption<FacilityKind>[] = [
  {
    value: 'education',
    ua: 'Заклад освіти (школа / садок)',
    en: 'Education facility (school / kindergarten)',
  },
  { value: 'healthcare', ua: 'Заклад охорони здоровʼя', en: 'Healthcare facility' },
  {
    value: 'idp_collective_site',
    ua: 'МКП / МТП (компактне проживання ВПО)',
    en: 'IDP collective site',
  },
  { value: 'resilience_center', ua: 'Пункт незламності', en: 'Resilience center' },
  { value: 'municipal_building', ua: 'Адмінбудівля ОМС', en: 'Municipal administrative building' },
  {
    value: 'social_facility',
    ua: 'Соціальний заклад (ЦНАП, терцентр…)',
    en: 'Social facility (ASC, social services center…)',
  },
  {
    value: 'utility_boiler',
    ua: 'Котельня / комунальне підприємство',
    en: 'Boiler house / utility company',
  },
  { value: 'other', ua: 'Інше', en: 'Other' },
];

export type HeatingSource =
  | 'district'
  | 'autonomous_gas'
  | 'autonomous_solid_fuel'
  | 'electric'
  | 'stove'
  | 'none'
  | 'other';

export const HEATING_SOURCE_OPTIONS: readonly LabeledOption<HeatingSource>[] = [
  { value: 'district', ua: 'Централізоване', en: 'District heating' },
  { value: 'autonomous_gas', ua: 'Автономна котельня (газ)', en: 'Autonomous boiler (gas)' },
  {
    value: 'autonomous_solid_fuel',
    ua: 'Автономна котельня (тверде паливо)',
    en: 'Autonomous boiler (solid fuel)',
  },
  { value: 'electric', ua: 'Електричне', en: 'Electric' },
  { value: 'stove', ua: 'Пічне', en: 'Stove' },
  { value: 'none', ua: 'Опалення відсутнє', en: 'No heating' },
  { value: 'other', ua: 'Інше', en: 'Other' },
];

export type BackupPowerOption = 'sufficient' | 'insufficient' | 'none';

export const BACKUP_POWER_OPTIONS: readonly LabeledOption<BackupPowerOption>[] = [
  { value: 'sufficient', ua: 'Є (достатнє)', en: 'Yes (sufficient)' },
  { value: 'insufficient', ua: 'Є (недостатнє)', en: 'Yes (insufficient)' },
  { value: 'none', ua: 'Немає', en: 'None' },
];

export type BuildingCondition = 'satisfactory' | 'partial_repair_needed' | 'unsatisfactory';

export const BUILDING_CONDITION_OPTIONS: readonly LabeledOption<BuildingCondition>[] = [
  { value: 'satisfactory', ua: 'Задовільний', en: 'Satisfactory' },
  { value: 'partial_repair_needed', ua: 'Потребує часткового ремонту', en: 'Needs partial repair' },
  { value: 'unsatisfactory', ua: 'Незадовільний', en: 'Unsatisfactory' },
];

// ── Крок 2б: municipality ──

export type FrontlineStatus = 'frontline' | 'deoccupied' | 'idp_hosting' | 'rear';

export const FRONTLINE_STATUS_OPTIONS: readonly LabeledOption<FrontlineStatus>[] = [
  { value: 'frontline', ua: 'Прифронтова (<30 км)', en: 'Frontline (<30 km)' },
  { value: 'deoccupied', ua: 'Деокупована', en: 'Deoccupied' },
  {
    value: 'idp_hosting',
    ua: 'Приймає значну кількість ВПО',
    en: 'Hosting a significant number of IDPs',
  },
  { value: 'rear', ua: 'Тилова', en: 'Rear' },
];

// ── Крок 3: need categories ──

export type NeedCategory =
  | 'generators'
  | 'solid_fuel'
  | 'heating_appliances'
  | 'heating_system_repair'
  | 'insulation'
  | 'resilience_point_equipment'
  | 'winter_nfi'
  | 'liquid_fuel'
  | 'utilities_cash'
  | 'other';

/**
 * Categories offered to ОМС/громада and інституція — identical sets of 9
 * (NEED_CATEGORIES_BY_APPLICANT_TYPE). `utilities_cash` is household-only and
 * `municipal_equipment` was dropped on 2026-07-26, so neither appears here; the
 * server rejects any category outside the applicant type's own list.
 */
export type OrganizationNeedCategory = Exclude<NeedCategory, 'utilities_cash'>;

export const ORGANIZATION_NEED_CATEGORY_OPTIONS: readonly LabeledOption<OrganizationNeedCategory>[] =
  [
    { value: 'generators', ua: 'Генератори / резервне живлення', en: 'Generators / backup power' },
    {
      value: 'solid_fuel',
      ua: 'Тверде паливо (вугілля, пелети, дрова, брикети)',
      en: 'Solid fuel (coal, pellets, firewood, briquettes)',
    },
    {
      value: 'heating_appliances',
      ua: 'Обігрівачі та опалювальні прилади',
      en: 'Heaters and heating appliances',
    },
    {
      value: 'heating_system_repair',
      ua: 'Ремонт / модернізація тепло- і водопостачання',
      en: 'Heating / water supply repair or upgrade',
    },
    {
      value: 'insulation',
      ua: 'Утеплення будівлі (вікна, двері, покрівля)',
      en: 'Building insulation (windows, doors, roof)',
    },
    {
      value: 'resilience_point_equipment',
      ua: 'Обладнання для Пункту Незламності',
      en: 'Resilience point equipment',
    },
    {
      value: 'winter_nfi',
      ua: 'Зимові речі (ковдри, спальники, термобілизна, павербанки)',
      en: 'Winter NFI (blankets, sleeping bags, thermal underwear, powerbanks)',
    },
    {
      value: 'liquid_fuel',
      ua: 'Пальне для генераторів (дизель / бензин / газ)',
      en: 'Fuel for generators (diesel / petrol / LPG)',
    },
    { value: 'other', ua: 'Інше', en: 'Other' },
  ];

/** Categories whose spec block is a repair/insulation work → ≥3 photos (PR-W3). */
export const PHOTO_REQUIRED_CATEGORIES: readonly NeedCategory[] = [
  'heating_system_repair',
  'insulation',
];

// ── Крок 3: spec items (NEED_ITEMS_BY_CATEGORY) ──

export type NeedItem =
  | 'generator'
  | 'coal'
  | 'pellets'
  | 'firewood'
  | 'briquettes'
  | 'convector'
  | 'oil_heater'
  | 'fan_heater'
  | 'solid_fuel_stove'
  | 'potbelly_stove'
  | 'gas_heater'
  | 'boiler'
  | 'heat_networks'
  | 'pumps'
  | 'heat_substation'
  | 'water_heating_equipment'
  | 'windows'
  | 'doors'
  | 'roof'
  | 'facade'
  | 'heating'
  | 'furniture'
  | 'water_boiler'
  | 'connectivity'
  | 'powerbanks'
  | 'other'
  | 'blankets'
  | 'sleeping_bags'
  | 'thermal_underwear'
  | 'warm_clothing'
  | 'thermoses'
  | 'flashlights'
  | 'diesel'
  | 'petrol'
  | 'lpg';

export type NeedUnit = 't' | 'm3' | 'pcs' | 'm' | 'm2' | 'l' | 'set';

export type SolidFuelItem = 'coal' | 'pellets' | 'firewood' | 'briquettes';

/** Solid fuel is the ONE category where the applicant picks the unit (t | m³). */
export const SOLID_FUEL_UNIT_OPTIONS: readonly LabeledOption<'t' | 'm3'>[] = [
  { value: 't', ua: 'т', en: 't' },
  { value: 'm3', ua: 'м³', en: 'm³' },
];

/** `defaultUnit` mirrors NEED_ITEM_UNITS so the preselected unit matches the
 *  server default (coal/pellets/briquettes → t, firewood → m³). */
export interface SolidFuelItemDef {
  item: SolidFuelItem;
  ua: string;
  en: string;
  defaultUnit: 't' | 'm3';
}

export const SOLID_FUEL_ITEMS: readonly SolidFuelItemDef[] = [
  { item: 'coal', ua: 'Вугілля', en: 'Coal', defaultUnit: 't' },
  { item: 'pellets', ua: 'Пелети', en: 'Pellets', defaultUnit: 't' },
  { item: 'firewood', ua: 'Дрова', en: 'Firewood', defaultUnit: 'm3' },
  { item: 'briquettes', ua: 'Брикети', en: 'Briquettes', defaultUnit: 't' },
];

export type HeatingApplianceItem =
  | 'convector'
  | 'oil_heater'
  | 'fan_heater'
  | 'solid_fuel_stove'
  | 'potbelly_stove'
  | 'gas_heater';

export const HEATING_APPLIANCE_ITEMS: readonly NeedItemDef<HeatingApplianceItem>[] = [
  { item: 'convector', ua: 'Конвектор', en: 'Convector', unitUa: 'шт', unitEn: 'pcs' },
  { item: 'oil_heater', ua: 'Масляний радіатор', en: 'Oil heater', unitUa: 'шт', unitEn: 'pcs' },
  { item: 'fan_heater', ua: 'Тепловентилятор', en: 'Fan heater', unitUa: 'шт', unitEn: 'pcs' },
  {
    item: 'solid_fuel_stove',
    ua: 'Твердопаливна піч',
    en: 'Solid-fuel stove',
    unitUa: 'шт',
    unitEn: 'pcs',
  },
  { item: 'potbelly_stove', ua: 'Буржуйка', en: 'Potbelly stove', unitUa: 'шт', unitEn: 'pcs' },
  { item: 'gas_heater', ua: 'Газовий обігрівач', en: 'Gas heater', unitUa: 'шт', unitEn: 'pcs' },
];

export type HeatingRepairItem =
  | 'boiler'
  | 'heat_networks'
  | 'pumps'
  | 'heat_substation'
  | 'water_heating_equipment';

export const HEATING_REPAIR_ITEMS: readonly NeedItemDef<HeatingRepairItem>[] = [
  {
    item: 'boiler',
    ua: 'Заміна / ремонт котла',
    en: 'Boiler replacement / repair',
    unitUa: 'шт',
    unitEn: 'pcs',
  },
  { item: 'heat_networks', ua: 'Теплові мережі', en: 'Heat networks', unitUa: 'м', unitEn: 'm' },
  { item: 'pumps', ua: 'Насоси', en: 'Pumps', unitUa: 'шт', unitEn: 'pcs' },
  {
    item: 'heat_substation',
    ua: 'ІТП (індивідуальний тепловий пункт)',
    en: 'Individual heating substation',
    unitUa: 'шт',
    unitEn: 'pcs',
  },
  {
    item: 'water_heating_equipment',
    ua: 'Бойлерне обладнання',
    en: 'Water-heating equipment',
    unitUa: 'шт',
    unitEn: 'pcs',
  },
];

export type InsulationItem = 'windows' | 'doors' | 'roof' | 'facade';

export const INSULATION_ITEMS: readonly NeedItemDef<InsulationItem>[] = [
  { item: 'windows', ua: 'Вікна', en: 'Windows', unitUa: 'шт', unitEn: 'pcs' },
  { item: 'doors', ua: 'Двері', en: 'Doors', unitUa: 'шт', unitEn: 'pcs' },
  { item: 'roof', ua: 'Покрівля', en: 'Roof', unitUa: 'м²', unitEn: 'm²' },
  {
    item: 'facade',
    ua: 'Утеплення фасаду / горища',
    en: 'Facade / attic insulation',
    unitUa: 'м²',
    unitEn: 'm²',
  },
];

export type ResiliencePointItem =
  | 'generator'
  | 'heating'
  | 'furniture'
  | 'water_boiler'
  | 'connectivity'
  | 'powerbanks'
  | 'other';

export const RESILIENCE_POINT_ITEMS: readonly NeedItemDef<ResiliencePointItem>[] = [
  { item: 'generator', ua: 'Генератор', en: 'Generator', unitUa: 'шт', unitEn: 'pcs' },
  { item: 'heating', ua: 'Обігрів', en: 'Heating', unitUa: 'компл.', unitEn: 'sets' },
  {
    item: 'furniture',
    ua: 'Меблі / спальні місця',
    en: 'Furniture / sleeping places',
    unitUa: 'компл.',
    unitEn: 'sets',
  },
  {
    item: 'water_boiler',
    ua: 'Бойлер / термопоти',
    en: 'Water boiler / thermopots',
    unitUa: 'шт',
    unitEn: 'pcs',
  },
  {
    item: 'connectivity',
    ua: 'Зв’язок / Starlink',
    en: 'Connectivity / Starlink',
    unitUa: 'компл.',
    unitEn: 'sets',
  },
  { item: 'powerbanks', ua: 'Павербанки', en: 'Powerbanks', unitUa: 'шт', unitEn: 'pcs' },
  // NEED_ITEM_UNITS['other'] is null → no quantity field, free-text `details`.
  { item: 'other', ua: 'Інше', en: 'Other', unitUa: null, unitEn: null },
];

export type WinterNfiItem =
  | 'blankets'
  | 'sleeping_bags'
  | 'thermal_underwear'
  | 'warm_clothing'
  | 'thermoses'
  | 'powerbanks'
  | 'flashlights';

export const WINTER_NFI_ITEMS: readonly NeedItemDef<WinterNfiItem>[] = [
  { item: 'blankets', ua: 'Ковдри', en: 'Blankets', unitUa: 'шт', unitEn: 'pcs' },
  { item: 'sleeping_bags', ua: 'Спальники', en: 'Sleeping bags', unitUa: 'шт', unitEn: 'pcs' },
  {
    item: 'thermal_underwear',
    ua: 'Термобілизна',
    en: 'Thermal underwear',
    unitUa: 'компл.',
    unitEn: 'sets',
  },
  {
    item: 'warm_clothing',
    ua: 'Теплий одяг',
    en: 'Warm clothing',
    unitUa: 'компл.',
    unitEn: 'sets',
  },
  { item: 'thermoses', ua: 'Термоси', en: 'Thermoses', unitUa: 'шт', unitEn: 'pcs' },
  { item: 'powerbanks', ua: 'Павербанки', en: 'Powerbanks', unitUa: 'шт', unitEn: 'pcs' },
  { item: 'flashlights', ua: 'Ліхтарі', en: 'Flashlights', unitUa: 'шт', unitEn: 'pcs' },
];

/** liquid_fuel: the fuel type IS the row `item`; litres/month is its quantity. */
export type LiquidFuelItem = 'diesel' | 'petrol' | 'lpg';

export const LIQUID_FUEL_ITEM_OPTIONS: readonly LabeledOption<LiquidFuelItem>[] = [
  { value: 'diesel', ua: 'Дизель', en: 'Diesel' },
  { value: 'petrol', ua: 'Бензин', en: 'Petrol' },
  { value: 'lpg', ua: 'Газ (LPG)', en: 'LPG' },
];

// ── Крок 3: generators ──

export type GeneratorFuelType = 'diesel' | 'petrol' | 'gas';

export const GENERATOR_FUEL_TYPE_OPTIONS: readonly LabeledOption<GeneratorFuelType>[] = [
  { value: 'diesel', ua: 'Дизель', en: 'Diesel' },
  { value: 'petrol', ua: 'Бензин', en: 'Petrol' },
  { value: 'gas', ua: 'Газ', en: 'Gas' },
];

export type GeneratorPurpose =
  | 'boiler_house'
  | 'water_utility'
  | 'resilience_point'
  | 'facility'
  | 'other';

export const GENERATOR_PURPOSE_OPTIONS: readonly LabeledOption<GeneratorPurpose>[] = [
  { value: 'boiler_house', ua: 'Котельня', en: 'Boiler house' },
  { value: 'water_utility', ua: 'Водоканал', en: 'Water utility' },
  { value: 'resilience_point', ua: 'Пункт незламності', en: 'Resilience point' },
  { value: 'facility', ua: 'Заклад', en: 'Facility' },
  { value: 'other', ua: 'Інше', en: 'Other' },
];

/** Only `generators` may repeat an item — one row per power rating. */
export const GENERATOR_ROWS_MAX = 5;

export type ResiliencePointStatus = 'operational' | 'planned';

export const RESILIENCE_POINT_STATUS_OPTIONS: readonly LabeledOption<ResiliencePointStatus>[] = [
  { value: 'operational', ua: 'Діючий', en: 'Operational' },
  { value: 'planned', ua: 'Планується', en: 'Planned' },
];

// ── Крок 5: budget & coordination ──

export type NeedByOption = 'by_october' | 'by_november' | 'by_december' | 'during_season';

export const NEED_BY_OPTIONS: readonly LabeledOption<NeedByOption>[] = [
  { value: 'by_october', ua: 'До 1 жовтня', en: 'By 1 October' },
  { value: 'by_november', ua: 'До 1 листопада', en: 'By 1 November' },
  { value: 'by_december', ua: 'До 1 грудня', en: 'By 1 December' },
  { value: 'during_season', ua: 'Протягом сезону', en: 'During the season' },
];

export type WinterizationUrgency = 'critical' | 'high' | 'medium';

export const URGENCY_OPTIONS: readonly LabeledOption<WinterizationUrgency>[] = [
  { value: 'critical', ua: 'Критична', en: 'Critical' },
  { value: 'high', ua: 'Висока', en: 'High' },
  { value: 'medium', ua: 'Середня', en: 'Medium' },
];

export type WinterizationCostBasis =
  | 'cost_estimate'
  | 'price_offer'
  | 'expert_assessment'
  | 'applicant_estimate';

export const COST_BASIS_OPTIONS: readonly LabeledOption<WinterizationCostBasis>[] = [
  { value: 'cost_estimate', ua: 'Кошторис', en: 'Cost estimate' },
  { value: 'price_offer', ua: 'Комерційна пропозиція / прайс', en: 'Price offer / quotation' },
  { value: 'expert_assessment', ua: 'Експертна оцінка', en: 'Expert assessment' },
  {
    value: 'applicant_estimate',
    ua: 'Попередня оцінка заявника',
    en: 'Applicant preliminary estimate',
  },
];

export type WinterizationCofinancing = 'yes' | 'no' | 'partial';

export const COFINANCING_OPTIONS: readonly LabeledOption<WinterizationCofinancing>[] = [
  { value: 'yes', ua: 'Так', en: 'Yes' },
  { value: 'no', ua: 'Ні', en: 'No' },
  { value: 'partial', ua: 'Частково', en: 'Partially' },
];

export type LogisticsOption = 'own_transport' | 'storage' | 'staff_for_unloading' | 'none';

export const LOGISTICS_OPTIONS: readonly LabeledOption<LogisticsOption>[] = [
  {
    value: 'own_transport',
    ua: 'Власний транспорт (самовивіз)',
    en: 'Own transport (self-pickup)',
  },
  { value: 'storage', ua: 'Склад для зберігання', en: 'Storage warehouse' },
  {
    value: 'staff_for_unloading',
    ua: 'Персонал для розвантаження / монтажу',
    en: 'Staff for unloading / installation',
  },
  { value: 'none', ua: 'Нічого з переліченого', en: 'None of the above' },
];

export type WinterizationDocsOption =
  | 'guarantee_letter'
  | 'council_decision'
  | 'survey_act'
  | 'defect_act'
  | 'cost_estimate'
  | 'tech_specs'
  | 'none';

export const DOCS_AVAILABLE_OPTIONS: readonly LabeledOption<WinterizationDocsOption>[] = [
  {
    value: 'guarantee_letter',
    ua: 'Гарантійний лист ОМС',
    en: 'Guarantee letter from the local authority',
  },
  {
    value: 'council_decision',
    ua: 'Рішення виконкому / сесії',
    en: 'Executive committee / council decision',
  },
  { value: 'survey_act', ua: 'Акт обстеження', en: 'Survey act' },
  { value: 'defect_act', ua: 'Дефектний акт', en: 'Defect act' },
  {
    value: 'cost_estimate',
    ua: 'Кошторис / комерційна пропозиція',
    en: 'Cost estimate / price offer',
  },
  { value: 'tech_specs', ua: 'Технічні специфікації', en: 'Technical specifications' },
  { value: 'none', ua: 'Відсутні', en: 'None' },
];

// ── Submit payload (mirrors CreateWinterizationFormDto) ──

/**
 * One specification row. `unit` is sent ONLY for solid_fuel — everywhere else
 * the server derives it from NEED_ITEM_UNITS and ignores the client value.
 * `powerKw`/`fuelType`/`purpose` are meaningful only on `generators` rows (the
 * server nulls them elsewhere).
 */
export interface WinterizationNeedPayload {
  category: NeedCategory;
  item: NeedItem;
  quantity?: number;
  unit?: NeedUnit;
  powerKw?: number;
  fuelType?: GeneratorFuelType;
  purpose?: GeneratorPurpose;
  details?: string;
  sortOrder?: number;
}

export interface WinterizationAttachmentPayload {
  s3Key: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  sortOrder?: number;
}

export interface CreateWinterizationFormPayload {
  applicantType: WinterizationApplicantType;
  organizationName: string;
  edrpou?: string;

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
  contactPosition?: string;
  phone: string;
  email: string;
  messenger?: string;
  altContactName?: string;
  altContactPhone?: string;
  website?: string;

  // Крок 2а — institution
  facilityName?: string;
  facilityKind?: FacilityKind;
  facilityKindOther?: string;
  streetAddress?: string;
  heatingSource?: HeatingSource;
  heatingSourceOther?: string;
  heatedArea?: number;
  backupPower?: BackupPowerOption;
  buildingCondition?: BuildingCondition;

  // Крок 2б — municipality
  populationTotal?: number;
  settlementsCovered?: number;
  frontlineStatus?: FrontlineStatus;
  targetFacilities?: string;

  // Крок 3 — needs
  needCategories?: NeedCategory[];
  needCategoryOther?: string;
  situationDescription?: string;
  needs?: WinterizationNeedPayload[];
  solidFuelBoilerCount?: number;
  solidFuelStorageAvailable?: boolean;
  heatingRepairDescription?: string;
  resiliencePointStatus?: ResiliencePointStatus;
  resiliencePointCapacity?: number;
  liquidFuelMonthsNeeded?: number;

  // Крок 4 — beneficiaries
  directBeneficiaries?: number;
  idpCount?: number;
  childrenCount?: number;
  pwdCount?: number;
  elderlyCount?: number;
  femaleCount?: number;
  maleCount?: number;
  indirectBeneficiaries?: number;
  staffCount?: number;

  // Крок 5 — budget & coordination
  needBy: NeedByOption;
  urgency: WinterizationUrgency;
  estimatedCost?: number;
  costBasis?: WinterizationCostBasis;
  otherDonors: boolean;
  otherDonorsDetails?: string;
  cofinancing?: WinterizationCofinancing;
  cofinancingDetails?: string;
  logistics?: LogisticsOption[];
  docsAvailable?: WinterizationDocsOption[];
  cloudLink?: string;

  // Крок 6/7 — files & consent
  photos?: WinterizationAttachmentPayload[];
  documents?: WinterizationAttachmentPayload[];
  consentGiven: boolean;
}

/**
 * Data portion produced by PR-W2 (steps 1–5). Files (photos/documents/cloudLink)
 * and consent are added in PR-W3 together with steps 6–7 and the submit flow.
 */
export type WinterizationDataPayload = Omit<
  CreateWinterizationFormPayload,
  'photos' | 'documents' | 'cloudLink' | 'consentGiven'
>;

/** localStorage draft envelope (files are never persisted). */
export interface WinterizationDraft {
  version: 1;
  savedAt: number;
  value: Record<string, unknown>;
}
