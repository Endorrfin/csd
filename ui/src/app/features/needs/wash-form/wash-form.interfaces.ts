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
  boreholeDrilling?: BoreholeDrillingPayload;
  waterTower?: WaterTowerPayload;
  purificationSystem?: PurificationSystemPayload;
  items?: Array<{
    equipmentItemId: string;
    quantity: number;
    notes?: string;
  }>;
}

// ── WASH Activities ──

export interface BoreholeDrillingPayload {
  boreholeType: 'sand' | 'artesian';
  expectedFlowRate: number;
  desiredDiameter: number;
  notes?: string;
}

export interface WaterTowerPayload {
  towerType: 'vbr_15' | 'vbr_25' | 'vbr_50' | 'vbr_over_50';
  quantity: number;
  notes?: string;
}

export interface PurificationSystemPayload {
  hasRoom: boolean;
  hasTemperatureControl: boolean;
  hasWaterInletDrainage: boolean;
  hasPowerSupply: boolean;
  notes?: string;
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
