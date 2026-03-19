# TestMind — Project Status

> Last updated: 2026-03-19
> Active branch: `mvp` | Main: `main`

---

## ✅ What's Built

### Phase 0 — Scaffold
Full project structure in place: `testmind/backend/` and `testmind/frontend/` with all directories and entry points.

### Phase 1 — Mock Data Layer
- `seed.py` generates ~300 reproducible test documents (`random.seed(42)`) across 6 materials, 4 customers, 3 testers, 3 machines, 2 sites, date range 2023–2025
- `mock_mongo.py` — in-memory MongoDB substitute with full query operator support (`$eq`, `$gt`, `$in`, `$regex`, `$and`, `$or`, etc.)
- `db.py` — auto-detects real MongoDB vs mock; swap via `MONGO_URI` env var
- 7 demo data patterns baked in (declining trends, boundary risks, machine bias, etc.)

### Phase 2 — Backend API
- **5 MCP tools**: `filter_tests`, `summarize_material_properties`, `compare_groups` (t-test), `trend_analysis` (linear regression), `boundary_forecast` (extrapolation)
- **`POST /api/chat`**: routes to GPT-4o or Claude via `LLM_PROVIDER` env var, executes tool, returns structured response with `answer`, `chart_type`, `chart_data`, `steps`
- **`GET /api/dashboard`**: live stats — tests last 7 days, anomaly detection, boundary risks, recent tests table
- **`precomputed.py`**: keyword-matched fallback responses for all 6 demo scenarios (demo safety net when LLM is unavailable)
- CORS enabled for `localhost:5173`

### Phase 3 & 4 — Frontend
- **HomeScreen**: 4 metric cards, full-width chat bar, 6 starter prompt chips, recent tests table, anomaly + boundary risk alert panels
- **ChatScreen**: 40/60 split (chat left, results right), animated loading state, conversation history passed to LLM for follow-ups, error handling
- **4 result chart types**:
  - `table` — test records or material property stats
  - `stat_cards` — group comparison with p-value badge + bar chart with error bars
  - `time_series` — monthly averages + dashed trend line with slope annotation
  - `forecast` — trend + forecast line + red boundary reference line + violation date
- **Audit trail** — collapsible "What I did" section with numbered steps + clickable source documents (each test record expandable inline)

### Phase 5 — Wiring & Polish
- Navigation: HomeScreen ↔ ChatScreen with pre-loaded message
- Loading states: bouncing dots animation + disabled input
- Error handling: inline error message in chat thread
- Env var switchable MongoDB (`MONGO_URI`)
- Precomputed demo fallbacks

### Test Suite — 175 tests, 94% coverage
- Unit tests: all 5 tools, `utils.py`, `mock_mongo.py`
- Integration tests: `/api/health`, `/api/dashboard`, `/api/chat` (mocked LLM), `precomputed.py`
- Seed pattern verification: all 7 demo data patterns confirmed against generated data

---

## 🔴 What's Left / Known Issues

### High Priority (demo-blocking)
| Issue | Detail |
|---|---|
| **Exact name matching only** | Queries must use full exact names (`"FancyPlast 42"` not `"FancyPlast"`). The LLM sometimes shortens names; the tools don't fuzzy-match. Fix: add `$regex` support in tools, or have LLM normalize names via a name lookup step. |
| **Follow-up context limited** | The precomputed fallback doesn't handle follow-up questions — it only matches the first message. Scenario 6 of the demo (follow-up context) requires a live LLM key. |
| **`.env` has real API key** | `testmind/backend/.env` contains the OpenAI key. Confirm it's in `.gitignore` before making the repo public. |

### Medium Priority
| Issue | Detail |
|---|---|
| **Real MongoDB not tested** | `db.py` supports real MongoDB via `MONGO_URI` but this has only been tested with the mock. Need to verify schema compatibility with actual testXpert III export. |
| **CORS hardcoded to localhost** | `main.py` only allows `http://localhost:5173`. If deployed, needs `CORS_ORIGINS` env var support. |
| **No frontend tests** | React components have no unit or E2E tests. A Playwright smoke test for each of the 6 demo scenarios would catch regressions. |
| **LLM picks wrong tool occasionally** | GPT-4o sometimes calls `summarize_material_properties` when `filter_tests` is more appropriate. System prompt tuning or few-shot examples would help. |

### Low Priority / Stretch Goals (from original spec)
| Feature | Detail |
|---|---|
| `check_compliance` tool | Bonus tool to check if a result is within internal guidelines (simple threshold check) |
| CSV export button | "Export results" button in the results panel |
| Chart animations | Recharts supports built-in animations on mount — easy to enable |
| Fuzzy name matching | `$regex` case-insensitive search so "fancyplast" matches "FancyPlast 42" |
| Env-configurable CORS origins | `CORS_ORIGINS=http://localhost:5173,https://myapp.com` |
| Frontend component tests | Vitest + React Testing Library for HomeScreen, ChatScreen, ChartArea |
| Real MongoDB integration test | Spin up test DB with real schema, verify all 5 tools work end-to-end |

---

## Running Locally

```bash
# Backend (port 8000)
cd testmind/backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload

# Frontend (port 5173)
cd testmind/frontend
npm install && npm run dev

# Tests
cd testmind/backend
venv/bin/pytest tests/ -v
```

**Environment variables** (`testmind/backend/.env`):
```
LLM_PROVIDER=openai          # or "anthropic"
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o
MONGO_URI=mongodb://...      # optional — defaults to in-memory mock
```
