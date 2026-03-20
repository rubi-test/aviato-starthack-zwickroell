# TestMind

**TestMind** is an AI-powered materials testing intelligence platform built on top of ZwickRoell test data. It gives engineers a single place to understand the health of every material in their lab — through natural language, interactive charts, and proactive alerts — without writing a single query or opening a spreadsheet.

---

## The Vision

Materials testing generates enormous amounts of data. But most of it sits locked in databases, only accessible to people who know the right filters, field names, and export flows. TestMind changes that.

Ask a question in plain English. Get a precise, data-backed answer with charts, trends, and recommendations — in seconds. Whether you're a junior engineer checking if a batch is within spec, or a senior engineer hunting for a long-term degradation signal, TestMind speaks your language.

---

## What You Can Do

### Dashboard — Your Lab at a Glance

The home screen gives you a live pulse of your operation the moment you open the app.

- **Key metrics** — Tests run this week, anomalies flagged, total materials tracked, and active boundary risks. Each card is clickable: expand it to see the raw detail behind the number.
- **Material Health Grid** — Every tracked material gets a health score. Click any material directly from the grid to instantly pull a full AI-generated overview: strength stats, trend direction, variability, and any concerns worth flagging.
- **Proactive Insights** — TestMind automatically scans your data in the background and surfaces risks you didn't ask for: declining tensile trends, materials approaching spec limits, unusual variability spikes. Each insight is a one-click launch into the full analysis.
- **Notification Bell** — New insights appear as notifications. When a critical risk is detected, it shows up here with a red badge so nothing slips through.

---

### AI Chat — Ask Anything About Your Data

The core of TestMind. Type a question, get an answer grounded in your actual test database.

**What you can ask:**
- *"Show all tensile tests for PVC from the last 6 months"*
- *"Is the elongation at break for FEP trending down?"*
- *"Compare PVC and Steel max force across all sites"*
- *"Which materials have the highest variability in tensile modulus?"*
- *"Will Spur+ 1015 tensile strength violate its boundary in the next 12 months?"*
- *"Give me a full overview of GDL-Material — strength, trends, variability, and any concerns"*

**What you get back:**
- A plain-language answer written the way a senior engineer would explain it — specific numbers, practical implications, no jargon
- **Charts** that match the question: time series for trend questions, bar charts for comparisons, scatter plots for correlations, compliance tables for pass/fail analysis
- **Stat badges** — pass rate, trend direction, R² value, analysis window — surfaced right at the top of each result
- **Export** — download any chart as a PNG or any table as a CSV with one click
- **Full conversation context** — follow-up questions build on previous ones, so you can drill down naturally without re-stating context

The chat also keeps a **query history**, so your 5 most recent questions are always one click away on the dashboard.

---

### Data Explorer — Side-by-Side Material Comparison

The Explorer is built for direct comparison between two materials across multiple mechanical properties.

- Pick any one or two materials from your database using a searchable selector
- Toggle between properties: Max Force, Young's Modulus, Upper Yield Point, Elongation at Break, Force at Break, Work to Max Force
- See **monthly trend lines** for both materials on the same chart, with the full historical record
- **Brush to zoom** into any time window — drag the timeline slider to focus on a specific period
- A **statistics bar** shows mean, standard deviation, min, max, and test count side-by-side so comparisons are instant

---

### Graph Builder — Custom Charts in Natural Language

The Graph Builder lets you construct any visualization from scratch using plain English, then iterate on it conversationally.

**Chart types you can build:**
- **Bar charts** — compare a property across all materials, grouped by material, test type, customer, or standard
- **Line charts** — plot a property over time for one or more materials
- **Scatter plots** — explore correlations between any two properties
- **Histograms** — see the full distribution of a measurement across your test population
- **Pie charts** — break down test counts by material, test type, customer, or standard

**How it works:**
- Start with a prompt: *"Bar chart of tensile strength by material, sorted highest first"*
- The chart appears immediately, fully populated with real data
- Refine it conversationally: *"Filter to last 2 years"*, *"Switch to a line chart"*, *"Show only PVC and Steel"*
- The spec updates incrementally — only what you changed moves, everything else stays

---

### What-If Simulator

When a chart reveals a trend or correlation, a **What-If Simulator** appears automatically below it.

- **For trend charts**: drag a slider to project the current trend forward up to 24 months. See the predicted value at your chosen horizon, with the rate of change shown clearly.
- **For scatter / correlation charts**: drag one property's value along its observed range and see the predicted value of the correlated property update in real time.

This turns static charts into interactive decision-support tools — *if the current decline continues, when do we cross the spec limit?*

---

### Command Palette

Press **⌘K** (or **Ctrl+K**) anywhere in the app to open a fast-search overlay. Type any question or material name to jump straight into an analysis without going back to the dashboard.

---

## Supported Test Types & Properties

| Test Type | Properties |
|---|---|
| Tensile (ISO 527) | Tensile Strength (MPa), Tensile Modulus (MPa), Elongation at Break (%) |
| Compression (ISO 604) | Max Force (N), Upper Yield Point (MPa), Strain at Max Force (%) |
| Flexure / Bending | Max Force (N), Strain at Max Force (%) |

---

## Sites

TestMind is multi-site aware. Data from **Ulm** and **Kennesaw** is tracked independently, and you can filter any query by site — or compare across sites — simply by saying so in your question.

---

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

---

*TestMind — built for ZwickRoell · StartHack 2026*
