# convertors/

Standalone Python scripts that convert source data into JSON assets consumed by
the UI. Run **manually** when the source data changes; the generated output is
committed into `ui/src/assets/data/`. These scripts are **not** part of the
build or CI pipeline.

## convert-activities.py

Converts the CSD activity-map CSV into `activities.json` (the Activity Map feature).

```bash
python3 convert-activities.py csd_activity_map.csv ../ui/src/assets/data/activities.json
```

- Input sample lives here: `csd_activity_map.csv`.
- A validation report (counts by type, row warnings) is printed to **stderr**.

## convert-locations.py

Converts an Excel file of Ukrainian administrative divisions into `locations.json`.

```bash
python3 convert-locations.py <input.xlsx> ../ui/src/assets/data/locations.json
```

- Input is an `.xlsx` file (expected columns documented in the script's header).
- Requires `pandas` plus an Excel engine (e.g. `openpyxl`):
  `pip install pandas openpyxl`.
