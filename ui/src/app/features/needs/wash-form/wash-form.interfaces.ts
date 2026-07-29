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

// ══════════════════════════════════════════════════════════════
// WASH Activities — arrays of items now (one per array entry).
// ══════════════════════════════════════════════════════════════

export type BoreholeWorkType = 'new_drilling' | 'repair_cleaning' | 'new_near_existing';

export interface CreateBoreholePayload {
  workType: BoreholeWorkType;
  expectedFlowRate: number; // 7–50
  hasAquiferInfo?: boolean;
  existingDepth?: number; // 1–800
  existingDebit?: number; // 1–30
  hasDesignInfo?: boolean;
  hasPassport?: boolean;
  oldLocation?: string;
  notes?: string;
  sortOrder?: number;
}

export type WaterTowerType = 'vbr_15' | 'vbr_25' | 'vbr_50' | 'vbr_over_50';

export type WaterTowerHeight = '8' | '10' | '12' | '15' | '18' | '20' | '25' | 'over_25';

export interface CreateTowerPayload {
  towerType: WaterTowerType;
  towerHeight: WaterTowerHeight;
  customHeight?: number;
  hasFoundation: boolean;
  isFoundationSuitable: boolean;
  needsFoundationReconstruction: boolean;
  canSelfReconstruct: boolean;
  canProvideCrane: boolean;
  notes?: string;
  sortOrder?: number;
}

export interface CreatePurificationPayload {
  hasRoom: boolean;
  hasTemperatureControl: boolean;
  hasWaterInletDrainage: boolean;
  hasPowerSupply: boolean;
  canMaintainSystem: boolean;
  willingToProvideWater: boolean;
  notes?: string;
  sortOrder?: number;
}

// new — pumps section.
export type PumpPurpose = 'borehole' | 'surface' | 'drainage_sewage' | 'other';

export interface CreatePumpPayload {
  purpose: PumpPurpose;
  purposeOther?: string;
  brand?: string;
  model?: string;
  powerKw?: number;
  flowRateM3h?: number;
  headM?: number;
  diameterInches?: number;
  voltage?: string;
  phases?: number;
  quantity: number;
  notes?: string;
  sortOrder?: number;
}

/** Matches backend CreateWashFormDto — child sections are arrays. */
export interface CreateWashFormPayload {
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

  organizationName: string;
  headName: string;
  headPhone: string;
  email: string;
  objectName: string;
  dependentPopulation: number;
  socialFacilities?: string;
  installationDeadline?: string;
  replacementReason: string;

  // arrays replace single-object sections.
  boreholes?: CreateBoreholePayload[];
  towers?: CreateTowerPayload[];
  purifications?: CreatePurificationPayload[];
  pumps?: CreatePumpPayload[];
  items?: {
    equipmentItemId: string;
    quantity: number;
    notes?: string;
    sortOrder?: number;
  }[];
}

// ══════════════════════════════════════════════════════════════
// Label constants (UA/EN) for select options.
// ══════════════════════════════════════════════════════════════

export const PUMP_PURPOSE_LABELS: Record<PumpPurpose, { ua: string; en: string }> = {
  borehole: { ua: 'Свердловинний (глибинний)', en: 'Borehole (submersible)' },
  surface: { ua: 'Поверхневий', en: 'Surface' },
  drainage_sewage: { ua: 'Дренажний / фекальний', en: 'Drainage / sewage' },
  other: { ua: 'Інше', en: 'Other' },
};

/** Unit label helper */
export function getUnitLabel(unit: EquipmentUnit, isUa: boolean): string {
  const labels: Record<EquipmentUnit, { ua: string; en: string }> = {
    pcs: { ua: 'шт.', en: 'pcs' },
    meters: { ua: 'м', en: 'm' },
    kg: { ua: 'кг', en: 'kg' },
  };
  return isUa ? labels[unit].ua : labels[unit].en;
}

// ══════════════════════════════════════════════════════════════
// types for admin detail/edit (Task 7)
// ══════════════════════════════════════════════════════════════

export type WashFormStatus =
  'new' | 'in_review' | 'approved' | 'rejected' | 'in_progress' | 'completed';

export interface WashFormBoreholeFull {
  id: string;
  workType: BoreholeWorkType;
  expectedFlowRate: number;
  hasAquiferInfo: boolean | null;
  existingDepth: number | null;
  existingDebit: number | null;
  hasDesignInfo: boolean | null;
  hasPassport: boolean | null;
  oldLocation: string | null;
  notes: string | null;
  sortOrder: number;
}

export interface WashFormTowerFull {
  id: string;
  towerType: WaterTowerType;
  towerHeight: WaterTowerHeight;
  customHeight: number | null;
  hasFoundation: boolean;
  isFoundationSuitable: boolean;
  needsFoundationReconstruction: boolean;
  canSelfReconstruct: boolean;
  canProvideCrane: boolean;
  notes: string | null;
  sortOrder: number;
}

export interface WashFormPurificationFull {
  id: string;
  hasRoom: boolean;
  hasTemperatureControl: boolean;
  hasWaterInletDrainage: boolean;
  hasPowerSupply: boolean;
  canMaintainSystem: boolean;
  willingToProvideWater: boolean;
  notes: string | null;
  sortOrder: number;
}

export interface WashFormPumpFull {
  id: string;
  purpose: PumpPurpose;
  purposeOther: string | null;
  brand: string | null;
  model: string | null;
  powerKw: number | null;
  flowRateM3h: number | null;
  headM: number | null;
  diameterInches: number | null;
  voltage: string | null;
  phases: number | null;
  quantity: number;
  notes: string | null;
  sortOrder: number;
}

export interface WashFormItemFull {
  id: string;
  equipmentItemId: string;
  quantity: number;
  notes: string | null;
  sortOrder: number;
  equipmentItem?: EquipmentItem & {
    category?: { nameUa: string; nameEn: string };
  };
}

/** Full WashForm as returned by GET /needs-forms/wash/:id */
export interface WashFormDetail {
  id: string;
  region: string;
  regionEn: string;
  district: string;
  districtEn: string;
  community: string;
  communityEn: string;
  communityCode: string;
  settlement: string | null;
  settlementEn: string | null;
  settlementCode: string | null;
  organizationName: string;
  headName: string;
  headPhone: string;
  email: string;
  objectName: string;
  dependentPopulation: number;
  socialFacilities: string | null;
  installationDeadline: string | null;
  replacementReason: string;
  status: WashFormStatus;
  managerNotes: string | null;
  createdAt: string;
  updatedAt: string;
  boreholes: WashFormBoreholeFull[];
  towers: WashFormTowerFull[];
  purifications: WashFormPurificationFull[];
  pumps: WashFormPumpFull[];
  items: WashFormItemFull[];
}

/** Payload for PATCH /needs-forms/wash/:id/full — same shape as create, all optional */
export type UpdateWashFormFullPayload = Partial<CreateWashFormPayload>;
