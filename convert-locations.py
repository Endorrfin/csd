"""
Convert Excel file with Ukrainian administrative divisions to hierarchical JSON.

Usage:
    python convert-locations.py <input.xlsx> [output.json]

Expected Excel columns:
    region_en, region_ua, district_en, district_ua,
    community_en, community_ua, code_community,
    settlement_en, settlement_ua, code_settlement

Output: ui/src/assets/data/locations.json
"""

import json
import sys

import pandas as pd


def convert_excel_to_json(excel_path: str, output_path: str) -> None:
    df = pd.read_excel(excel_path, dtype={"code_community": str, "code_settlement": str})

    # Strip whitespace from string columns
    str_cols = df.select_dtypes(include=["object"]).columns
    df[str_cols] = df[str_cols].apply(lambda col: col.str.strip())

    regions: list[dict] = []

    for region_ua, region_grp in df.groupby("region_ua", sort=False):
        region_en = region_grp["region_en"].iloc[0]
        districts: list[dict] = []

        for district_ua, district_grp in region_grp.groupby("district_ua", sort=False):
            district_en = district_grp["district_en"].iloc[0]
            communities: list[dict] = []

            for community_ua, comm_grp in district_grp.groupby("community_ua", sort=False):
                community_en = comm_grp["community_en"].iloc[0]
                code_community = str(comm_grp["code_community"].iloc[0])

                settlements = [
                    {
                        "en": row["settlement_en"],
                        "ua": row["settlement_ua"],
                        "c": str(row["code_settlement"]),
                    }
                    for _, row in comm_grp.iterrows()
                ]
                settlements.sort(key=lambda x: x["ua"])

                communities.append(
                    {
                        "en": community_en,
                        "ua": community_ua,
                        "c": code_community,
                        "s": settlements,
                    }
                )

            communities.sort(key=lambda x: x["ua"])
            districts.append({"en": district_en, "ua": district_ua, "cm": communities})

        districts.sort(key=lambda x: x["ua"])
        regions.append({"en": region_en, "ua": region_ua, "d": districts})

    regions.sort(key=lambda x: x["ua"])

    with open(output_path, "w", encoding="utf-8") as f:
        # Compact JSON — saves ~30% size vs pretty-printed
        json.dump(regions, f, ensure_ascii=False, separators=(",", ":"))

    total_settlements = sum(
        len(cm["s"])
        for r in regions
        for d in r["d"]
        for cm in d["cm"]
    )
    total_communities = sum(len(d["cm"]) for r in regions for d in r["d"])
    total_districts = sum(len(r["d"]) for r in regions)

    print(f"✅ Done: {output_path}")
    print(f"   Regions: {len(regions)}")
    print(f"   Districts: {total_districts}")
    print(f"   Communities: {total_communities}")
    print(f"   Settlements: {total_settlements}")


if __name__ == "__main__":
    src = sys.argv[1] if len(sys.argv) > 1 else "locations.xlsx"
    dst = sys.argv[2] if len(sys.argv) > 2 else "ui/src/assets/data/locations.json"
    convert_excel_to_json(src, dst)
