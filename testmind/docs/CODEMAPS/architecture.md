<!-- Generated: 2026-03-19 | Files scanned: 25 | Token estimate: ~600 -->

# TestMind Architecture

## System Diagram

```
┌─────────────────────┐     HTTP      ┌──────────────────────────────┐
│   React Frontend    │◄────────────►│    FastAPI Backend (:8000)    │
│   (Vite, :5173)     │              │                              │
│                     │              │  POST /api/chat              │
│  HomeScreen         │              │  GET  /api/dashboard         │
│  ChatScreen         │              │                              │
│  Components (7)     │              │  ┌────────────┐  ┌────────┐ │
└─────────────────────┘              │  │ llm_client │  │ db.py  │ │
                                     │  │ (OpenAI /  │  │ (mock  │ │
                                     │  │  Anthropic)│  │  or    │ │
                                     │  └─────┬──────┘  │  real  │ │
                                     │        │         │  Mongo)│ │
                                     │  ┌─────▼──────┐  └───┬───┘ │
                                     │  │  5 Tools   │◄─────┘     │
                                     │  └────────────┘            │
                                     └──────────────────────────────┘
```

## Data Flow: Chat Query

```
User message
  → POST /api/chat (main.py)
    → llm_client.chat_with_tools()
      → OpenAI/Anthropic API (with tool schemas)
        → LLM returns tool_use
      → _execute_tool(name, args)
        → tools/<tool>.py
          → db.get_collection("Tests").find(query)
        → returns {result, steps}
      → LLM generates natural-language answer
    → returns {answer, tool_used, tool_result, steps, chart_type, chart_data}
  → Frontend renders chart based on chart_type
```

## Key Design Decisions

- **DB encapsulation**: All MongoDB access through `db.py` — no direct pymongo imports
- **LLM abstraction**: `llm_client.py` supports OpenAI + Anthropic via `LLM_PROVIDER` env var
- **Precomputed fallback**: `precomputed.py` provides demo stability without LLM
- **In-memory mock**: No MongoDB install needed for development
- **Test-type inference**: `tools/utils.py:infer_test_type_filter()` auto-filters tensile queries to tensile tests
