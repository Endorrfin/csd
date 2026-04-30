#!/usr/bin/env python3
"""
Convert CSD Activity CSV → activities.json for the Activity Map feature.

Usage:
    python convert-activities.py <input.csv> <output.json>

The validation report is printed to stderr.
Sheet row numbers in the report are 1-indexed and match Google Sheets row numbers.
"""

import csv
import json
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Optional, Tuple, List, Dict

# ---------------------------------------------------------------------------
# Config: type mapping, type metadata, categories
# ---------------------------------------------------------------------------

# Maps "Type of intervention" (case-insensitive) → internal typeId
TYPE_MAP: Dict[str, str] = {
    "water tower":                 "water_tower",
    "purification system":         "water_purification",
    "wash facility":               "wash_facility_rehab",
    "pumps":                       "pumps",
    "pipes":                       "pipes",
    "water tank":                  "water_tanks",
    "borehole":                    "borehole_drilling",
    "roof replacement":            "roof_replacement",
    "windows & doors replacement": "windows_doors_replacement",
    "windows replacement":         "windows_replacement",
}

TYPES: Dict[str, dict] = {
    "water_tower": {
        "categoryId": "wash",
        "label": {"uk": "Водонапірна башта", "en": "Water tower"},
        "icon": "water-tower.svg",
        "unit": "pcs",
    },
    "water_purification": {
        "categoryId": "wash",
        "label": {"uk": "Системи очищення води", "en": "Water purification"},
        "icon": "purification-system.svg",
        "unit": "pcs",
    },
    "wash_facility_rehab": {
        "categoryId": "wash",
        "label": {"uk": "Реабілітація WASH-приміщень", "en": "WASH facility rehabilitation"},
        "icon": "wash-facility.svg",
        "unit": "facilities",
    },
    "pumps": {
        "categoryId": "wash",
        "label": {"uk": "Насоси та обладнання", "en": "Pumps & equipment"},
        "icon": "pumps.svg",
        "unit": "pcs",
    },
    "pipes": {
        "categoryId": "wash",
        "label": {"uk": "Труби", "en": "Pipes"},
        "icon": "pipes.svg",  # NOTE: needs to be added to assets/icons/activities
        "unit": "m",
    },
    "water_tanks": {
        "categoryId": "wash",
        "label": {"uk": "Резервуари для води", "en": "Water tanks"},
        "icon": "water-tank.svg",
        "unit": "pcs",
    },
    "borehole_drilling": {
        "categoryId": "wash",
        "label": {"uk": "Буріння свердловин", "en": "Borehole drilling"},
        "icon": "borehole.svg",
        "unit": "pcs",
    },
    "roof_replacement": {
        "categoryId": "recovery",
        "label": {"uk": "Заміна даху", "en": "Roof replacement"},
        "icon": "roof.svg",
        "unit": "facilities",
    },
    "windows_doors_replacement": {
        "categoryId": "recovery",
        "label": {"uk": "Заміна вікон та дверей", "en": "Windows & doors replacement"},
        "icon": "windows_and_doors.svg",
        "unit": "facilities",
    },
    "windows_replacement": {
        "categoryId": "recovery",
        "label": {"uk": "Заміна вікон", "en": "Windows replacement"},
        "icon": "windows.svg",
        "unit": "facilities",
    },
}

CATEGORIES = [
    {"id": "wash",     "label": {"uk": "WASH",        "en": "WASH"}},
    {"id": "recovery", "label": {"uk": "Відновлення", "en": "Recovery"}},
]

# Ukraine bounding box (with small margin)
UA_LAT_MIN, UA_LAT_MAX = 44.0, 53.0
UA_LNG_MIN, UA_LNG_MAX = 22.0, 41.0


# ---------------------------------------------------------------------------
# Cell parsers
# ---------------------------------------------------------------------------

def clean(value: Optional[str]) -> str:
    if value is None:
        return ""
    return value.strip().strip('"').strip()


def parse_int(value: str) -> Optional[int]:
    """Parse '7,200' or '   805 ' → int."""
    v = clean(value).replace(",", "").replace(" ", "")
    if not v:
        return None
    try:
        return int(v)
    except ValueError:
        return None


def parse_date(value: str) -> Tuple[Optional[str], Optional[str]]:
    """Parse M/D/YYYY → 'YYYY-MM'. Returns (parsed, warning)."""
    v = clean(value)
    if not v:
        return None, "empty date"
    for fmt in ("%m/%d/%Y", "%-m/%-d/%Y", "%m/%d/%y"):
        try:
            d = datetime.strptime(v, fmt)
            iso = d.strftime("%Y-%m")
            warning = None
            current_year = datetime.now().year
            if d.year > current_year + 1:
                warning = f"future date {iso} (likely typo)"
            return iso, warning
        except ValueError:
            continue
    return None, f"unparsable date: {v!r}"


# ---------------------------------------------------------------------------
# GPS coordinate parser (handles all observed formats)
# ---------------------------------------------------------------------------

def dms_to_decimal(deg: str, mins: str, secs: str, hemi: str) -> float:
    d = float(deg) + float(mins) / 60 + float(secs or "0") / 3600
    if hemi.upper() in ("S", "W"):
        d = -d
    return d


def parse_gps(value: str) -> Tuple[Optional[float], Optional[float], List[str]]:
    """
    Returns (lat, lng, warnings).
    """
    warnings: List[str] = []
    v = clean(value)
    if not v:
        return None, None, ["empty GPS"]

    # Normalize unicode primes/double-primes to ASCII
    v = v.replace("′", "'").replace("″", '"').replace("''", '"')
    # Some rows have °N instead of "N (typo)
    v = re.sub(r"(\d)°(\s*[NSEW])", r'\1"\2', v)

    # Pattern 1: DMS with N/S/E/W hints (minutes can be decimal: "37°16.607'E")
    dms_pattern = re.compile(
        r"(\d+)\s*°\s*(\d+(?:\.\d+)?)\s*'\s*(\d+(?:\.\d+)?)?\s*\"?\s*([NS])"
        r"[\s,.]*"
        r"(\d+)\s*°\s*(\d+(?:\.\d+)?)\s*'\s*(\d+(?:\.\d+)?)?\s*\"?\s*([EW])",
        re.IGNORECASE,
    )
    m = dms_pattern.search(v)
    if m:
        try:
            lat = dms_to_decimal(m.group(1), m.group(2), m.group(3), m.group(4))
            lng = dms_to_decimal(m.group(5), m.group(6), m.group(7), m.group(8))
            return validate_and_swap(lat, lng, warnings)
        except (ValueError, TypeError):
            pass

    # Pattern 2: Decimal degrees with explicit N/S/E/W
    decimal_ne = re.compile(
        r"(-?\d+\.?\d*)\s*°?\s*([NS])[\s,.]*(-?\d+\.?\d*)\s*°?\s*([EW])",
        re.IGNORECASE,
    )
    m = decimal_ne.search(v)
    if m:
        try:
            lat = float(m.group(1)) * (1 if m.group(2).upper() == "N" else -1)
            lng = float(m.group(3)) * (1 if m.group(4).upper() == "E" else -1)
            return validate_and_swap(lat, lng, warnings)
        except ValueError:
            pass

    # Pattern 3: bare decimals separated by comma/period/space, no hints
    # Strip degree symbols and split
    cleaned = v.replace("°", "")
    nums = re.findall(r"-?\d+\.\d+", cleaned)
    if len(nums) >= 2:
        try:
            return validate_and_swap(float(nums[0]), float(nums[1]), warnings)
        except ValueError:
            pass
    # Fallback: any numbers
    nums_any = re.findall(r"-?\d+\.?\d*", cleaned)
    if len(nums_any) >= 2:
        try:
            return validate_and_swap(float(nums_any[0]), float(nums_any[1]), warnings)
        except ValueError:
            pass

    warnings.append(f"unparsable GPS: {value!r}")
    return None, None, warnings


def validate_and_swap(lat: float, lng: float, warnings: List[str]) -> Tuple[Optional[float], Optional[float], List[str]]:
    """Auto-correct reversed lat/lng. If still wildly out of UA bounds → return None (skip marker)."""
    if not (UA_LAT_MIN <= lat <= UA_LAT_MAX) and (UA_LAT_MIN <= lng <= UA_LAT_MAX):
        warnings.append(f"auto-swapped lat/lng ({lat:.4f}, {lng:.4f}) → ({lng:.4f}, {lat:.4f})")
        lat, lng = lng, lat
    # Hard reject: if either coord is way off (>1000 or NaN), drop it entirely
    if abs(lat) > 90 or abs(lng) > 180:
        warnings.append(f"REJECTED — lat {lat} / lng {lng} out of Earth bounds (will not render on map)")
        return None, None, warnings
    if not (UA_LAT_MIN <= lat <= UA_LAT_MAX):
        warnings.append(f"lat {lat:.4f} outside Ukraine bounds")
    if not (UA_LNG_MIN <= lng <= UA_LNG_MAX):
        warnings.append(f"lng {lng:.4f} outside Ukraine bounds")
    return lat, lng, warnings


# ---------------------------------------------------------------------------
# Helpers: bilingual text, institution type detection, type mapping
# ---------------------------------------------------------------------------

def biling(value: str) -> Optional[dict]:
    """CSV value → {uk, en}. Same value for both on MVP."""
    v = clean(value)
    if not v:
        return None
    return {"uk": v, "en": v}


def detect_institution_type(name: str) -> str:
    n = name.lower()
    if any(k in n for k in ["lyceum", "school", "gymnasium", "preschool", "education", "kindergarten"]):
        return "educational"
    if any(k in n for k in ["hospital", "clinic", "medical", "polyclinic", "ambulatory"]):
        return "medical"
    if any(k in n for k in ["cultural", "house of culture", "library"]):
        return "cultural"
    if any(k in n for k in ["starostynsky", "district"]):
        return "community"
    return "other"


def normalize_type(intervention: str) -> Optional[str]:
    return TYPE_MAP.get(clean(intervention).lower())


# ---------------------------------------------------------------------------
# Main conversion
# ---------------------------------------------------------------------------

def convert(input_path: Path, output_path: Path) -> dict:
    activities = []
    issues: List[Tuple[int, List[str]]] = []
    type_counters: Dict[str, int] = {}

    with input_path.open(encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row_num, row in enumerate(reader, start=2):  # row 1 = header
            errors: List[str] = []

            intervention = clean(row.get("Type of intervention", ""))
            type_id = normalize_type(intervention)
            if not type_id:
                errors.append(f"unknown intervention: {intervention!r}")
                issues.append((row_num, errors))
                continue

            lat, lng, gps_warnings = parse_gps(row.get("GPS coordinates", ""))
            errors.extend(f"GPS: {w}" for w in gps_warnings)

            completed_at, date_warning = parse_date(row.get("Date", ""))
            if date_warning:
                errors.append(f"DATE: {date_warning}")

            institution_name = clean(row.get("Institution", ""))
            institution = None
            if institution_name:
                institution = {
                    "name": biling(institution_name),
                    "type": detect_institution_type(institution_name),
                }

            type_counters[type_id] = type_counters.get(type_id, 0) + 1
            activity = {
                "id": f"{type_id}-{type_counters[type_id]:03d}",
                "typeId": type_id,
                "donor": clean(row.get("Donor", "")) or None,
                "completedAt": completed_at,
                "location": {
                    "region":      biling(row.get("Region", "")),
                    "district":    biling(row.get("District", "")),
                    "community":   biling(row.get("Community", "")),
                    "settlement":  biling(row.get("Settlements", "")),
                    "institution": institution,
                    "coordinates": {"lat": round(lat, 6), "lng": round(lng, 6)} if lat and lng else None,
                },
                "details":       biling(row.get("Details", "")),
                "beneficiaries": parse_int(row.get("# beneficiaries", "")),
                "residents":     parse_int(row.get("# residents", "")),
                "evidenceUrl":   clean(row.get("Evidence", "")) or None,
            }
            activities.append(activity)
            if errors:
                issues.append((row_num, errors))

    output = {
        "version": "1.0",
        "updatedAt": datetime.now().strftime("%Y-%m-%d"),
        "categories": CATEGORIES,
        "types": TYPES,
        "activities": activities,
    }

    output_path.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")

    # Validation report → stderr
    print("\n=== Conversion summary ===", file=sys.stderr)
    print(f"Total activities: {len(activities)}", file=sys.stderr)
    print(f"Rows with warnings: {len(issues)}", file=sys.stderr)
    print(f"\nBy type:", file=sys.stderr)
    for tid, count in sorted(type_counters.items(), key=lambda x: -x[1]):
        print(f"  {tid:30s} {count:3d}", file=sys.stderr)
    if issues:
        print("\n=== Issues by Sheet row ===", file=sys.stderr)
        for row_num, errs in issues:
            print(f"  Row {row_num}: {' | '.join(errs)}", file=sys.stderr)

    return output


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python convert-activities.py <input.csv> <output.json>", file=sys.stderr)
        sys.exit(1)
    convert(Path(sys.argv[1]), Path(sys.argv[2]))
