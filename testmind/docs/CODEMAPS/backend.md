<!-- Updated: 2026-03-19 -->

# Backend Codemap

## API Routes

```
GET  /                    → health()               → {"status": "ok"}
POST /api/chat            → chat(ChatRequest)       → ChatResponse (LLM + tool use)
GET  /api/dashboard       → dashboard()             → dashboard stats JSON
GET  /api/insights        → insights()              → proactive AI insights (auto-scanned)
GET  /api/explore         → explore(material, prop)  → time series + stats for explorer
GET  /api/health-scores   → health_scores()         → composite health scores per material
```

## Request/Response Models

```
ChatRequest:  { message: str[1..4000], history: list[max 50], context: dict }
ChatResponse: { answer, tool_used?, tool_result?, steps[], chart_type?, chart_data?, suggested_followups[] }
```

## Tool → Chart Type Mapping

```
filter_tests                  → "table"
summarize_material_properties → "table" (+ RadarChart when properties present)
compare_groups                → "stat_cards"
trend_analysis                → "time_series" (+ WhatIfSimulator)
boundary_forecast             → "forecast" (+ WhatIfSimulator)
correlate_properties          → "scatter" (+ WhatIfSimulator)
check_compliance              → "compliance"
```

## Key Files

| File | Purpose |
|------|---------|
| `main.py` | FastAPI app, 5 endpoints, dashboard/insights/explore/health-scores logic |
| `db.py` | DB gateway (mock ↔ real MongoDB) |
| `llm_client.py` | OpenAI/Anthropic abstraction + 7 tool schemas + follow-up generation |
| `precomputed.py` | Keyword-matched fallback responses |
| `tools/utils.py` | Fuzzy matching, NL date parsing, date filtering, property extraction, test-type inference |
| `tools/filter_tests.py` | Search/filter by metadata with fuzzy matching |
| `tools/summarize_material.py` | Stats summary per material with fuzzy matching |
| `tools/compare_groups.py` | Two-sample t-test with fuzzy matching |
| `tools/trend_analysis.py` | Monthly trend + linear regression with fuzzy matching |
| `tools/boundary_forecast.py` | Forecast boundary violations with fuzzy matching |
| `tools/correlate_properties.py` | Pearson correlation between properties |
| `tools/check_compliance.py` | Pass/fail rate against threshold |
| `mock_data/mock_mongo.py` | In-memory MongoDB mock (find, insert, sort, query ops) |
| `mock_data/seed.py` | Generates 300 test docs with 7 seeded patterns |

## Dependencies

- FastAPI + uvicorn (HTTP server)
- OpenAI SDK (LLM, tool use)
- Anthropic SDK (alternative LLM)
- pandas, numpy, scipy (stats, regression, correlation)
- pymongo (real MongoDB, optional)
- python-dotenv (env config)
- difflib (fuzzy name matching, stdlib)

## Environment Variables

```
LLM_PROVIDER=openai|anthropic    OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o              MONGO_URI=mongodb://...
DB_NAME=testmind_mock
```
