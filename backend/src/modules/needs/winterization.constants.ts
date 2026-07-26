// === ADDED: PR-W1 Winterization form — shared option catalogs ===
// («Підготовка до зими» / Winterization Needs Assessment)
//
// Same storage philosophy as recovery.constants.ts: option values are stored as
// varchar / text[] in Postgres (NOT pg enums), so adding a value is a DTO-level
// change with no ALTER TYPE migration.
// Reference: docs/forms/Winterization/implementation-plan.md §2–§4.

/**
 * Крок 0 / ТЗ «Тип заявника».
 *
 * `household` is DESIGNED and persisted end-to-end, but gated OFF at launch:
 * WinterizationService rejects it with 422 unless
 * WINTERIZATION_HOUSEHOLD_ENABLED === 'true' (implementation-plan §7).
 * Direct assistance to individuals carries extra Ukrainian tax-reporting
 * obligations, so enabling it is a management decision, not a code change.
 */
export const WINTERIZATION_APPLICANT_TYPES = [
  'municipality', // ОМС / громада — «об'єкт» заявки = громада
  'institution', // заклад / інституція — об'єкт = конкретний заклад
  'household', // домогосподарство / фізична особа (DISABLED at launch)
] as const;
export type WinterizationApplicantType =
  (typeof WINTERIZATION_APPLICANT_TYPES)[number];

// ── Крок 2а: institution scenario (ТЗ Сценарій Б) ──

/** Facility kind — drives cluster attribution (Education / Health / SNFI). */
export const FACILITY_KINDS = [
  'education', // заклад освіти (школа / садок)
  'healthcare', // заклад охорони здоров'я
  'idp_collective_site', // МКП / МТП ВПО
  'resilience_center', // пункт незламності
  'municipal_building', // адмінбудівля ОМС
  'social_facility', // ЦНАП, терцентр, інший соціальний заклад
  'utility_boiler', // котельня / комунальне підприємство
  'other',
] as const;
export type FacilityKind = (typeof FACILITY_KINDS)[number];

/**
 * Primary heating source. Donor-critical: Shelter Cluster splits winter energy
 * support into SN201A (utility-based heating → cash for utilities) and SN201B
 * (solid-fuel heating → fuel in kind / cash), so this field decides which
 * modality is even applicable.
 */
export const HEATING_SOURCES = [
  'district', // централізоване
  'autonomous_gas', // автономна котельня (газ)
  'autonomous_solid_fuel', // автономна котельня (тверде паливо)
  'electric',
  'stove', // пічне
  'none', // опалення відсутнє
  'other',
] as const;
export type HeatingSource = (typeof HEATING_SOURCES)[number];

/** Justifies a generator request (UNICEF: inverters/generators for boiler houses). */
export const BACKUP_POWER_OPTIONS = [
  'sufficient',
  'insufficient',
  'none',
] as const;
export type BackupPowerOption = (typeof BACKUP_POWER_OPTIONS)[number];

/** Thermal-envelope screening for the `insulation` category. */
export const BUILDING_CONDITIONS = [
  'satisfactory',
  'partial_repair_needed',
  'unsatisfactory',
] as const;
export type BuildingCondition = (typeof BUILDING_CONDITIONS)[number];

// ── Крок 2б: municipality scenario ──

/** Targeting narrative for UHF / ECHO / UNICEF (frontline hromadas first). */
export const FRONTLINE_STATUSES = [
  'frontline', // прифронтова (<30 км)
  'deoccupied',
  'idp_hosting', // приймає значну кількість ВПО
  'rear', // тилова
] as const;
export type FrontlineStatus = (typeof FRONTLINE_STATUSES)[number];

// ── Крок 3: winterization needs ──

/**
 * Need categories. Each selected category unlocks its own spec block, whose
 * item-level quantities become winterization_form_needs rows.
 *
 * NOTE: `municipal_equipment` («комунальна спецтехніка», ТЗ Сценарій А) is
 * intentionally ABSENT — dropped by decision of 2026-07-26: winterization donor
 * lines effectively do not fund it, so collecting the demand signal was not
 * worth the extra block.
 */
export const NEED_CATEGORIES = [
  'generators', // генератори / резервне живлення
  'solid_fuel', // вугілля, пелети, дрова, брикети
  'heating_appliances', // обігрівачі та опалювальні прилади
  'heating_system_repair', // ремонт/модернізація тепло-/водопостачання
  'insulation', // утеплення (вікна, двері, покрівля, фасад)
  'resilience_point_equipment', // обладнання Пункту Незламності
  'winter_nfi', // ковдри, спальники, термобілизна, павербанки…
  'liquid_fuel', // пальне для генераторів
  'utilities_cash', // SN201A — household-only modality
  'other',
] as const;
export type NeedCategory = (typeof NEED_CATEGORIES)[number];

/**
 * Which categories each applicant type may request — the UI catalog AND the
 * server-side guard (an institution cannot ask for SN201A cash-for-utilities;
 * a household cannot ask for boiler-house repairs).
 */
export const NEED_CATEGORIES_BY_APPLICANT_TYPE: Record<
  WinterizationApplicantType,
  readonly NeedCategory[]
> = {
  municipality: [
    'generators',
    'solid_fuel',
    'heating_appliances',
    'heating_system_repair',
    'insulation',
    'resilience_point_equipment',
    'winter_nfi',
    'liquid_fuel',
    'other',
  ],
  institution: [
    'generators',
    'solid_fuel',
    'heating_appliances',
    'heating_system_repair',
    'insulation',
    'resilience_point_equipment',
    'winter_nfi',
    'liquid_fuel',
    'other',
  ],
  household: [
    'solid_fuel',
    'heating_appliances',
    'winter_nfi',
    'utilities_cash',
  ],
};

/** Flat catalog of every requestable item (DTO `IsIn`). */
export const NEED_ITEMS = [
  // generators / resilience point
  'generator',
  // solid fuel
  'coal',
  'pellets',
  'firewood',
  'briquettes',
  // heating appliances
  'convector',
  'oil_heater',
  'fan_heater',
  'solid_fuel_stove',
  'potbelly_stove',
  'gas_heater',
  // heating system repair
  'boiler',
  'heat_networks',
  'pumps',
  'heat_substation',
  'water_heating_equipment',
  // insulation
  'windows',
  'doors',
  'roof',
  'facade',
  // resilience point equipment
  'heating',
  'furniture',
  'water_boiler',
  'connectivity',
  'powerbanks',
  'other',
  // winter NFI
  'blankets',
  'sleeping_bags',
  'thermal_underwear',
  'warm_clothing',
  'thermoses',
  'flashlights',
  // liquid fuel
  'diesel',
  'petrol',
  'lpg',
] as const;
export type NeedItem = (typeof NEED_ITEMS)[number];

/** Item allowlist per category — cross-field rule enforced in the service. */
export const NEED_ITEMS_BY_CATEGORY: Record<NeedCategory, readonly NeedItem[]> =
  {
    generators: ['generator'],
    solid_fuel: ['coal', 'pellets', 'firewood', 'briquettes'],
    heating_appliances: [
      'convector',
      'oil_heater',
      'fan_heater',
      'solid_fuel_stove',
      'potbelly_stove',
      'gas_heater',
    ],
    heating_system_repair: [
      'boiler',
      'heat_networks',
      'pumps',
      'heat_substation',
      'water_heating_equipment',
    ],
    insulation: ['windows', 'doors', 'roof', 'facade'],
    resilience_point_equipment: [
      'generator',
      'heating',
      'furniture',
      'water_boiler',
      'connectivity',
      'powerbanks',
      'other',
    ],
    winter_nfi: [
      'blankets',
      'sleeping_bags',
      'thermal_underwear',
      'warm_clothing',
      'thermoses',
      'powerbanks',
      'flashlights',
    ],
    liquid_fuel: ['diesel', 'petrol', 'lpg'],
    utilities_cash: [],
    other: [],
  };

export const NEED_UNITS = ['t', 'm3', 'pcs', 'm', 'm2', 'l', 'set'] as const;
export type NeedUnit = (typeof NEED_UNITS)[number];

/** Solid fuel is the one category where the applicant legitimately chooses the unit. */
export const SOLID_FUEL_UNITS = ['t', 'm3'] as const;

/**
 * Default measurement unit per item — snapshotted server-side, exactly like
 * DAMAGE_ELEMENT_UNITS in recovery.constants.ts. `null` = quantity is a plain
 * count with no meaningful unit.
 */
export const NEED_ITEM_UNITS: Record<NeedItem, NeedUnit | null> = {
  generator: 'pcs',
  coal: 't',
  pellets: 't',
  firewood: 'm3',
  briquettes: 't',
  convector: 'pcs',
  oil_heater: 'pcs',
  fan_heater: 'pcs',
  solid_fuel_stove: 'pcs',
  potbelly_stove: 'pcs',
  gas_heater: 'pcs',
  boiler: 'pcs',
  heat_networks: 'm',
  pumps: 'pcs',
  heat_substation: 'pcs',
  water_heating_equipment: 'pcs',
  windows: 'pcs',
  doors: 'pcs',
  roof: 'm2',
  facade: 'm2',
  heating: 'set',
  furniture: 'set',
  water_boiler: 'pcs',
  connectivity: 'set',
  powerbanks: 'pcs',
  other: null,
  blankets: 'pcs',
  sleeping_bags: 'pcs',
  thermal_underwear: 'set',
  warm_clothing: 'set',
  thermoses: 'pcs',
  flashlights: 'pcs',
  diesel: 'l',
  petrol: 'l',
  lpg: 'l',
};

/**
 * Per-category [M-if] minimums (implementation-plan §2, крок 3).
 *
 *  requiresRows     — the category must contribute ≥1 winterization_form_needs row.
 *  requiresQuantity — at least one of those rows must carry a quantity. Only for
 *                     categories where a quantity-less line is meaningless and
 *                     un-budgetable («вугілля» без тоннажу, генератор без к-сті,
 *                     пальне без літрів).
 */
export const NEED_CATEGORY_RULES: Record<
  NeedCategory,
  { requiresRows: boolean; requiresQuantity: boolean }
> = {
  generators: { requiresRows: true, requiresQuantity: true },
  solid_fuel: { requiresRows: true, requiresQuantity: true },
  heating_appliances: { requiresRows: true, requiresQuantity: false },
  heating_system_repair: { requiresRows: true, requiresQuantity: false },
  insulation: { requiresRows: true, requiresQuantity: false },
  resilience_point_equipment: { requiresRows: true, requiresQuantity: false },
  winter_nfi: { requiresRows: true, requiresQuantity: false },
  liquid_fuel: { requiresRows: true, requiresQuantity: true },
  // free-text only (needCategoryOther) / single-modality cash — no item rows.
  utilities_cash: { requiresRows: false, requiresQuantity: false },
  other: { requiresRows: false, requiresQuantity: false },
};

/**
 * `generators` is the ONLY category allowed to repeat an item — one row per
 * power rating (2×10 kW + 1×60 kW is a normal request). Everywhere else a
 * repeated (category, item) pair means a client bug or a double submit.
 */
export const REPEATABLE_ITEM_CATEGORIES: readonly NeedCategory[] = [
  'generators',
];
export const GENERATOR_ROWS_MAX = 5;
/** Hard cap on the whole spec (sum of every category) — anti-abuse. */
export const NEEDS_ROWS_MAX = 40;

export const GENERATOR_FUEL_TYPES = ['diesel', 'petrol', 'gas'] as const;
export type GeneratorFuelType = (typeof GENERATOR_FUEL_TYPES)[number];

/** What the generator powers — decides whether it is CI support or facility-level. */
export const GENERATOR_PURPOSES = [
  'boiler_house',
  'water_utility',
  'resilience_point',
  'facility',
  'other',
] as const;
export type GeneratorPurpose = (typeof GENERATOR_PURPOSES)[number];

export const RESILIENCE_POINT_STATUSES = ['operational', 'planned'] as const;
export type ResiliencePointStatus = (typeof RESILIENCE_POINT_STATUSES)[number];

// ── Крок 5: budget & coordination ──

/**
 * Deadline buckets. Donor-critical: SN201B expects solid fuel to be delivered
 * before October; a March delivery is reported as an incomplete season.
 */
export const NEED_BY_OPTIONS = [
  'by_october',
  'by_november',
  'by_december',
  'during_season',
] as const;
export type NeedByOption = (typeof NEED_BY_OPTIONS)[number];

export const WINTERIZATION_URGENCY_OPTIONS = [
  'critical',
  'high',
  'medium',
] as const;
export type WinterizationUrgency =
  (typeof WINTERIZATION_URGENCY_OPTIONS)[number];

/** Trust level of `estimatedCost` when the applicant provided one. */
export const WINTERIZATION_COST_BASIS_OPTIONS = [
  'cost_estimate', // кошторис
  'price_offer', // комерційна пропозиція / прайс
  'expert_assessment',
  'applicant_estimate', // попередня оцінка заявника
] as const;
export type WinterizationCostBasis =
  (typeof WINTERIZATION_COST_BASIS_OPTIONS)[number];

export const WINTERIZATION_COFINANCING_OPTIONS = [
  'yes',
  'no',
  'partial',
] as const;
export type WinterizationCofinancing =
  (typeof WINTERIZATION_COFINANCING_OPTIONS)[number];

/** SN201B: transport is a material share of solid-fuel cost; storage is a precondition. */
export const LOGISTICS_OPTIONS = [
  'own_transport',
  'storage',
  'staff_for_unloading',
  'none',
] as const;
export type LogisticsOption = (typeof LOGISTICS_OPTIONS)[number];

export const WINTERIZATION_DOCS_OPTIONS = [
  'guarantee_letter', // гарантійний лист ОМС
  'council_decision', // рішення виконкому / сесії
  'survey_act', // акт обстеження
  'defect_act',
  'cost_estimate', // кошторис / КП
  'tech_specs',
  'none',
] as const;
export type WinterizationDocsOption =
  (typeof WINTERIZATION_DOCS_OPTIONS)[number];

// ── §7: household scenario (designed, disabled) ──

export const HOUSEHOLD_VULNERABILITIES = [
  'idp',
  'disability',
  'large_family',
  'single_pensioner',
  'fallen_defender_family',
  'damaged_housing',
] as const;
export type HouseholdVulnerability = (typeof HOUSEHOLD_VULNERABILITIES)[number];

export const HOUSEHOLD_HEATING_TYPES = [
  'stove',
  'individual_gas',
  'electric',
  'district',
  'other',
] as const;
export type HouseholdHeatingType = (typeof HOUSEHOLD_HEATING_TYPES)[number];

export const HOUSEHOLD_CRITICAL_NEEDS = [
  'solid_fuel',
  'heater_powerbank',
  'winter_kit',
  'utilities_cash',
] as const;
export type HouseholdCriticalNeed = (typeof HOUSEHOLD_CRITICAL_NEEDS)[number];

/**
 * hhCriticalNeed → needCategories. Derived server-side so that reporting and
 * XLSX stay uniform across applicant types (a household never fills the
 * category checkboxes; it picks one critical need).
 */
export const HOUSEHOLD_NEED_CATEGORY_MAP: Record<
  HouseholdCriticalNeed,
  NeedCategory
> = {
  solid_fuel: 'solid_fuel',
  heater_powerbank: 'heating_appliances',
  winter_kit: 'winter_nfi',
  utilities_cash: 'utilities_cash',
};

/** Env flag gating household submissions (see WinterizationService). */
export const HOUSEHOLD_ENABLED_ENV = 'WINTERIZATION_HOUSEHOLD_ENABLED';

// ── Attachments / form identity ──

/** form_type discriminator used by the shared needs_* tables. */
export const WINTERIZATION_FORM_TYPE = 'winterization';
/** Tracking number prefix letter: CSD-W-2026-0001. */
export const WINTERIZATION_NUMBER_PREFIX = 'W';
/** Uploaded keys must live under this prefix (guards against foreign S3 keys). */
export const WINTERIZATION_S3_PREFIX = 'media/needs/winterization/';

/**
 * Photos are mandatory (≥3) ONLY for works-type categories, where they are the
 * evidence base for a BoQ (ECHO field verification). A fuel or NFI request is
 * not blocked on photos — nothing meaningful to photograph.
 */
export const PHOTO_REQUIRED_CATEGORIES: readonly NeedCategory[] = [
  'heating_system_repair',
  'insulation',
];
export const WINTERIZATION_PHOTOS_MIN_FOR_WORKS = 3;
export const WINTERIZATION_PHOTOS_MAX = 10;
export const WINTERIZATION_DOCUMENTS_MAX = 5;

// File type/size rules are IDENTICAL to Recovery, so they are re-exported from
// the single source of truth instead of being duplicated here. They are
// enforced in two places: UploadService (presigned POST conditions) and
// WinterizationService.assertValidAttachments (on submit).
export {
  ATTACHMENT_KINDS,
  DOCUMENT_MAX_BYTES,
  DOCUMENT_MIME_TYPES,
  PHOTO_MAX_BYTES,
  PHOTO_MIME_TYPES,
} from './recovery.constants';
export type { AttachmentKind } from './recovery.constants';
