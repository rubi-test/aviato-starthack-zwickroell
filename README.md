# TestMind — Chat with Your Test Data

An AI-powered analytics assistant for ZwickRoell material testing engineers. Ask questions in natural language, get interactive visualizations, and explore test data without writing queries.

**Built for StartHack 2026 — ZwickRoell Challenge**

## Features

- **Natural Language Chat** — Ask questions like "Is FancyPlast 42 tensile strength declining?" and get structured answers with charts
- **7 Analysis Tools** — Filter, summarize, compare, trend analysis, boundary forecasting, property correlation, compliance checking
- **Material Health Scores** — Composite 0-100 scores per material based on trend stability, variability, and boundary proximity
- **Interactive Data Explorer** — Browse material properties over time with date brushing, drill-down, and z-score heatmaps
- **What-If Simulator** — Drag sliders to predict values from regression lines and trend projections
- **Proactive Insights** — Auto-scanned alerts for declining trends and approaching boundary violations
- **Visual Query Builder** — Click material/type/date pills to build queries without typing
- **Markdown-Formatted Answers** — Rich text with bold values, headings, and bullet points

## Tech Stack

| Layer | Stack |
|-------|-------|
| Backend | Python 3.11+, FastAPI, OpenAI GPT-4o (tool use), numpy/scipy/pandas |
| Frontend | React 18, Vite 6, Tailwind CSS 3, Recharts |
| Database | In-memory MongoDB mock (300 seeded tests, `random.seed(42)`) |

## Quick Start

```bash
# Backend
cd testmind/backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
echo "OPENAI_API_KEY=sk-your-key" > .env
uvicorn main:app --reload

# Frontend
cd testmind/frontend
npm install && npm run dev
```

Open http://localhost:5173

## Documentation

- [STATUS.md](STATUS.md) — Current project status and known issues
- [Architecture](testmind/docs/CODEMAPS/architecture.md) — System diagram and data flows
- [Backend Codemap](testmind/docs/CODEMAPS/backend.md) — API routes, tools, file index
- [Frontend Codemap](testmind/docs/CODEMAPS/frontend.md) — Screen flow, component hierarchy
- [Data Model](testmind/docs/CODEMAPS/data.md) — MongoDB schema and seeded patterns
- [Dependencies](testmind/docs/CODEMAPS/dependencies.md) — All packages and external services
