# TestMind — Features & Engineer Workflow

TestMind is an AI-powered materials testing analysis platform for ZwickRoell test data. It connects directly to the `txp_clean` MongoDB database (31,099 tests, 5.9M measurement values) and lets engineers query, analyse, and visualise test results using natural language.

---

## What's in the Database

| Metric | Value |
|---|---|
| Total tests | 31,099 |
| Tests with material field | 2,215 (72 distinct materials) |
| Test types | Tensile (20,884), Compression (8,465), Flexure (1,750) |
| Standards | 251 distinct |
| Result values | 5.9 million (stored as time-series channels) |
| Date range | 2021 – 2026 |

### Result properties extracted
- **Max Force** (N)
- **Young's Modulus / Tensile Modulus** (MPa)
- **Upper Yield Point** (MPa)
- **Elongation at Break** (%)
- **Force at Break** (N)
- **Work to Max Force** (J)

---

## Engineer Workflow

### 1. Dashboard (Home Screen)

The starting point. Shows at a glance:
- **Tests this week** — how many tests ran in the last 7 days
- **Anomalies flagged** — materials where the latest result is >15% below the 6-month average
- **Materials tracked** — click to browse the 72 materials with data; click any material to summarise it
- **Boundary risks** — materials trending toward a critical threshold
- **Recent Tests table** — the 8 most recent test records
- **Proactive Insights** — AI auto-scans all materials for declining trends or approaching limits, surfaced without the engineer needing to ask
- **Sparkline** — 14-day test activity chart

**Typical use:** An engineer opens the dashboard each morning to see if any new anomalies appeared overnight and check if recent tests are within range.

---

### 2. Chat / Query Interface

The main analysis tool. Type a question in plain English and the AI:
1. Selects the appropriate analysis tool
2. Queries the real database
3. Returns a natural language answer with charts and statistics

**Available analysis tools:**

| Tool | What it answers |
|---|---|
| **filter_tests** | "Show all tensile tests for Steel this year" |
| **summarize_material_properties** | "Summarize all properties for Steel" |
| **compare_groups** | "Compare Steel vs FEP max force" |
| **trend_analysis** | "Is Steel modulus declining?" |
| **boundary_forecast** | "Will Steel modulus drop below 50,000 MPa in the next 2 years?" |
| **correlate_properties** | "Does max force correlate with Young's modulus for Steel?" |
| **check_compliance** | "What % of Steel tests have max force above 200,000 N?" |

**Follow-up questions** are automatically suggested after each answer.

**Bookmarking** — hover over any query to bookmark it; saved queries appear in the sidebar.

---

### 3. Data Explorer

Interactive charting without typing. Select a material and property, see:
- **Stats bar** — n, mean, std dev, min, max
- **Time series chart** — monthly averages with trend line overlay and confidence band
- **Drill-down** — click any month point to see all individual tests for that month
- **Distribution histogram** — value distribution with outlier highlighting (red = >2σ from mean)
- **Individual measurements** — colour-coded dots, each representing one test

**Compare mode** — select a second material to overlay it on the same chart with a side-by-side stats comparison and mean difference indicator.

**Brush control** — drag to zoom into a specific date range.

**Typical use:** An engineer wants to see how Steel max force has evolved over time and compare it against BEAD WIRE 1.82.

---

### 4. Graph Builder

Build custom charts by describing them in plain English. The AI interprets the request and returns a rendered chart.

**Supported chart types:**

| Type | Example prompt |
|---|---|
| **Line** | "Line chart of max force over time for Steel" |
| **Bar** | "Bar chart comparing max force across all materials" |
| **Scatter** | "Scatter plot of max force vs Young's modulus for Steel" |
| **Histogram** | "Histogram of max force distribution" |
| **Pie** | "Pie chart of tests by test type" |

**Incremental editing** — once a chart is built you can refine it:
- "Add FEP to the chart"
- "Remove Steel"
- "Change to bar chart"
- "Show the last 6 months only"

**Export** — download the chart as PNG or SVG.

**Active spec** — the current chart spec is shown (chart type, materials, properties) so engineers always know what they're looking at.

---

### 5. Navigator Sidebar

Quick-access panel on the left:

- **Test Types** (default open) — click Tensile / Compression / Flexure to immediately query all tests of that type
- **Materials** — click any material to summarise its properties
- **Sample Queries** — pre-built queries to get started
- **Recent** — last queries run in this session
- **Saved** — bookmarked queries

The sidebar can be collapsed to give more space to the analysis panels.

---

## How Queries Work (Technical)

```
Engineer types: "Summarize all properties for Steel"
        ↓
POST /api/chat → GPT-4o reads message + 7 tool schemas
        ↓
GPT-4o calls: summarize_material_properties({"material": "Steel"})
        ↓
fuzzy_match_name("Steel", 72 known materials) → "Steel"
        ↓
For each property (max_force_n, tensile_modulus_mpa, ...):
  1. Query _tests for Steel test IDs (126 tests, indexed)
  2. Look up each test's value in valuecolumns_migrated
     using compound index (refId, childId) — ~1ms per test
  3. Compute mean/std/min/max
        ↓
GPT-4o writes natural language answer from the stats
        ↓
GPT-4o generates 3 follow-up question suggestions
        ↓
Frontend renders answer + stats table + follow-ups
```

---

## Data Limitations to Know

| Issue | What it means |
|---|---|
| **93% of tests have no MATERIAL** | `txp_clean` was not consistently filled in. Only 2,215 of 31,099 tests have a material name. Material-based analysis covers only those tests. |
| **PTL, Separator, GDL show no values** | These are compression tests. Compression result UUIDs are different from tensile result UUIDs and are not yet mapped. |
| **FEP has no elongation** | VDE 0250-106 cable standard does not require elongation as a Zwick scalar result. |
| **Steel has only 2 elongation values** | ASTM A370 steel tensile tests typically report max force and modulus, not elongation. |
| **Time series may show only 1–4 months** | Depends on how many tests for that material have a parseable date field. |
| **"unknown" excluded from pie charts** | Tests without a MATERIAL/STANDARD/CUSTOMER field are excluded from pie charts and mentioned in the legend note. |

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `⌘K` | Open command palette — search materials, actions, queries |
| `Enter` | Send query |
| `↑↓` | Navigate autocomplete suggestions |
| `Tab` | Fill in autocomplete suggestion |
| `Esc` | Close command palette |

---

## Running the System

```bash
# Start backend (connects to MongoDB at localhost:27017)
cd testmind/backend
uvicorn main:app --host 0.0.0.0 --port 8000

# Start frontend
cd testmind/frontend
npm run dev
```

Backend runs on **port 8000**, frontend on **port 5173** (or 5174).
MongoDB must be running with the `txp_clean` database accessible at `localhost:27017`.
