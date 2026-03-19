# TestMind — Changes Summary

This document summarises all major changes made to connect the backend to the real MongoDB database and convert the UI to a light theme.

---

## 1. Real Database Connection

### Problem
The backend was using an in-memory mock database with ~300 fake test documents (FancyPlast 42, Hostacomp G2, etc.).

### What changed

**`backend/db.py`**
- Added `USE_MOCK`, `TESTS_COLLECTION`, `VALUES_COLLECTION`, `ENRICHED_COLLECTION` env vars
- Added `get_tests_collection()`, `get_values_collection()`, `get_enriched_collection()`
- When `USE_MOCK=false`, fails loudly if MongoDB is unreachable (no silent fallback)

**`backend/.env`**
```
MONGO_URI=mongodb://localhost:27017
DB_NAME=txp_clean
TESTS_COLLECTION=_tests
VALUES_COLLECTION=valuecolumns_migrated
ENRICHED_COLLECTION=tests_enriched
USE_MOCK=false
```

### Real database structure (discovered)
| Collection | Docs | Purpose |
|---|---|---|
| `_tests` | 31,099 | Test metadata (material, date, standard, customer, test type) |
| `valuecolumns_migrated` | 5,911,220 | Raw measurement values linked to tests by UUID |
| `unittables_new` | 126 | Unit conversion tables |
| `translations` | 5,817,780 | Parameter name translations |

---

## 2. Schema Mapping Layer (`backend/schema_map.py`)

New file that maps Zwick machine UUIDs to human-readable property names.

- `RESULT_UUID_TO_PROPERTY` — maps result type UUIDs (e.g. `9DB9C049-...` → `max_force_n`)
- `PREFERRED_UNIT_TABLE` — which unit table to use per property (Force for N, Stress for MPa)
- `UNIT_CONVERSIONS` — base SI to display unit factors (Pa → MPa: ×1e-6, fraction → %: ×100)
- `parse_child_id()` — parses `{UUID}-Zwick.Unittable.XXX.{UUID}-Zwick.Unittable.XXX_Value` format
- `get_result_property_name()` — given a childId, returns the property name

### Key discovery: childId format
Values in `valuecolumns_migrated` are linked to tests via:
- `metadata.refId` = test `_id` (string UUID with braces)
- `metadata.childId` = `{ResultUUID}-Zwick.Unittable.Force.{ResultUUID}-Zwick.Unittable.Force_Value`

### Unit conversion
Values are stored in base SI units:
- Stress → Pa (divide by 1,000,000 for MPa)
- Strain → decimal fraction (multiply by 100 for %)
- Force → N (already in Newtons)

---

## 3. Data Access Layer (`backend/data_access.py`)

Replaces all `list(tests_col.find())` calls with efficient, bounded queries.

**Architecture decision: live lookups instead of enrichment**
Instead of pre-joining data into a `tests_enriched` collection, the data access layer:
1. Queries `_tests` directly for all metadata operations (count, distinct, filter, dashboard) — accesses all 31K tests
2. Does live lookups to `valuecolumns_migrated` for result values, using the compound index `(metadata.refId, metadata.childId)` — each lookup ~1ms

| Function | What it does | Collection |
|---|---|---|
| `get_tests_with_results()` | Fetch tests + live value lookup | `_tests` + `valuecolumns_migrated` |
| `get_monthly_aggregation()` | Monthly mean/std via Python after indexed ID lookup | Both |
| `get_stats_aggregation()` | Mean/std/min/max/n for a property | Both |
| `get_test_count()` | `count_documents()` | `_tests` |
| `get_distinct_values()` | `distinct()` with optional filter | `_tests` |
| `get_recent_tests()` | `$sort` + `$limit` on `_parsed_date` | `_tests` |
| `get_daily_counts()` | `$group` by day for sparkline | `_tests` |
| `get_grouped_counts()` | `$group` + count for pie charts | `_tests` |

---

## 4. Date Migration (`backend/scripts/migrate_dates.py`)

28,412 of 31,099 tests now have `TestParametersFlat._parsed_date` as an ISODate field.

Formats handled:
- `DD.MM.YYYY` (standard Zwick format) — 4,830 docs
- `MM/DD/YYYY` — 116 docs
- `DD-MM-YYYY` — 21 docs
- `DD-Mon-YY` (e.g. `03-Jun-25`) — 20 docs
- Single-digit month/day variants

Remaining 2,687 tests have no Date field at all.

---

## 5. MongoDB Indexes (`backend/scripts/create_indexes.py`)

Created on `_tests` and `valuecolumns_migrated`:

```python
# _tests collection
tests.create_index("TestParametersFlat.MATERIAL")
tests.create_index("TestParametersFlat.TYPE_OF_TESTING_STR")
tests.create_index("TestParametersFlat.STANDARD")
tests.create_index("TestParametersFlat.CUSTOMER")
tests.create_index("TestParametersFlat._parsed_date")
tests.create_index([("MATERIAL", 1), ("TYPE_OF_TESTING_STR", 1), ("_parsed_date", -1)])

# valuecolumns_migrated collection
values.create_index("metadata.refId")
values.create_index([("metadata.refId", 1), ("metadata.childId", 1)])  # key compound index
```

---

## 6. All Tools Refactored

All 7 analysis tools updated to use `data_access` functions instead of `list(find())`:

| Tool | Before | After |
|---|---|---|
| `filter_tests` | `list(col.find(query))` | `get_tests_with_results(query, limit=50)` |
| `summarize_material` | `list(col.find(...))` + numpy | `get_stats_aggregation()` per property |
| `trend_analysis` | `list(col.find(...))` + Python grouping | `get_monthly_aggregation()` |
| `boundary_forecast` | `list(col.find(...))` + Python grouping | `get_monthly_aggregation()` |
| `compare_groups` | Two `list(find())` calls | `get_tests_with_results(limit=10000)` each |
| `correlate_properties` | `list(col.find(...))` | `get_tests_with_results(limit=5000)` |
| `check_compliance` | `list(col.find(...))` | `get_stats_aggregation()` + bounded fetch |

---

## 7. Endpoints Refactored (`backend/main.py`)

All 7 endpoints updated:

- `/api/dashboard` — uses `get_test_count()`, `get_distinct_values()`, `get_recent_tests()`, `get_daily_counts()`
- `/api/insights` — uses `trend_analysis` + `boundary_forecast` (already refactored)
- `/api/health-scores` — uses `get_stats_aggregation()` + `get_monthly_aggregation()` per material
- `/api/explore` — default property changed to `max_force_n`, uses `get_monthly_aggregation()` + `get_tests_with_results()`
- `/api/graph-builder` — all chart types use appropriate data_access functions; pie chart excludes unknowns
- `/api/standards` — new endpoint, returns distinct standards with counts and test type inference

---

## 8. Mock Data Disabled

**`backend/precomputed.py`** — completely disabled. Was returning hardcoded responses for FancyPlast/Hostacomp/etc. Now always returns `None` so every query goes through the real LLM + tools pipeline.

---

## 9. Frontend Updated — Light Theme

**`frontend/src/index.css`** — converted from dark (`#0f1117` backgrounds) to light (`#f8fafc` backgrounds).

All 13 component/screen files converted:
- Dark backgrounds → white/slate-50
- Dark borders → slate-200
- Light text on dark → dark text on light
- Alert colours updated (amber-50, red-50 instead of amber-950/30, red-950/30)
- Recharts grid/tooltip updated for light theme

---

## 10. Frontend Mock Materials Removed

All hardcoded mock material names (FancyPlast 42, Hostacomp G2, UltraPlast 99, etc.) replaced with real materials from the database:

Files updated: `Sidebar.jsx`, `StarterPrompts.jsx`, `FilterBar.jsx`, `CommandPalette.jsx`, `ChatThread.jsx`, `ExploreScreen.jsx`, `GraphBuilderScreen.jsx`, `HomeScreen.jsx`, `ResultsPanel.jsx`

Real materials used: Steel, FEP, Spur+ 1015, BEAD WIRE 1.82, UD-TP Tape, PTL

---

## 11. Navigator Sidebar — Test Types

Added "Test Types" section to sidebar (above Materials), open by default:
- Tensile (20,884 tests)
- Compression (8,465 tests)
- Flexure (1,750 tests)

Clicking any navigates to chat with "Show all tensile tests" etc.

---

## 12. Explore Screen — Properties Updated

Default property changed from `tensile_strength_mpa` (no data in real DB) to `max_force_n`.

Properties list updated to match actual result types in the database:
- Max Force (N)
- Young's Modulus (MPa)
- Upper Yield Point (MPa)
- Elongation at Break (%)
- Force at Break (N)
- Work to Max Force (J)

---

## Known Data Limitations

| Material/Issue | Cause |
|---|---|
| **93% of tests have no MATERIAL field** | Field not filled in at time of testing in `txp_clean` |
| **PTL has no property values** | PTL tests are compression type; compression result UUIDs not yet mapped |
| **Steel has only 2/126 elongation values** | Steel tensile tests per ASTM A370 don't report elongation as a scalar Zwick result |
| **FEP has no elongation** | VDE 0250-106 standard doesn't require elongation as a computed result |
| **3 test types only** | `txp_clean` only contains tensile, compression, flexure |
