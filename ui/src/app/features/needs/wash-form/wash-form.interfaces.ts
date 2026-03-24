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
  workType: 'new_drilling' | 'repair_cleaning' | 'new_near_existing';
  hasAquiferInfo?: boolean;
  existingDepth?: number;
  existingDebit?: number;
  hasDesignInfo?: boolean;
  hasPassport?: boolean;
  oldLocation?: string;
  expectedFlowRate: number;
  notes?: string;
}

export interface WaterTowerPayload {
  towerType: 'vbr_15' | 'vbr_25' | 'vbr_50' | 'vbr_over_50';
  towerHeight: '8' | '12' | '15' | '18' | '20' | '25' | 'over_25';
  customHeight?: number;
  hasFoundation: boolean;
  isFoundationSuitable: boolean;
  needsFoundationReconstruction: boolean;
  canSelfReconstruct: boolean;
  canProvideCrane: boolean;
  notes?: string;
}

export interface PurificationSystemPayload {
  hasRoom: boolean;
  hasTemperatureControl: boolean;
  hasWaterInletDrainage: boolean;
  hasPowerSupply: boolean;
  canMaintainSystem: boolean;
  willingToProvideWater: boolean;
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
