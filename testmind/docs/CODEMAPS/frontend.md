<!-- Generated: 2026-03-19 | Files scanned: 11 | Token estimate: ~400 -->

# Frontend Codemap

## Screen Flow

```
App.jsx (screen router: "home" | "chat")
  ├── HomeScreen.jsx ─── [placeholder]
  │     onNavigateToChat(message) → sets screen="chat"
  └── ChatScreen.jsx ─── [placeholder]
        initialMessage, onBack → sets screen="home"
```

## Component Hierarchy (stubs, not yet implemented)

```
HomeScreen
  ├── MetricCard (x4)        ← tests_last_7_days, anomalies, materials, boundary_risks
  ├── ChatBar (inline)       ← full-width input, navigates to ChatScreen
  ├── StarterPrompts         ← 6 clickable prompt chips (2x3 grid)
  ├── RecentTestsTable       ← 8 rows, sorted by date desc
  └── AlertsPanel            ← anomaly warnings + boundary risk cards

ChatScreen (40/60 split)
  ├── ChatThread             ← scrollable messages, input bar, loading state
  └── ResultsPanel
        ├── AnswerCard       ← natural language response
        ├── ChartArea        ← table | stat_cards | time_series | forecast
        │     └── StatCards  ← group A, group B, p-value badge
        └── AuditTrail       ← collapsible "What I did" steps
```

## API Client (`api.js`)

```
fetchDashboard()                          → GET  /api/dashboard
sendChatMessage(message, history, context) → POST /api/chat
```

## Stack

- React 18 + Vite 6
- Tailwind CSS 3
- Recharts (charts)
- Axios (HTTP)
