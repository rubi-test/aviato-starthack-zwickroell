<!-- Generated: 2026-03-19 | Files scanned: 14 | Token estimate: ~700 -->

# Backend Codemap

## API Routes

```
GET  /                → health()               → {"status": "ok"}
POST /api/chat        → chat(ChatRequest)       → ChatResponse (LLM + tool use)
GET  /api/dashboard   → dashboard()             → dashboard stats JSON
```

## Request/Response Models

```
ChatRequest:  { message: str[1..4000], history: list[max 50], context: dict }
ChatResponse: { answer, tool_used?, tool_result?, steps[], chart_type?, chart_data? }
```

## Tool → Chart Type Mapping

```
filter_tests                 → "table"
summarize_material_properties → "table"
compare_groups               → "stat_cards"
trend_analysis               → "time_series"
boundary_forecast            → "forecast"
```

## Key Files

| File | Purpose | Lines |
|------|---------|-------|
| `main.py` | FastAPI app, endpoints, dashboard logic | ~210 |
| `db.py` | DB gateway (mock ↔ real MongoDB) | ~67 |
| `llm_client.py` | OpenAI/Anthropic abstraction + tool schemas | ~250 |
| `precomputed.py` | Keyword-matched fallback responses | ~140 |
| `tools/utils.py` | Date parsing, property extraction, test-type inference | ~100 |
| `tools/filter_tests.py` | Search/filter by metadata | ~60 |
| `tools/summarize_material.py` | Stats summary per material | ~60 |
| `tools/compare_groups.py` | Two-sample t-test between groups | ~90 |
| `tools/trend_analysis.py` | Monthly trend + linear regression | ~100 |
| `tools/boundary_forecast.py` | Forecast boundary violations | ~110 |
| `mock_data/mock_mongo.py` | In-memory MongoDB mock (find, insert, sort, query ops) | ~170 |
| `mock_data/seed.py` | Generates 300 test docs with 7 seeded patterns | ~180 |

## Dependencies

- FastAPI + uvicorn (HTTP server)
- OpenAI SDK (LLM, tool use)
- Anthropic SDK (alternative LLM)
- pandas, numpy, scipy (stats, regression)
- pymongo (real MongoDB, optional)
- python-dotenv (env config)

## Environment Variables

```
LLM_PROVIDER=openai|anthropic    OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o              MONGO_URI=mongodb://...
DB_NAME=testmind_mock
```
