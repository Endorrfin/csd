/** Matches backend EquipmentUnit enum */
export type EquipmentUnit = 'pcs' | 'meters' | 'kg';

/** Matches backend EquipmentItem entity */
export interface EquipmentItem {
  id: string;
  ltaCode: number;
  nameEn: string;
  nameUa: string;
  unit: EquipmentUnit;
  specifications: string | null;
  sortOrder: number;
  categoryId: string;
}

/** Matches backend EquipmentCategory entity with items */
export interface EquipmentCategory {
  id: string;
  code: string;
  nameEn: string;
  nameUa: string;
  sortOrder: number;
  items: EquipmentItem[];
}

/** Row in the dynamic equipment table (UI-only model) */
export interface SelectedEquipmentRow {
  categoryId: string;
  equipmentItemId: string;
  quantity: number | null;
  notes: string;
}

/** Matches backend CreateWashFormDto */
export interface CreateWashFormPayload {
  region: string;
  organizationName: string;
  headName: string;
  headPhone: string;
  email: string;
  objectName: string;
  dependentPopulation: number;
  socialFacilities?: string;
  installationDeadline?: string;
  replacementReason: string;
  items: Array<{
    equipmentItemId: string;
    quantity: number;
    notes?: string;
  }>;
}

/** Unit label helper */
export function getUnitLabel(unit: EquipmentUnit, isUa: boolean): string {
  const labels: Record<EquipmentUnit, { ua: string; en: string }> = {
    pcs: { ua: 'шт.', en: 'pcs' },
    meters: { ua: 'м', en: 'm' },
    kg: { ua: 'кг', en: 'kg' },
  };
  return isUa ? labels[unit].ua : labels[unit].en;
}
