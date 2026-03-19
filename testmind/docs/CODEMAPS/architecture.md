<!-- Updated: 2026-03-19 -->

# TestMind Architecture

## System Diagram

```
┌──────────────────────────────┐     HTTP      ┌──────────────────────────────────────┐
│      React Frontend          │◄────────────►│      FastAPI Backend (:8000)          │
│      (Vite, :5173)           │              │                                      │
│                              │              │  POST /api/chat                      │
│  HomeScreen                  │              │  GET  /api/dashboard                 │
│    ├── MetricCard (x4)       │              │  GET  /api/insights                  │
│    ├── HealthScores          │              │  GET  /api/explore                   │
│    ├── FilterBar             │              │  GET  /api/health-scores             │
│    └── StarterPrompts        │              │                                      │
│  ChatScreen (40/60 split)    │              │  ┌────────────┐  ┌────────┐          │
│    ├── ChatThread            │              │  │ llm_client │  │ db.py  │          │
│    └── ResultsPanel          │              │  │ (OpenAI /  │  │ (mock  │          │
│         ├── ChartArea        │              │  │  Anthropic)│  │  or    │          │
│         │    └── WhatIf      │              │  └─────┬──────┘  │  real  │          │
│         └── AuditTrail       │              │        │         │  Mongo)│          │
│  ExploreScreen               │              │  ┌─────▼──────┐  └───┬───┘          │
│  Sidebar (Navigator)         │              │  │  7 Tools   │◄─────┘              │
└──────────────────────────────┘              │  └────────────┘                     │
                                              └──────────────────────────────────────┘
```

## Data Flow: Chat Query

```
User message
  → POST /api/chat (main.py)
    → llm_client.chat_with_tools()
      → OpenAI/Anthropic API (with 7 tool schemas)
        → LLM returns tool_use
      → _execute_tool(name, args)
        → tools/<tool>.py (with fuzzy matching + NL date parsing)
          → db.get_collection("Tests").find(query)
        → returns {result, steps}
      → LLM generates markdown-formatted answer
      → _generate_followups_openai() → 3 suggested follow-up questions
    → returns {answer, tool_used, tool_result, steps, chart_type, chart_data, suggested_followups}
  → Frontend:
    → ChatThread shows concise plain-language summary (first line)
    → ResultsPanel renders full markdown answer
    → ChartArea renders appropriate chart type
    → WhatIfSimulator appears for scatter/time_series/forecast
```

## Data Flow: Health Scores

```
HomeScreen mounts
  → GET /api/health-scores
    → For each material with ≥5 tensile tests:
      → Trend stability score (linear regression slope → 0-100)
      → Variability score (coefficient of variation → 0-100)
      → Boundary proximity score (min value vs soft boundary → 0-100)
      → Composite = trend×0.4 + variability×0.3 + boundary×0.3
    → Returns sorted array of {material, score, status, breakdown, details}
  → HealthScores component renders animated SVG ring gauges
```

## Key Design Decisions

- **DB encapsulation**: All MongoDB access through `db.py` — no direct pymongo imports
- **LLM abstraction**: `llm_client.py` supports OpenAI + Anthropic via `LLM_PROVIDER` env var
- **Fuzzy matching**: `difflib.get_close_matches` in all tools so LLM doesn't need exact names
- **NL date parsing**: `parse_natural_date_range()` handles "last 3 months", "Q1 2024", etc.
- **Precomputed fallback**: `precomputed.py` provides demo stability without LLM
- **In-memory mock**: No MongoDB install needed for development
- **Chat summary split**: Left panel shows plain-language one-liner, right panel shows full markdown + charts
- **Health scores**: Composite metric gives engineers instant material status without asking questions
