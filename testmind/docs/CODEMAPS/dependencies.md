<!-- Updated: 2026-03-19 -->

# Dependencies Codemap

## Backend (Python)

| Package | Version | Purpose |
|---------|---------|---------|
| fastapi | 0.115.6 | HTTP framework |
| uvicorn | 0.34.0 | ASGI server |
| pymongo | 4.10.1 | MongoDB driver (optional — mock used by default) |
| pandas | 2.2.3 | Data manipulation |
| numpy | 2.2.1 | Numerical computation, polyfit regression, statistics |
| scipy | 1.15.0 | Statistical tests (ttest_ind, pearsonr) |
| openai | 1.58.1 | OpenAI API client (primary LLM) |
| anthropic | 0.42.0 | Anthropic API client (alternative LLM) |
| python-dotenv | 1.0.1 | Environment variable loading |
| difflib | stdlib | Fuzzy name matching (get_close_matches) |

## Frontend (Node)

| Package | Version | Purpose |
|---------|---------|---------|
| react | 18.3.1 | UI framework |
| react-dom | 18.3.1 | DOM rendering |
| recharts | 2.15.0 | Charts (line, bar, scatter, radar, composed, brush) |
| axios | 1.7.9 | HTTP client |
| tailwindcss | 3.4.17 | Utility-first CSS |
| @tailwindcss/typography | latest | Prose classes for markdown rendering |
| vite | 6.0.5 | Build tool + dev server |

## External Services

| Service | Required? | Config |
|---------|-----------|--------|
| OpenAI API | Yes (or Anthropic) | `OPENAI_API_KEY` env var |
| Anthropic API | Alternative | `ANTHROPIC_API_KEY` env var |
| MongoDB | No (mock default) | `MONGO_URI` env var |
