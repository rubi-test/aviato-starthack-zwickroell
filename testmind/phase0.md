# TestMind — Phase 0-2 Completion Report

## What Was Built

### Phase 0 — Project Scaffold
- Full directory structure: `testmind/backend/` and `testmind/frontend/`
- Backend: Python 3.11+ with FastAPI, uvicorn, pymongo, pandas, numpy, scipy, openai, anthropic
- Frontend: React 18 (Vite), Tailwind CSS 3, Recharts, Axios
- Both dev servers verified starting (backend :8000, frontend :5173)
- `.gitignore` excludes `node_modules/`, `venv/`, `.env`, `__pycache__/`

### Phase 1 — Mock Data Layer
- **`mock_data/mock_mongo.py`** — In-memory MongoDB mock implementing `find()`, `find_one()`, `insert_many()`, `count_documents()`, `distinct()` with query operators (`$eq`, `$gte`, `$lte`, `$gt`, `$lt`, `$in`, `$regex`, `$ne`, `$exists`), dotted key resolution, sort/limit/skip cursors
- **`mock_data/seed.py`** — Generates 300 test documents + 300 value columns with `random.seed(42)` for reproducibility
- **`db.py`** — Encapsulated database gateway. Tries real MongoDB first, falls back to in-memory mock with auto-seeding. No other module imports pymongo directly.

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

### Phase 2 — Backend API + MCP Tools

#### 5 Tools (all in `tools/`)
| Tool | File | Purpose |
|------|------|---------|
| `filter_tests` | `filter_tests.py` | Search/filter by metadata (type, customer, material, tester, machine, site, date range) |
| `summarize_material_properties` | `summarize_material.py` | Statistical summary (mean, std, min, max) for a material |
| `compare_groups` | `compare_groups.py` | Two-sample t-test between groups (material/machine/site) |
| `trend_analysis` | `trend_analysis.py` | Monthly trend detection with linear regression |
| `boundary_forecast` | `boundary_forecast.py` | Forecast if property will cross a boundary value |

- **`tools/utils.py`** — Shared utilities: date parsing, date range filtering, property extraction, test-type inference (tensile properties auto-filter to tensile tests only)

#### LLM Abstraction (`llm_client.py`)
- Supports both OpenAI and Anthropic via `LLM_PROVIDER` env var
- Tool schemas defined once (OpenAI format), auto-converted for Anthropic
- Full tool-use loop: message → tool call → execute → send result → final answer
- Switch provider by changing one line in `.env`

#### API Endpoints (`main.py`)
- **`POST /api/chat`** — Sends message to LLM with tool use, returns `{answer, tool_used, tool_result, steps, chart_type, chart_data}`
- **`GET /api/dashboard`** — Returns dashboard stats: tests_last_7_days, anomalies, materials, boundary_risks, recent_tests table
- CORS enabled for `http://localhost:5173`

#### Precomputed Fallback (`precomputed.py`)
- Keyword-matched fallback responses for all 6 demo scenarios
- Activates automatically if LLM call fails (no API key, rate limit, etc.)
- Runs the actual tools against seed data — responses are always fresh

### Frontend Scaffold (Placeholders)
- `App.jsx` — Screen router with `home`/`chat` state
- `HomeScreen.jsx`, `ChatScreen.jsx` — Placeholder screens with navigation
- `api.js` — Axios client with `fetchDashboard()` and `sendChatMessage()`
- All component files created as stubs: `MetricCard`, `ChatThread`, `ResultsPanel`, `StatCards`, `ChartArea`, `AuditTrail`, `StarterPrompts`

## File Tree
```
testmind/
├── .gitignore
├── backend/
│   ├── .env                    # LLM_PROVIDER, OPENAI_API_KEY, OPENAI_MODEL
│   ├── .env.example
│   ├── requirements.txt
│   ├── main.py                 # FastAPI app + endpoints
│   ├── db.py                   # Encapsulated DB access (mock or real MongoDB)
│   ├── llm_client.py           # OpenAI/Anthropic abstraction with tool use
│   ├── precomputed.py          # Fallback demo responses
│   ├── mcp_server.py           # (placeholder — fastMCP registration)
│   ├── tools/
│   │   ├── __init__.py
│   │   ├── utils.py            # Shared utilities
│   │   ├── filter_tests.py
│   │   ├── summarize_material.py
│   │   ├── compare_groups.py
│   │   ├── trend_analysis.py
│   │   └── boundary_forecast.py
│   └── mock_data/
│       ├── __init__.py
│       ├── mock_mongo.py       # In-memory MongoDB implementation
│       └── seed.py             # 300 test documents generator
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── index.html
    └── src/
        ├── main.jsx
        ├── index.css
        ├── App.jsx
        ├── api.js
        ├── screens/
        │   ├── HomeScreen.jsx   # (placeholder)
        │   └── ChatScreen.jsx   # (placeholder)
        └── components/
            ├── MetricCard.jsx   # (stub)
            ├── ChatThread.jsx   # (stub)
            ├── ResultsPanel.jsx # (stub)
            ├── StatCards.jsx    # (stub)
            ├── ChartArea.jsx    # (stub)
            ├── AuditTrail.jsx   # (stub)
            └── StarterPrompts.jsx # (stub)
```

## How to Run
```bash
# Backend
cd testmind/backend
source venv/bin/activate
uvicorn main:app --port 8000 --reload

# Frontend (separate terminal)
cd testmind/frontend
npm run dev
```

## Environment Variables
| Variable | Value | Notes |
|----------|-------|-------|
| `LLM_PROVIDER` | `openai` | Switch to `anthropic` to use Claude |
| `OPENAI_API_KEY` | set in `.env` | Required for live LLM calls |
| `OPENAI_MODEL` | `gpt-4o` | Can change to `gpt-4o-mini` for cost savings |
| `MONGO_URI` | (unset) | Falls back to in-memory mock |

## Next: Phase 3-4 (Frontend)
- Phase 3: Home Dashboard (metric cards, chat bar, starter prompts, recent tests, alerts)
- Phase 4: Chat Screen (40/60 split, chat thread, dynamic results panel with charts)
- Phase 5: Polish (loading states, error handling)
- Phase 6: End-to-end verification
