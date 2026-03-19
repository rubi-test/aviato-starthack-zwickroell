<!-- Updated: 2026-03-19 -->

# Frontend Codemap

## Screen Flow

```
App.jsx (screen router: "home" | "chat" | "explore", wrapped in ToastProvider)
  ├── Sidebar (always visible, collapsible)
  ├── HomeScreen
  │     ├── MetricCard (x4, clickable with expandable detail panels)
  │     ├── HealthScores (animated ring gauges per material)
  │     ├── FilterBar (visual query builder)
  │     ├── ChatBar (full-width input)
  │     ├── StarterPrompts (6 clickable chips)
  │     ├── Recent Queries (from localStorage)
  │     ├── Proactive Insights (auto-scanned, clickable)
  │     ├── Recent Tests table
  │     └── Anomalies + Boundary Risks panels
  ├── ChatScreen (40/60 split)
  │     ├── ChatThread (concise summaries, step timeline loading, bookmarking)
  │     └── ResultsPanel
  │           ├── Markdown-rendered answer
  │           ├── ChartArea (6 chart types + RadarChart + DrillDownPanel)
  │           │     └── WhatIfSimulator (below scatter/time_series/forecast)
  │           ├── Suggested follow-ups
  │           ├── CSV export button
  │           └── AuditTrail (collapsible steps + source docs)
  └── ExploreScreen
        ├── Material pill selector
        ├── Property dropdown
        ├── Stats summary row (n, mean, std, min, max)
        ├── LineChart with Brush (monthly avg, min, max, trend)
        ├── Click-to-drill-down individual tests table
        └── Individual test heatmap (z-score color coding)
```

## API Client (`api.js`)

```
fetchDashboard()                          → GET  /api/dashboard
sendChatMessage(message, history, context) → POST /api/chat
fetchInsights()                           → GET  /api/insights
fetchExploreData(material, property)      → GET  /api/explore
fetchHealthScores()                       → GET  /api/health-scores
```

## Key Components

| Component | File | Purpose |
|-----------|------|---------|
| `Sidebar` | `components/Sidebar.jsx` | Collapsible nav: Materials, Sample Queries, History, Saved, Explore Data |
| `MetricCard` | `components/MetricCard.jsx` | Clickable metric cards with active state |
| `HealthScores` | `components/HealthScores.jsx` | SVG ring gauges with expandable score breakdowns |
| `FilterBar` | `components/FilterBar.jsx` | Material/type/date filter pills → auto-generate query |
| `ChartArea` | `components/ChartArea.jsx` | Chart router: table, stat_cards, time_series, forecast, scatter, compliance + RadarChart |
| `WhatIfSimulator` | `components/WhatIfSimulator.jsx` | Correlation slider + trend projection slider |
| `ChatThread` | `components/ChatThread.jsx` | Messages, step timeline loading, bookmark buttons |
| `ResultsPanel` | `components/ResultsPanel.jsx` | Full markdown answer, charts, CSV export, follow-ups |
| `AuditTrail` | `components/AuditTrail.jsx` | Collapsible steps + expandable source documents |
| `Toast` | `components/Toast.jsx` | Context-based toast notifications |
| `Markdown` | `components/Markdown.jsx` | Lightweight markdown renderer (no external deps) |
| `StatCards` | `components/StatCards.jsx` | Group comparison with bar chart + error bars |
| `StarterPrompts` | `components/StarterPrompts.jsx` | Clickable prompt chips |

## Stack

- React 18 + Vite 6
- Tailwind CSS 3 + @tailwindcss/typography
- Recharts (LineChart, BarChart, ScatterChart, RadarChart, Brush)
- Axios (HTTP)
- localStorage (query history, saved templates, sidebar state)
