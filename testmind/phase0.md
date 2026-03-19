# TestMind — Full Build Report

## What Was Built

### Data Layer
- **`mock_data/mock_mongo.py`** — In-memory MongoDB mock with full query operator support (`$eq`, `$gt`, `$in`, `$regex`, `$and`, `$or`, etc.)
- **`mock_data/seed.py`** — Generates 300 test documents + 300 value columns with `random.seed(42)` for reproducibility across 6 materials, 4 customers, 3 testers, 3 machines, 2 sites
- **`db.py`** — Encapsulated database gateway (mock or real MongoDB via `MONGO_URI`)

#### Seeded Data Patterns
| # | Pattern | Verified |
|---|---------|----------|
| 1 | Hostacomp G2 tensile strength declining 2024-2025 (52→44 MPa) | slope=-0.338 MPa/month |
| 2 | FancyPlast 42 tensile modulus declining toward 10 MPa | slope=-0.121, violation ETA June 2026 |
| 3 | Z05 produces ~1.5 MPa higher tensile strength than Z20 | Z05=47.6, Z20=46.0, p=0.0012 |
| 4 | Ulm and Kennesaw produce similar results | seeded with same base values |
| 5 | 20+ tests for Megaplant | 86 tests |
| 6 | 8+ Charpy tests by MasterOfDesaster | 13 tests |
| 7 | Compression tests for Empire Industries / Stardust | 8 tests around May 2023 |

### Backend — 7 MCP Tools + 5 API Endpoints

#### Tools (all in `tools/`)
| Tool | File | Purpose |
|------|------|---------|
| `filter_tests` | `filter_tests.py` | Search/filter by metadata with fuzzy matching + NL date parsing |
| `summarize_material_properties` | `summarize_material.py` | Stats summary (mean, std, min, max) with fuzzy matching |
| `compare_groups` | `compare_groups.py` | Two-sample t-test between groups with fuzzy matching |
| `trend_analysis` | `trend_analysis.py` | Monthly trend + linear regression with fuzzy matching |
| `boundary_forecast` | `boundary_forecast.py` | Forecast boundary violations with fuzzy matching |
| `correlate_properties` | `correlate_properties.py` | Pearson correlation + scatter data between properties |
| `check_compliance` | `check_compliance.py` | Pass/fail rate against threshold value |

- **`tools/utils.py`** — Shared utilities: fuzzy matching (`difflib.get_close_matches`), natural language date parsing ("last 3 months", "Q1 2024", "since January"), date range filtering, property extraction, test-type inference

#### LLM Abstraction (`llm_client.py`)
- Supports OpenAI and Anthropic via `LLM_PROVIDER` env var
- 7 tool schemas (OpenAI format, auto-converted for Anthropic)
- Full tool-use loop: message → tool call → execute → send result → final answer
- Follow-up question generation via separate LLM call
- System prompt instructs markdown formatting + plain-language summary first line

#### API Endpoints (`main.py`)
| Route | Purpose |
|-------|---------|
| `POST /api/chat` | LLM chat with tool use → `{answer, tool_used, tool_result, steps, chart_type, chart_data, suggested_followups}` |
| `GET /api/dashboard` | Dashboard stats: tests last 7 days, anomalies, boundary risks, recent tests |
| `GET /api/insights` | Auto-scans all materials for trend degradation + boundary risks, returns top 5 ranked insights |
| `GET /api/explore` | Time series + individual tests + stats for interactive explorer |
| `GET /api/health-scores` | Composite health score per material (trend stability, variability, boundary proximity) |

### Frontend — 3 Screens + 15+ Components

#### HomeScreen
- 4 clickable metric cards with expandable detail panels (tests, anomalies, materials, boundary risks)
- Material Health Score ring gauges (animated SVG, color-coded, expandable breakdown)
- Visual filter bar (material/type/date pills → auto-generate chat queries)
- Full-width chat bar + starter prompt chips
- Proactive Insights (severity-colored, clickable to investigate)
- Recent queries from localStorage
- Recent tests table + anomaly/boundary alert panels
- Skeleton loaders for loading states

#### ChatScreen (40/60 split)
- Left: Chat thread with concise plain-language summaries, step-by-step analysis timeline, bookmark buttons
- Right: Full markdown-rendered answer, interactive charts, What-If simulator, CSV export, suggested follow-ups, audit trail

#### ExploreScreen
- Material pill selector + property dropdown
- Stats summary row (n, mean, std, min, max)
- LineChart with Brush for date filtering (monthly avg, min, max, trend)
- Click dot to drill down → individual tests table
- Individual test heatmap with z-score color coding (within 1σ, 1-2σ, >2σ outlier)

#### 6 Chart Types
- `table` — test records or material property stats + RadarChart for property profiles
- `stat_cards` — group comparison with p-value badge + bar chart with error bars
- `time_series` — monthly averages + trend line + clickable drill-down + What-If simulator
- `forecast` — trend + forecast + boundary violation warning + What-If simulator
- `scatter` — color-coded scatter plot + trend line + correlation stats + What-If simulator
- `compliance` — verdict banner + pass/fail stats + failed samples table

#### Key UI Features
- Collapsible sidebar navigator (Materials, Sample Queries, History, Saved, Explore)
- Toast notifications (bookmark saved, export complete)
- Custom lightweight Markdown renderer (no external deps)
- CSS keyframe animations (fadeIn, fadeInUp, slideIn, scaleIn)
- localStorage persistence (query history, saved templates, sidebar state)

## File Tree
```
testmind/
├── backend/
│   ├── .env                    # LLM_PROVIDER, OPENAI_API_KEY, OPENAI_MODEL
│   ├── requirements.txt
│   ├── main.py                 # FastAPI app + 5 endpoints
│   ├── db.py                   # DB gateway (mock or real MongoDB)
│   ├── llm_client.py           # OpenAI/Anthropic abstraction + 7 tool schemas
│   ├── precomputed.py          # Fallback demo responses
│   ├── tools/
│   │   ├── utils.py            # Fuzzy matching, NL dates, shared utilities
│   │   ├── filter_tests.py
│   │   ├── summarize_material.py
│   │   ├── compare_groups.py
│   │   ├── trend_analysis.py
│   │   ├── boundary_forecast.py
│   │   ├── correlate_properties.py
│   │   └── check_compliance.py
│   └── mock_data/
│       ├── mock_mongo.py       # In-memory MongoDB implementation
│       └── seed.py             # 300 test documents generator
└── frontend/
    ├── package.json
    ├── tailwind.config.js      # includes @tailwindcss/typography plugin
    └── src/
        ├── App.jsx             # Screen router + ToastProvider
        ├── api.js              # 5 API functions
        ├── index.css           # Tailwind + keyframe animations
        ├── screens/
        │   ├── HomeScreen.jsx
        │   ├── ChatScreen.jsx
        │   └── ExploreScreen.jsx
        └── components/
            ├── Sidebar.jsx
            ├── MetricCard.jsx
            ├── HealthScores.jsx
            ├── FilterBar.jsx
            ├── ChartArea.jsx
            ├── WhatIfSimulator.jsx
            ├── ChatThread.jsx
            ├── ResultsPanel.jsx
            ├── AuditTrail.jsx
            ├── Toast.jsx
            ├── Markdown.jsx
            ├── StatCards.jsx
            └── StarterPrompts.jsx
```

## How to Run
```bash
# Backend
cd testmind/backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --port 8000 --reload

# Frontend (separate terminal)
cd testmind/frontend
npm install && npm run dev
```

## Environment Variables
| Variable | Value | Notes |
|----------|-------|-------|
| `LLM_PROVIDER` | `openai` | Switch to `anthropic` to use Claude |
| `OPENAI_API_KEY` | set in `.env` | Required for live LLM calls |
| `OPENAI_MODEL` | `gpt-4o` | Can change to `gpt-4o-mini` for cost savings |
| `MONGO_URI` | (unset) | Falls back to in-memory mock |
