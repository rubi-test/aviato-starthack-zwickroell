Remembering...

```markdown
# ZwickRoell "Chat with Your Test Data" — Claude Code Build Prompt

## Context

You are building a conversational test lab copilot for ZwickRoell called **TestMind**.  
The primary user is a **junior mechanical/QA engineer** who needs to query, compare,  
and analyze material testing data — without waiting for a senior engineer.

The tagline: *"Talking to your data like you talk to a colleague."*

Build this **sequentially** in the order given below. Complete each phase before
moving to the next. At the end of every phase, confirm what was built and what comes next.

For the hackathon demo, prioritize **tensile tests** and **tensile\_\*** properties in the UI
and explanations. Other test types (compression, charpy) can be supported in filters
but don’t need equally rich charts or logic initially.

---

## Tech Stack

- **Backend:** Python 3.11+, FastAPI, fastMCP (MCP server), pymongo, pandas, numpy, scipy
- **Frontend:** React (Vite), Tailwind CSS, Recharts (charts), Axios
- **Database:** MongoDB (local mock for now — swap connection string later)  
  If a real Mongo instance is not available at dev time, you may implement an
  in-memory mock that mimics `pymongo.Collection` for development and testing.
- **AI:** Anthropic Claude API (use a Claude Sonnet model with tool use, e.g. `claude-3.5-sonnet`)
- **No auth required** for hackathon prototype

---

## Phase 0 — Project Scaffold

Create the following directory structure:

```text
testmind/
  backend/
    main.py               # FastAPI app entry point
    mcp_server.py         # fastMCP tool definitions
    db.py                 # MongoDB connection (mock-switchable)
    tools/
      filter_tests.py
      summarize_material.py
      compare_groups.py
      trend_analysis.py
      boundary_forecast.py
    mock_data/
      seed.py             # Generate and insert mock data into local MongoDB
  frontend/
    src/
      App.jsx
      screens/
        HomeScreen.jsx    # Screen 1
        ChatScreen.jsx    # Screen 2
      components/
        MetricCard.jsx
        ChatThread.jsx
        ResultsPanel.jsx
        StatCards.jsx
        ChartArea.jsx
        AuditTrail.jsx
        StarterPrompts.jsx
      api.js              # Axios calls to backend
    index.html
    vite.config.js
  README.md
```

Install all dependencies and confirm the dev servers start (backend on :8000, frontend on :5173).

---

## Phase 1 — Mock Data Layer

### 1A — MongoDB Mock Data Schema

In `backend/mock_data/seed.py`, generate **realistic fake data** matching the
ZwickRoell testXpert III MongoDB schema exactly. Use `pymongo` to insert into
a local MongoDB instance (`mongodb://localhost:27017/testmind_mock`).

If a local Mongo instance is not available, implement a simple in-memory
"mock Mongo" layer with equivalent collections API and use that instead, but keep
the same schemas.

### Collection: `Tests`

Each document must follow this schema:

```json
{
  "_id": "<UUID string>",
  "clientAppType": "testXpert III",
  "state": "finishedOK",
  "tags": ["<tag-uuid>"],
  "version": "2.1772195387.0",
  "valueColumns": [
    {
      "unitTableId": "Zwick.Unittable.Stress",
      "valueTableId": "<uuid>-Zwick.Unittable.Stress",
      "_id": "<uuid>-Zwick.Unittable.Stress_Key",
      "name": "Tensile Strength"
    }
  ],
  "hasMachineConfigurationInfo": false,
  "testProgramId": "TestProgram_1",
  "testProgramVersion": "2.1772195387.0",
  "name": "01",
  "modifiedOn": { "$date": "<ISO timestamp>" },
  "TestParametersFlat": {
    "TYPE_OF_TESTING_STR": "tensile",
    "MACHINE_TYPE_STR": "Static",
    "STANDARD": "DIN EN ISO 527",
    "TESTER": "<tester name>",
    "Date": "<DD.MM.YYYY>",
    "Clock time": "<HH:MM:SS>",
    "CUSTOMER": "<customer name>",
    "MATERIAL": "<material name>",
    "JOB_NO": "<job number>",
    "SPECIMEN_TYPE": "IPS",
    "MACHINE": "<machine name>",
    "SITE": "<site name>",
    "SPECIMEN_THICKNESS": 0.002,
    "SPECIMEN_WIDTH": 0.015,
    "TEST_SPEED": 0.0000333
  }
}
```

### Collection: `ValueColumns`

Each document stores the actual measurement results for a test:

```json
{
  "_id": "<uuid>",
  "timestamp": { "$date": "<ISO timestamp>" },
  "metadata": {
    "refId": "<test _id>",
    "childId": "<valueTableId from test.valueColumns>",
    "fileId": "<uuid>",
    "filename": "<string>",
    "length": 1000
  },
  "uploadDate": { "$date": "<ISO timestamp>" },
  "values": [<array of floats — the measurement series>]
}
```

### Key result fields to embed in `TestParametersFlat`

(these are the computed results per test):

- `tensile_strength_mpa` — float, e.g. 45.2  
- `tensile_modulus_mpa` — float, e.g. 2100.0  
- `elongation_at_break_pct` — float, e.g. 12.4  
- `impact_energy_j` — float (Charpy tests only)  
- `max_force_n` — float  

### Seed the following realistic scenario data

**Materials:** `FancyPlast 42`, `UltraPlast 99`, `Hostacomp G2`, `Stardust`,  
`FancyPlast 84`, `NovaTex 10`

**Customers:** `Empire Industries`, `Megaplant`, `Company_1`, `AlphaGroup`

**Testers:** `Tester_1`, `Tester_2`, `MasterOfDesaster`

**Machines:** `Z05`, `Z20`, `Z100`

**Sites:** `Ulm`, `Kennesaw`

**Test types:** `tensile`, `compression`, `charpy`

**Date range:** 2023-01-01 to 2025-12-31 (spread across ~300 test documents)

**Important patterns to seed:**

1. `Hostacomp G2` tensile strength shows a **declining trend** over 2024–2025  
   (start ~52 MPa, end ~44 MPa — simulate degradation for Q8)

2. `FancyPlast 42` tensile modulus shows a **declining trend** approaching 10 MPa  
   boundary (for Q10 — boundary forecast)

3. `Z05` produces tensile strength ~1.5 MPa higher than `Z20` on average (for Q6)

4. `Ulm` and `Kennesaw` sites produce statistically similar results (for Q7 — comparable)

5. Include at least 20 tests for `Megaplant` across multiple materials (for Q3)

6. Include at least 8 Charpy tests by `MasterOfDesaster` (for Q4)

7. Include compression tests for `Empire Industries` / `Stardust` on specific dates (for Q1)

Generate all data programmatically with controlled randomness (use `random.seed(42)`
for reproducibility). Run `python backend/mock_data/seed.py` to populate the DB.

---

## Phase 2 — Backend API + MCP Tools

### 2A — MongoDB Connection (`backend/db.py`)

```python
# Switchable between mock and live:
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "testmind_mock")
```

When `MONGO_URI` env var is set, it automatically connects to the live DB.  
If not, default to the local/mock DB.

### 2B — MCP Tool Definitions (`backend/mcp_server.py`)

Using `fastMCP`, define these 5 tools. Each tool must return a structured dict
with a `result` key and a `steps` key (the audit trail — what was done):

---

### Tool 1: `filter_tests`

**Purpose:** Search and filter tests by metadata.

**Parameters** (all optional, at least one required):

- `test_type: str` — `"tensile"`, `"compression"`, `"charpy"`
- `customer: str`
- `material: str`
- `tester: str`
- `machine: str`
- `site: str`
- `date: str` — specific date `"DD.MM.YYYY"`
- `date_from: str`, `date_to: str` — date range
- `limit: int` — default 50

**Returns:**

```json
{
  "result": {
    "tests": [
      {
        "id": "...",
        "date": "...",
        "customer": "...",
        "material": "...",
        "test_type": "...",
        "machine": "...",
        "site": "...",
        "tester": "...",
        "tensile_strength_mpa": 45.2,
        "tensile_modulus_mpa": 2100.0
      }
    ],
    "count": 12,
    "summary": { "by_material": {}, "by_test_type": {} }
  },
  "steps": [
    "Filters applied: test_type=tensile, customer=Empire Industries, date=04.05.2023",
    "Queried Tests collection with $match on TestParametersFlat fields",
    "Found 3 matching tests"
  ]
}
```

---

### Tool 2: `summarize_material_properties`

**Purpose:** Statistical summary of all measured properties for a material.

**Parameters:**

- `material: str` (required)

**Returns:**

```json
{
  "result": {
    "material": "FancyPlast 42",
    "properties": [
      {
        "name": "tensile_strength_mpa",
        "n": 34,
        "mean": 47.2,
        "std": 2.1,
        "min": 42.1,
        "max": 51.3
      },
      {
        "name": "tensile_modulus_mpa",
        "n": 34,
        "mean": 2087.0,
        "std": 120.0,
        "min": 1850.0,
        "max": 2300.0
      }
    ],
    "summary_text": "FancyPlast 42 shows consistent tensile strength averaging 47.2 MPa..."
  },
  "steps": []
}
```

---

### Tool 3: `compare_groups`

**Purpose:** Statistical comparison between two groups for a given property.

**Parameters:**

- `group_type: str` — `"material"` | `"machine"` | `"site"`
- `group_a: str`
- `group_b: str`
- `property: str` — `"tensile_strength_mpa"` | `"tensile_modulus_mpa"` | `"impact_energy_j"`
- `date_from: str` (optional)
- `date_to: str` (optional)

**Returns:**

```json
{
  "result": {
    "group_a": { "name": "FancyPlast 42", "mean": 47.2, "std": 2.1, "n": 34 },
    "group_b": { "name": "UltraPlast 99", "mean": 44.8, "std": 1.9, "n": 28 },
    "property": "tensile_strength_mpa",
    "t_statistic": 2.34,
    "p_value": 0.021,
    "significant": true,
    "alpha": 0.05,
    "interpretation": "The difference is statistically significant (p=0.021 < 0.05). FancyPlast 42 is stronger on average."
  },
  "steps": [
    "Queried all tensile tests for FancyPlast 42 (n=34) and UltraPlast 99 (n=28)",
    "Extracted tensile_strength_mpa values for both groups",
    "Ran two-sample t-test using scipy.stats.ttest_ind",
    "p-value=0.021 — below alpha threshold of 0.05 → statistically significant"
  ]
}
```

Use `scipy.stats.ttest_ind` for the t-test.

---

### Tool 4: `trend_analysis`

**Purpose:** Detect trends over time for a property.

**Parameters:**

- `property: str` (required)
- `material: str` (optional)
- `site: str` (optional)
- `months_back: int` — default 12

**Returns:**

```json
{
  "result": {
    "material": "Hostacomp G2",
    "property": "tensile_strength_mpa",
    "time_series": [
      { "date": "2024-01", "mean_value": 51.2, "n": 4 },
      { "date": "2024-02", "mean_value": 50.1, "n": 3 }
    ],
    "slope_per_month": -0.72,
    "r_squared": 0.87,
    "trend_direction": "decreasing",
    "interpretation": "Tensile strength is declining at ~0.72 MPa/month. R²=0.87 suggests a strong trend."
  },
  "steps": []
}
```

Aggregate test results to monthly averages. Use `numpy.polyfit` for linear regression.

---

### Tool 5: `boundary_forecast`

**Purpose:** Forecast if a property will cross a boundary value.

**Parameters:**

- `material: str` (required)
- `property: str` (required)
- `boundary_value: float` (required)
- `months_history: int` — default 12
- `months_forecast: int` — default 24

**Returns:**

```json
{
  "result": {
    "material": "FancyPlast 42",
    "property": "tensile_modulus_mpa",
    "boundary": 10.0,
    "will_violate": true,
    "estimated_violation_date": "2026-08",
    "months_until_violation": 5,
    "current_value": 11.8,
    "slope_per_month": -0.36,
    "time_series": [],
    "forecast_series": [
      { "date": "2026-04", "forecast_value": 11.4 },
      { "date": "2026-05", "forecast_value": 11.1 }
    ],
    "interpretation": "Based on current trend, tensile modulus will cross the 10 MPa boundary in ~5 months (August 2026)."
  },
  "steps": []
}
```

Extrapolate trend line using `numpy.polyfit`. Find crossing point algebraically.

---

### 2C — Claude AI Agent (`backend/main.py`)

Build a FastAPI app with two endpoints.

#### `POST /api/chat`

**Request:**

```json
{
  "message": "Compare FancyPlast 42 and UltraPlast 99 on tensile strength",
  "history": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ],
  "context": { "default_site": "Ulm" }
}
```

**Response:**

```json
{
  "answer": "FancyPlast 42 shows significantly higher tensile strength...",
  "tool_used": "compare_groups",
  "tool_result": { },
  "steps": [ "Step 1: ...", "Step 2: ..." ],
  "chart_type": "boxplot",
  "chart_data": { }
}
```

**Implementation:**

1. Send user message + history to Claude API with all 5 tools defined.  
2. Claude selects the right tool and returns `tool_use` block.  
3. Execute the tool locally, get structured result.  
4. Send result back to Claude for a natural-language answer in engineering language.  
5. Return the full response including chart data and audit steps.

You may additionally support **precomputed explanations** for specific demo flows by
storing them in a small JSON file and serving them via a lightweight `/api/explain` endpoint.

**System prompt for Claude:**

```text
You are TestMind, a senior materials testing engineer AI assistant. You help
junior engineers understand test data from ZwickRoell machines. Always:
- Answer in clear, practical engineering language (not data-science jargon)
- Reference specific numbers and comparisons
- Explain what the numbers mean for quality/safety
- If a parameter is missing and essential, ask ONE clarifying question
- When comparing machines or sites, always mention practical implications
- "My local plant" means the site from context.default_site
```

#### `GET /api/dashboard`

Returns mock dashboard stats for Screen 1:

```json
{
  "tests_last_7_days": 23,
  "anomalies_flagged": 3,
  "materials_in_db": 6,
  "boundary_risks": 2,
  "recent_tests": [],
  "anomalies": [
    {
      "material": "Hostacomp G2",
      "issue": "Tensile strength 18% below 6-month average",
      "severity": "warning"
    }
  ],
  "boundary_risks_detail": [
    {
      "material": "FancyPlast 42",
      "property": "tensile_modulus_mpa",
      "boundary": 10.0,
      "current": 11.8,
      "eta_months": 5
    }
  ]
}
```

---

## Phase 3 — Frontend: Screen 1 (Home Dashboard)

Build `frontend/src/screens/HomeScreen.jsx`.

### Layout

Full-width page, no sidebar. Structure:

```text
[ Header: TestMind logo + subtitle ]
[ 4 metric cards row ]
[ Chat bar — prominent, centered ]
[ Starter prompts — 6 clickable chips ]
[ Two-column row: Recent tests table | Alerts/risks panel ]
```

### Component Details

#### Header

- Left: "TestMind" in bold + "/ ZwickRoell" muted  
- Right: small site indicator `"Site: Ulm"` (configurable later)

#### 4 Metric Cards

Fetch from `GET /api/dashboard`.

Display as a horizontal row of 4 cards:

1. **Tests this week** — count, subtitle `"last 7 days"`
2. **Anomalies flagged** — count, amber/warning color if > 0
3. **Materials tracked** — count
4. **Boundary risks** — count, red/danger color if > 0

Each card: light gray background, large number (28px, weight 500), small muted label above.

#### Chat Bar

- Large, full-width rounded input (height 52px)
- Placeholder:  
  `"Ask anything — 'Is FancyPlast 42 tensile strength declining?'"`
- On Enter or click → navigate to ChatScreen with the message pre-loaded
- Subtle border, focus ring on active

#### Starter Prompts

6 clickable chips below the chat bar. Clicking a chip sends that exact text to ChatScreen:

1. `"Summarize all properties for FancyPlast 42"`
2. `"Show all tests for customer Megaplant"`
3. `"Compare Z05 and Z20 machine results"`
4. `"Is Hostacomp G2 tensile strength degrading?"`
5. `"List Charpy tests by MasterOfDesaster"`
6. `"Will FancyPlast 42 tensile modulus violate 10 MPa?"`

Style: small rounded pill, border, hover background change. Arrange in 2 rows of 3.

#### Recent Tests Table

Simple table with columns: `Date | Material | Test Type | Machine | Site | Tester`  
Max 8 rows, sorted by date descending.

#### Alerts Panel

Right column, stacked cards:

- **Anomalies** — each as an amber warning card with material name + issue text  
- **Boundary risks** — each as a red card with material + property + ETA  

---

## Phase 4 — Frontend: Screen 2 (Chat + Results)

Build `frontend/src/screens/ChatScreen.jsx`.

### Layout

Split layout, full height:

```text
[ Left 40%: Chat thread ]
[ Right 60%: Results panel ]
```

### Left Panel: Chat Thread

- Scrollable message list  
- User messages: right-aligned, light blue bubble  
- Assistant messages: left-aligned, white card with subtle border  
- At the bottom: fixed input bar (textarea + send button)  
- On mount: if a starter message was passed from Screen 1, auto-send it  

#### Clarifying question chips

When the API response contains `needs_clarification: true` and a
`clarification_options` array, render them as clickable chips inside the assistant message bubble:

```text
"Which property are you interested in?"
[ Tensile strength ]  [ Tensile modulus ]  [ Impact energy ]
```

Clicking a chip sends it as the next user message automatically.

### Right Panel: Results Panel

Renders dynamically based on `tool_used` from the API response.

#### Always show: Natural language answer

White card at top of results panel with the assistant's answer text.  
Font: 15px, line-height 1.7. Clear, readable.

#### Conditional renders based on `chart_type`:

**`chart_type: "table"`** — for `filter_tests`, `summarize_material`

- Render a clean HTML table with the result data.
- Columns auto-derived from result keys.
- Alternating row colors, sticky header.

**`chart_type: "stat_cards"`** — for `compare_groups`

- Render 3 metric cards side by side:
  - Group A: name, mean ± std, n
  - Group B: name, mean ± std, n  
  - p-value card: value + `"Significant"` badge (green) or `"Not significant"` badge (gray)
- Below the stat cards, render a **boxplot** using Recharts:
  - Two boxes side by side (group A and group B)
  - Show median, Q1/Q3, whiskers using `ComposedChart` with custom shapes
  - X-axis: group names. Y-axis: property value + unit.

**`chart_type: "time_series"`** — for `trend_analysis`

- Render a **line chart** using Recharts `LineChart`:
  - X-axis: date (monthly)
  - Y-axis: property value (MPa or J)
  - One line for actual monthly averages (dots + line)
  - One dashed line for the trend (linear regression)
  - Show slope annotation: e.g. `"Trend: -0.72 MPa/month"`

**`chart_type: "forecast"`** — for `boundary_forecast`

- Same as `time_series` but with TWO additional elements:
  - Extended dashed forecast line beyond current date
  - Horizontal red reference line at the boundary value
  - Vertical dashed line + label at the estimated violation date (if any)
  - Legend: Actual | Trend | Forecast | Boundary

#### Always show: Audit Trail (collapsible)

Below the chart, a collapsible **"What I did"** section:

- Collapsed by default, click to expand  
- Shows numbered steps from `steps` array  
- Each step as a simple row:  
  `"Step 1 — Filters applied: material=FancyPlast 42"`  
- Muted text, monospace font for field names  

---

## Phase 5 — Wiring & Polish

### 5A — Navigation

- Screen 1 → Screen 2: clicking chat bar or starter prompt navigates with message pre-loaded  
- Screen 2 has a `"← Back"` link top-left to return to Screen 1  
- No routing library needed — simple React state is fine for a prototype  

### 5B — Loading States

- While API call is in flight: show a pulsing skeleton in the results panel  
- Chat input is disabled during API call  
- Show `"Analyzing your data..."` text in the chat thread while loading  

### 5C — Error Handling

- If API returns error: show a red inline message in chat thread  
- `"Something went wrong — try rephrasing your question"`  

### 5D — Environment Variable for Live MongoDB

In `backend/db.py`:

```python
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
```

When the real MongoDB URI is provided, simply set `MONGO_URI=<connection_string>` and restart.  
No other code changes needed.

### 5E — CORS

Enable CORS in FastAPI for `http://localhost:5173`.

### 5F — Precomputed explanations (for demo stability)

Create a small JSON or Python dict with prewritten explanations for key demo flows
(e.g., single FancyPlast 42 test, Z05 vs Z20 comparison, Hostacomp G2 trend,
FancyPlast 42 boundary forecast). The `/api/chat` or an `/api/explain` endpoint
may use these instead of (or in addition to) live LLM calls for those specific scenarios.

---

## Phase 6 — Run & Verify

After building, verify these 6 test scenarios work end-to-end:

1. Type `"Show me all tests for Megaplant"` → table of tests appears in results panel  
2. Type `"Compare FancyPlast 42 and UltraPlast 99 tensile strength"` → stat cards + boxplot  
3. Type `"Is Hostacomp G2 tensile strength degrading?"` → time series with declining trend line  
4. Type `"Will FancyPlast 42 tensile modulus violate 10 MPa boundary?"` → forecast chart with red line  
5. Click starter prompt `"List Charpy tests by MasterOfDesaster"` → filtered table  
6. Ask follow-up `"What about their modulus?"` after a material summary → context preserved  

---

## Important Design Notes

- **Engineering language only** — no `"p-value significance at alpha threshold"` jargon.  
  Say: `"The difference IS statistically meaningful — it's not random noise."`
- **The audit trail is the knowledge transfer** — write steps as if a senior engineer
  is explaining their reasoning to a junior. Clear, step-by-step.
- **Starter prompts are the on-ramp** for junior engineers who don't know what to ask.  
  They must be visible immediately on Screen 1, above the fold.
- **Charts must have axis labels and units** — always show MPa, J, or % on Y-axis.
- **The results panel updates in place** — don't navigate away, just replace the content.  
  The chat thread persists on the left.
- **Default site = "Ulm"** for `"my local plant"` queries. Hardcode for now.

---

## Stretch Goals (if time allows)

- Bonus Q: `"Is the measured tensile strength within my internal guidelines?"` —  
  implement a simple threshold check tool (`check_compliance`)
- Bonus: Animate the chart when new results load (Recharts has built-in animations)
- Bonus: Export results as CSV button in the results panel
```
