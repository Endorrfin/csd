/* ── Hierarchical JSON structure (matches convert-locations.py output) ── */

export interface SettlementRaw {
  en: string;
  ua: string;
  /** code_settlement */
  c: string;
}

export interface CommunityRaw {
  en: string;
  ua: string;
  /** code_community */
  c: string;
  /** settlements */
  s: SettlementRaw[];
}

export interface DistrictRaw {
  en: string;
  ua: string;
  /** communities */
  cm: CommunityRaw[];
}

export interface RegionRaw {
  en: string;
  ua: string;
  /** districts */
  d: DistrictRaw[];
}

/* ── Value emitted by LocationSelectorComponent (ControlValueAccessor) ── */

export interface LocationValue {
  regionUa: string;
  regionEn: string;
  districtUa: string;
  districtEn: string;
  communityUa: string;
  communityEn: string;
  communityCode: string;
  settlementUa: string;
  settlementEn: string;
  settlementCode: string;
}

export const EMPTY_LOCATION: LocationValue = {
  regionUa: '',
  regionEn: '',
  districtUa: '',
  districtEn: '',
  communityUa: '',
  communityEn: '',
  communityCode: '',
  settlementUa: '',
  settlementEn: '',
  settlementCode: '',
};
