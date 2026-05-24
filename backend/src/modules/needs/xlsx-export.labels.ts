/**
 * Centralized UA/EN labels for XLSX export.
 * Keeps the export service focused on layout; translation stays in one place.
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

export const STATUS_LABELS: Record<string, [string, string]> = {
  new: ['Нова', 'New'],
  in_review: ['На розгляді', 'In review'],
  approved: ['Затверджено', 'Approved'],
  rejected: ['Відхилено', 'Rejected'],
  in_progress: ['В роботі', 'In progress'],
  completed: ['Завершено', 'Completed'],
};

export const BOREHOLE_WORK_TYPE_LABELS: Record<string, [string, string]> = {
  new_drilling: ['Буріння нової', 'New drilling'],
  repair_cleaning: ['Ремонт (чистка)', 'Repair (cleaning)'],
  new_near_existing: ['Нова поруч з існуючою', 'New near existing'],
};

export const TOWER_TYPE_LABELS: Record<string, [string, string]> = {
  vbr_15: ['ВБР-15 (15 м³)', 'VBR-15 (15 m³)'],
  vbr_25: ['ВБР-25 (25 м³)', 'VBR-25 (25 m³)'],
  vbr_50: ['ВБР-50 (50 м³)', 'VBR-50 (50 m³)'],
  vbr_over_50: ['ВБР понад 50 м³', 'VBR over 50 m³'],
};

export const PUMP_PURPOSE_LABELS: Record<string, [string, string]> = {
  borehole: ['Свердловинний', 'Borehole (submersible)'],
  surface: ['Поверхневий', 'Surface'],
  drainage_sewage: ['Дренажний/фекальний', 'Drainage / sewage'],
  other: ['Інше', 'Other'],
};

export const EQUIPMENT_UNIT_LABELS: Record<string, [string, string]> = {
  pcs: ['шт.', 'pcs'],
  meters: ['м', 'm'],
  kg: ['кг', 'kg'],
};

export function labelStatus(
  key: string | null | undefined,
  lang: Lang,
): string {
  return pick(STATUS_LABELS, key, lang);
}

export function labelBoreholeWorkType(
  key: string | null | undefined,
  lang: Lang,
): string {
  return pick(BOREHOLE_WORK_TYPE_LABELS, key, lang);
}

export function labelTowerType(
  key: string | null | undefined,
  lang: Lang,
): string {
  return pick(TOWER_TYPE_LABELS, key, lang);
}

export function labelPumpPurpose(
  key: string | null | undefined,
  lang: Lang,
): string {
  return pick(PUMP_PURPOSE_LABELS, key, lang);
}

export function labelEquipmentUnit(
  key: string | null | undefined,
  lang: Lang,
): string {
  return pick(EQUIPMENT_UNIT_LABELS, key, lang);
}

/** Boolean → human label. Passthrough for null/undefined. */
export function labelBool(v: boolean | null | undefined, lang: Lang): string {
  if (v === null || v === undefined) return '';
  return v ? (lang === 'ua' ? 'Так' : 'Yes') : lang === 'ua' ? 'Ні' : 'No';
}

/** Tower height — '10' stays '10 m', 'over_25' becomes "Понад 25 м". */
export function labelTowerHeight(
  height: string | null | undefined,
  customHeight: number | null | undefined,
  lang: Lang,
): string {
  if (!height) return '';
  if (height === 'over_25') {
    if (customHeight) return `${customHeight} m`;
    return lang === 'ua' ? 'Понад 25 м' : 'Over 25 m';
  }
  return `${height} m`;
}
