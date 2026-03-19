# TestMind — Project Status

> Last updated: 2026-03-19
> Active branch: `mvp` | Main: `main`

---

## What's Built

### Backend — 7 MCP Tools + 5 API Endpoints

**Tools** (all in `tools/`):
| Tool | Purpose |
|------|---------|
| `filter_tests` | Search/filter by metadata with fuzzy name matching and natural language date parsing |
| `summarize_material_properties` | Statistical summary (mean, std, min, max) per material with fuzzy matching |
| `compare_groups` | Two-sample t-test between groups (material/machine/site) with fuzzy matching |
| `trend_analysis` | Monthly trend detection with linear regression and fuzzy matching |
| `boundary_forecast` | Forecast if property will cross a boundary value with fuzzy matching |
| `correlate_properties` | Pearson correlation + scatter plot between any two properties |
| `check_compliance` | Check pass/fail rate against a threshold value |

**API Endpoints**:
| Route | Purpose |
|-------|---------|
| `POST /api/chat` | LLM chat with tool use, returns structured response with chart data + follow-up suggestions |
| `GET /api/dashboard` | Dashboard stats: tests last 7 days, anomalies, boundary risks, recent tests |
| `GET /api/insights` | Proactive AI insights — auto-scans all materials for trend/boundary risks |
| `GET /api/explore` | Interactive explorer — time series + stats for a material/property combo |
| `GET /api/health-scores` | Material Health Scores — composite 0-100 score per material |

**Key Backend Features**:
- Fuzzy name matching via `difflib.get_close_matches` across all tools
- Natural language date parsing ("last 3 months", "Q1 2024", "since January")
- LLM follow-up question generation (separate LLM call)
- Markdown-formatted responses (bold, headings, lists)
- Precomputed fallback responses for demo stability

### Frontend — 3 Screens + 15+ Components

**Screens**:
| Screen | Purpose |
|--------|---------|
| `HomeScreen` | Dashboard with clickable metric cards, Material Health Score gauges, visual filters, proactive insights, recent tests, anomalies/boundary alerts |
| `ChatScreen` | 40/60 split chat — concise summaries on left, full markdown-rendered results + charts on right |
| `ExploreScreen` | Interactive data explorer with material/property selectors, Brush chart, drill-down table, individual test heatmap |

**Components**:
| Component | Purpose |
|-----------|---------|
| `Sidebar` | Collapsible navigator with Materials, Sample Queries, Recent History, Saved Templates, Explore Data nav |
| `MetricCard` | Clickable metric cards that expand to show underlying data |
| `HealthScores` | Animated SVG ring gauges showing composite health scores per material with expandable breakdowns |
| `FilterBar` | Visual filter pills (materials, test types, date ranges) that auto-generate chat queries |
| `ChartArea` | Chart router: table, stat_cards, time_series, forecast, scatter, compliance + RadarChart for material summaries |
| `WhatIfSimulator` | Interactive regression sliders for scatter correlations and trend forecasting |
| `ChatThread` | Chat messages with step-by-step analysis timeline loading, bookmarking |
| `ResultsPanel` | Full markdown-rendered answer, charts, CSV export, suggested follow-up questions |
| `AuditTrail` | Collapsible "What I did" steps with expandable source documents |
| `Toast` | Context-based toast notifications (bookmark saved, export complete) |
| `Markdown` | Lightweight markdown renderer (bold, italic, code, headings, lists) |
| `StarterPrompts` | Clickable prompt chips for common queries |
| `StatCards` | Group comparison with p-value badge + bar chart with error bars |

**6 Chart Types**:
- `table` — test records or property stats table
- `stat_cards` — group comparison with bar chart + error bars
- `time_series` — monthly averages + trend line with clickable drill-down
- `forecast` — trend + forecast + boundary violation warning
- `scatter` — color-coded scatter plot with trend line + correlation stats
- `compliance` — verdict banner + pass/fail stats + failed samples table

**Key Frontend Features**:
- Material Health Score ring gauges (trend stability, variability, boundary proximity)
- What-If Simulator (drag sliders to predict values from regression/trend)
- Clickable metric cards with expandable detail panels
- Visual filter bar for query building without typing
- Step-by-step analysis timeline (replaces loading spinner)
- Drill-down on time series chart dots
- RadarChart for material property profiles
- CSV export for tables and compliance results
- Toast notifications for bookmarks/exports
- Query bookmarking to localStorage
- Chat history persistence to localStorage
- Skeleton loaders for loading states
- Animated chart transitions (fadeIn, scaleIn, slideIn)
- Sidebar navigation with collapsible icon rail

---

## Known Issues

### Medium Priority
| Issue | Detail |
|---|---|
| **Real MongoDB not tested** | `db.py` supports real MongoDB via `MONGO_URI` but only tested with mock |
| **CORS hardcoded** | Only allows `localhost:5173` and `localhost:5174` |
| **No frontend tests** | React components have no unit or E2E tests |
| **LLM tool selection** | GPT-4o sometimes picks the wrong tool; could benefit from few-shot examples |

### Resolved (from original)
| Issue | Resolution |
|---|---|
| ~~Exact name matching only~~ | Fixed: fuzzy matching via `difflib.get_close_matches` in all tools |
| ~~Follow-up context limited~~ | Fixed: conversation history passed to LLM + follow-up suggestions generated |
| ~~No CSV export~~ | Fixed: export button on table/compliance results |
| ~~No chart animations~~ | Fixed: Recharts animations enabled + CSS keyframe transitions |
| ~~No compliance tool~~ | Fixed: `check_compliance` tool added |
| ~~No fuzzy name matching~~ | Fixed: implemented across all tools with substring fallback |

---

## Running Locally

```bash
# Backend (port 8000)
cd testmind/backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload

# Frontend (port 5173)
cd testmind/frontend
npm install && npm run dev
```

**Environment variables** (`testmind/backend/.env`):
```
LLM_PROVIDER=openai          # or "anthropic"
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o
MONGO_URI=mongodb://...      # optional — defaults to in-memory mock
```
