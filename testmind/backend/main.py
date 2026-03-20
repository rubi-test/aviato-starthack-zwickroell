"""TestMind — FastAPI entry point with /api/chat and /api/dashboard endpoints."""

import os
import logging
from datetime import datetime, timedelta
from pydantic import BaseModel, Field
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

load_dotenv()

app = FastAPI(title="TestMind API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)
    history: list[dict] = Field(default=[], max_length=50)
    context: dict = {}


class ChatResponse(BaseModel):
    answer: str
    tool_used: str | None = None
    tool_result: dict | None = None
    steps: list[str] = []
    chart_type: str | None = None
    chart_data: dict | None = None
    suggested_followups: list[str] = []


@app.get("/")
def health():
    return {"status": "ok", "service": "testmind"}


@app.post("/api/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    """Chat endpoint — sends user message to LLM with tool use."""
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    # Default context
    context = {"default_site": "Ulm", **req.context}

    try:
        from llm_client import chat_with_tools
        result = chat_with_tools(req.message, req.history, context)
        return ChatResponse(**result)
    except Exception:
        logger.exception("LLM call failed for message: %s", req.message[:100])
        # Fallback: try precomputed responses
        from precomputed import get_precomputed_response
        precomputed = get_precomputed_response(req.message)
        if precomputed:
            return ChatResponse(**precomputed)

        return ChatResponse(
            answer="I had trouble processing that request. Try rephrasing your question.",
            steps=["An internal error occurred"],
        )


@app.get("/api/dashboard")
def dashboard():
    """Dashboard stats for the home screen."""
    from data_access import (
        get_test_count,
        get_distinct_values,
        get_recent_tests,
        get_daily_counts,
        get_monthly_aggregation,
        get_stats_aggregation,
    )
    from db import is_mock
    from tools.utils import parse_date, test_to_summary

    # Determine the reference date (latest test date)
    if is_mock():
        # For mock data, find the latest date
        recent = get_recent_tests(limit=1)
        if recent:
            try:
                latest = parse_date(recent[0].get("TestParametersFlat", {}).get("Date", ""))
            except (ValueError, TypeError):
                latest = datetime.now()
        else:
            latest = datetime.now()
    else:
        # Real DB: use _parsed_date sort
        recent = get_recent_tests(limit=1)
        if recent:
            latest = recent[0].get("TestParametersFlat", {}).get("_parsed_date") or datetime.now()
        else:
            latest = datetime.now()

    week_ago = latest - timedelta(days=7)

    # Tests in last 7 days
    if is_mock():
        # Mock: count via Python since dates are strings
        from data_access import get_tests_with_results
        all_recent = get_tests_with_results({}, limit=500)
        tests_7d = sum(1 for t in all_recent if _get_date(t) >= week_ago)
    else:
        tests_7d = get_test_count({"TestParametersFlat._parsed_date": {"$gte": week_ago}})

    # Materials in DB
    materials = get_distinct_values("TestParametersFlat.MATERIAL")

    # Anomaly detection
    anomalies = _detect_anomalies(latest)

    # Boundary risks
    boundary_risks = _get_boundary_risks()

    # Recent tests for table (last 8)
    recent_tests = get_recent_tests(limit=8)
    recent_table = [
        {
            "date": t.get("TestParametersFlat", {}).get("Date", ""),
            "material": t.get("TestParametersFlat", {}).get("MATERIAL", ""),
            "test_type": t.get("TestParametersFlat", {}).get("TYPE_OF_TESTING_STR", ""),
            "machine": t.get("TestParametersFlat", {}).get("MACHINE", ""),
            "site": t.get("TestParametersFlat", {}).get("SITE", ""),
            "tester": t.get("TestParametersFlat", {}).get("TESTER", ""),
        }
        for t in recent_tests
    ]

    # Sparkline data: daily test counts for the last 14 days
    sparkline = get_daily_counts(days_back=14, reference_date=latest)

    return {
        "tests_last_7_days": tests_7d,
        "anomalies_flagged": len(anomalies),
        "materials_in_db": len(materials),
        "boundary_risks": len(boundary_risks),
        "recent_tests": recent_table,
        "anomalies": anomalies,
        "boundary_risks_detail": boundary_risks,
        "sparkline_tests": sparkline,
    }


def _get_date(t: dict) -> datetime:
    """Extract a datetime from a test document, trying _parsed_date first."""
    # Enriched/real data
    pd = t.get("TestParametersFlat", {}).get("_parsed_date")
    if isinstance(pd, datetime):
        return pd
    # Fallback: parse string date
    from tools.utils import parse_date
    try:
        return parse_date(t.get("TestParametersFlat", {}).get("Date", ""))
    except (ValueError, TypeError):
        return datetime.min


def _detect_anomalies(latest: datetime) -> list[dict]:
    """Find materials where latest tensile_strength_mpa is >15% below 6-month average."""
    from data_access import get_distinct_values, get_monthly_aggregation, get_stats_aggregation

    six_months_ago = latest - timedelta(days=180)
    anomalies = []

    materials = get_distinct_values("TestParametersFlat.MATERIAL")

    for mat in sorted(m for m in materials if m):
        query = {
            "TestParametersFlat.MATERIAL": mat,
            "TestParametersFlat.TYPE_OF_TESTING_STR": "tensile",
        }

        stats = get_stats_aggregation(query, "tensile_strength_mpa")
        if stats["n"] < 5:
            continue

        # Get recent monthly data for comparison
        time_series = get_monthly_aggregation(query, "tensile_strength_mpa", months_back=6)
        if not time_series:
            continue

        avg_6m = sum(pt["mean_value"] for pt in time_series) / len(time_series)
        latest_val = time_series[-1]["mean_value"]

        if latest_val < avg_6m * 0.85:
            pct_below = round((1 - latest_val / avg_6m) * 100)
            anomalies.append({
                "material": mat,
                "issue": f"Tensile strength {pct_below}% below 6-month average",
                "severity": "warning",
            })

    return anomalies


def _get_boundary_risks() -> list[dict]:
    """Check boundary risks for materials with enough data."""
    from tools.boundary_forecast import boundary_forecast
    from data_access import get_distinct_values

    risks = []
    materials = get_distinct_values("TestParametersFlat.MATERIAL")

    # Check top materials for boundary risks on tensile modulus
    for mat in sorted(m for m in materials if m):
        try:
            result = boundary_forecast(mat, "tensile_modulus_mpa", 10.0, months_history=36)
            r = result["result"]
            if r.get("will_violate"):
                risks.append({
                    "material": mat,
                    "property": "tensile_modulus_mpa",
                    "boundary": 10.0,
                    "current": r.get("current_value"),
                    "eta_months": r.get("months_until_violation"),
                })
        except Exception:
            pass
        if len(risks) >= 5:
            break

    return risks


@app.get("/api/insights")
def insights():
    """
    Proactive AI insights — auto-scans all materials for trends and risks,
    returns top insights ranked by severity without the user needing to ask.
    """
    from data_access import get_distinct_values
    from tools.trend_analysis import trend_analysis
    from tools.boundary_forecast import boundary_forecast

    materials = sorted(m for m in get_distinct_values("TestParametersFlat.MATERIAL") if m)

    found_insights = []

    for mat in materials:
        # Trend analysis on tensile strength
        try:
            res = trend_analysis(property="tensile_strength_mpa", material=mat, months_back=18)
            r = res.get("result", {})
            if not r.get("error") and r.get("trend_direction") == "decreasing":
                slope = r.get("slope_per_month", 0)
                r2 = r.get("r_squared", 0)
                if abs(slope) > 0.2 and r2 > 0.4:
                    severity = "critical" if abs(slope) > 0.5 else "warning"
                    found_insights.append({
                        "type": "trend",
                        "severity": severity,
                        "material": mat,
                        "property": "tensile_strength_mpa",
                        "analysis_window_months": 18,
                        "title": f"{mat} tensile strength declining",
                        "detail": f"Dropping ~{abs(slope):.2f} MPa/month (R²={r2:.2f})",
                        "action": f"Is {mat} tensile strength degrading based on the last 18 months?",
                        "sort_key": abs(slope) * r2,
                    })
        except Exception:
            pass

        # Boundary risk on tensile modulus
        try:
            res = boundary_forecast(material=mat, property="tensile_modulus_mpa",
                                    boundary_value=10.0, months_history=36, months_forecast=24)
            r = res.get("result", {})
            if not r.get("error") and r.get("will_violate"):
                eta = r.get("months_until_violation", 99)
                severity = "critical" if eta <= 6 else "warning"
                found_insights.append({
                    "type": "boundary",
                    "severity": severity,
                    "material": mat,
                    "property": "tensile_modulus_mpa",
                    "analysis_window_months": 36,
                    "title": f"{mat} modulus approaching limit",
                    "detail": f"Will cross 10 MPa boundary in ~{eta} months",
                    "action": f"Will {mat} tensile modulus violate 10 MPa boundary based on the last 36 months?",
                    "sort_key": 24 - eta,
                })
        except Exception:
            pass

    # Sort by severity then sort_key, return top 5
    severity_order = {"critical": 0, "warning": 1, "info": 2}
    found_insights.sort(key=lambda x: (severity_order.get(x["severity"], 9), -x.get("sort_key", 0)))

    # Clean up sort_key from output
    for i in found_insights:
        i.pop("sort_key", None)

    return {"insights": found_insights[:5]}


@app.get("/api/health-scores")
def health_scores():
    """
    Material Health Scores — composite 0-100 score per material based on:
    - Trend stability (is the property trending dangerously?)
    - Variability (coefficient of variation — tighter = healthier)
    - Boundary proximity (how far from critical limits?)
    Each factor is scored 0-100, then weighted: stability 40%, variability 30%, boundary 30%.
    """
    import numpy as np
    from data_access import (
        get_distinct_values,
        get_stats_aggregation,
        get_monthly_aggregation,
        get_tests_with_results,
    )
    from tools.utils import extract_property_values

    materials = sorted(
        m for m in get_distinct_values("TestParametersFlat.MATERIAL")
        if m and not m.startswith("#")
    )

    prop = "tensile_strength_mpa"
    results = []

    for mat in materials:
        query = {
            "TestParametersFlat.MATERIAL": mat,
            "TestParametersFlat.TYPE_OF_TESTING_STR": "tensile",
        }

        stats = get_stats_aggregation(query, prop)
        if stats["n"] < 5:
            continue

        mean = stats["mean"]
        std = stats["std"]

        # --- Trend stability score (0-100) ---
        trend_score = 80  # default if not enough data
        slope_val = 0
        time_series = get_monthly_aggregation(query, prop, months_back=36)
        if len(time_series) >= 6:
            x = np.arange(len(time_series))
            y = np.array([pt["mean_value"] for pt in time_series])
            coeffs = np.polyfit(x, y, 1)
            slope_val = float(coeffs[0])
            trend_score = max(0, min(100, 100 - abs(slope_val) * 100))

        # --- Variability score (0-100) ---
        cv = (std / mean * 100) if mean > 0 else 0
        variability_score = max(0, min(100, 100 - cv * 5))

        # --- Boundary proximity score (0-100) ---
        soft_boundary = mean * 0.7
        min_val = stats["min"]
        margin = (min_val - soft_boundary) / (mean - soft_boundary) if (mean - soft_boundary) > 0 else 1
        boundary_score = max(0, min(100, margin * 100))

        # --- Composite ---
        composite = round(trend_score * 0.4 + variability_score * 0.3 + boundary_score * 0.3)

        status = "healthy" if composite >= 75 else "attention" if composite >= 50 else "critical"

        results.append({
            "material": mat,
            "score": composite,
            "status": status,
            "breakdown": {
                "trend_stability": round(trend_score),
                "variability": round(variability_score),
                "boundary_proximity": round(boundary_score),
            },
            "details": {
                "mean": round(mean, 1),
                "std": round(std, 2),
                "cv_pct": round(cv, 1),
                "slope_per_test": round(slope_val, 4),
                "n_tests": stats["n"],
            },
        })

    results.sort(key=lambda x: x["score"])
    return {"scores": results}


@app.get("/api/explore")
def explore(material: str, property: str = "max_force_n"):
    """
    Interactive data explorer — returns time series + stats for a material/property combo.
    Used by the ExploreScreen for real-time interactive charting.
    """
    import numpy as np
    from data_access import (
        get_distinct_values,
        get_monthly_aggregation,
        get_stats_aggregation,
        get_tests_with_results,
    )
    from tools.utils import fuzzy_match_name, infer_test_type_filter, get_property_value
    from schema_map import get_unit

    known = get_distinct_values("TestParametersFlat.MATERIAL")
    material = fuzzy_match_name(material, known)

    query = {"TestParametersFlat.MATERIAL": material, **infer_test_type_filter(property)}

    # Monthly aggregation via data_access (efficient)
    time_series = get_monthly_aggregation(query, property, months_back=120)

    # Stats via aggregation
    stats = get_stats_aggregation(query, property)

    # Individual tests (limited for scatter plot)
    individual_docs = get_tests_with_results(query, properties=[property], limit=2000, sort_by_date=True)
    dated_values = []
    for t in individual_docs:
        p = t.get("TestParametersFlat", {})
        date_str = p.get("Date", "")
        val = get_property_value(t, property)
        if date_str and val is not None:
            try:
                from tools.utils import parse_date
                dt = parse_date(date_str)
                dated_values.append({
                    "date": date_str,
                    "date_iso": dt.strftime("%Y-%m-%d"),
                    "month": f"{dt.year}-{dt.month:02d}",
                    "value": round(float(val), 2),
                    "machine": p.get("MACHINE", ""),
                    "site": p.get("SITE", ""),
                    "tester": p.get("TESTER", ""),
                    "test_id": str(t.get("_id", "")),
                })
            except (ValueError, TypeError):
                pass

    dated_values.sort(key=lambda x: x["date_iso"])

    # Trend line on monthly data
    slope = 0
    intercept = 0
    r_squared = 0
    if len(time_series) >= 2:
        x = np.arange(len(time_series))
        y = np.array([pt["mean_value"] for pt in time_series])
        coeffs = np.polyfit(x, y, 1)
        slope = round(float(coeffs[0]), 4)
        intercept = round(float(coeffs[1]), 2)
        y_pred = np.polyval(coeffs, x)
        ss_res = np.sum((y - y_pred) ** 2)
        ss_tot = np.sum((y - np.mean(y)) ** 2)
        r_squared = round(float(1 - ss_res / ss_tot) if ss_tot > 0 else 0, 3)
        for i, pt in enumerate(time_series):
            pt["trend_value"] = round(float(intercept + slope * i), 2)

    unit = get_unit(property)

    return {
        "material": material,
        "property": property,
        "unit": unit,
        "stats": stats,
        "time_series": time_series,
        "individual_tests": dated_values,
        "trend": {
            "slope": slope,
            "intercept": intercept,
            "r_squared": r_squared,
        },
    }


class GraphBuilderRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=2000)
    history: list[dict] = Field(default=[], max_length=20)
    current_spec: dict | None = None


# ─── Graph Builder LLM helpers ─────────────────────────────────────────────

GRAPH_SPEC_SYSTEM = """You are a graph specification generator for a materials testing database.
Output ONLY a valid JSON object — no markdown, no explanation, no extra keys.

Chart types: bar, line, scatter, histogram, pie

Properties (use exact keys):
- tensile_strength_mpa    = Tensile Strength (MPa), tensile tests only
- tensile_modulus_mpa     = Tensile Modulus (MPa), tensile tests only
- elongation_at_break_pct = Elongation at Break (%), tensile tests only
- impact_energy_j         = Impact Energy (J), charpy/impact tests only
- max_force_n             = Max Force (N), all test types

JSON schema (include ALL fields):
{
  "chart_type": "bar",
  "property": "tensile_strength_mpa",
  "property_y": null,
  "materials": [],
  "group_by": "material",
  "title": "",
  "date_from": null,
  "date_to": null,
  "customer": null,
  "site": null,
  "sort": "desc",
  "bins": 10,
  "limit": 20
}

Rules:
- materials: [] means all; ["Steel","FEP"] means only those two
- group_by applies to bar and pie: material | test_type | customer | standard
- property_y is the Y-axis for scatter plots; null otherwise
- title: "" = auto-generate from the data
- sort: desc = highest first, asc = lowest first, alpha = alphabetical
- bins: number of histogram buckets (5–30)
- limit: max bars/slices shown (5–50)
- date_from / date_to: use DD.MM.YYYY format if provided
- When modifying an existing spec: keep all unchanged fields exactly as-is
"""


def _call_llm_for_spec(
    prompt: str,
    current_spec: dict | None,
    history: list[dict],
    materials: list[str],
) -> dict:
    """Ask the LLM to produce or update a graph spec from a natural language prompt."""
    import json as _json
    from openai import OpenAI

    client = OpenAI()

    # Build a clean display name for each material (newlines/commas corrupt comma-joined lists)
    # Keep a mapping so we can restore original DB names after the LLM responds.
    clean_to_original: dict[str, str] = {}
    for m in materials[:60]:
        clean = m.replace("\r\n", " ").replace("\n", " ").replace("\r", " ").strip()
        clean_to_original[clean] = m

    mat_list = "\n".join(f"- {c}" for c in clean_to_original)
    if len(materials) > 60:
        mat_list += f"\n... (+{len(materials) - 60} more)"

    messages = [
        {"role": "system", "content": GRAPH_SPEC_SYSTEM + f"\n\nAvailable materials:\n{mat_list}"},
    ]
    for h in history[-6:]:
        if h.get("role") in ("user", "assistant"):
            messages.append({"role": h["role"], "content": str(h.get("content", ""))[:500]})

    user_content = prompt
    if current_spec:
        user_content = f"Current spec: {_json.dumps(current_spec)}\n\nUser request: {prompt}"
    messages.append({"role": "user", "content": user_content})

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        response_format={"type": "json_object"},
        temperature=0,
        max_tokens=400,
    )
    raw = response.choices[0].message.content
    spec = _json.loads(raw)

    # Sanitise: ensure required fields exist with safe defaults
    defaults = {
        "chart_type": "bar", "property": "tensile_strength_mpa",
        "property_y": None, "materials": [], "group_by": "material",
        "title": "", "date_from": None, "date_to": None,
        "customer": None, "site": None, "sort": "desc", "bins": 10, "limit": 20,
    }
    for k, v in defaults.items():
        spec.setdefault(k, v)
    spec["bins"] = max(5, min(30, int(spec.get("bins") or 10)))
    spec["limit"] = max(5, min(50, int(spec.get("limit") or 20)))

    # Map LLM-returned material names back to original DB values.
    # The LLM sees sanitized names (newlines stripped); resolve back via exact
    # lookup first, then fuzzy match against original names.
    if spec.get("materials"):
        from tools.utils import fuzzy_match_name
        original_names = list(clean_to_original.values())
        resolved = []
        for llm_name in spec["materials"]:
            # exact match against cleaned names
            if llm_name in clean_to_original:
                resolved.append(clean_to_original[llm_name])
            else:
                # fuzzy match against original names (handles minor LLM rephrasing)
                resolved.append(fuzzy_match_name(llm_name, original_names))
        spec["materials"] = resolved

    return spec


PROP_LABELS = {
    "tensile_strength_mpa": "Tensile Strength (MPa)",
    "tensile_modulus_mpa": "Tensile Modulus (MPa)",
    "elongation_at_break_pct": "Elongation at Break (%)",
    "impact_energy_j": "Impact Energy (J)",
    "max_force_n": "Max Force (N)",
}


def _test_type_for(prop: str) -> str | None:
    if prop in ("tensile_strength_mpa", "tensile_modulus_mpa", "elongation_at_break_pct"):
        return "tensile"
    if prop == "impact_energy_j":
        return "charpy"
    return None


def _fetch_data_for_spec(spec: dict, all_materials: list[str]) -> tuple:
    """Execute DB queries for a spec and return (series, title, x_label, y_label, explanation)."""
    import numpy as np
    from data_access import (
        get_distinct_values, get_monthly_aggregation, get_stats_aggregation,
        get_enriched_stats_aggregation, get_enriched_property_values,
        get_tests_with_results, get_grouped_counts,
    )
    from tools.utils import extract_property_values, get_property_value, build_date_filter

    chart_type = spec["chart_type"]
    prop = spec["property"]
    prop_y = spec.get("property_y")
    materials = spec["materials"] or all_materials
    group_by = spec.get("group_by", "material")
    sort = spec.get("sort", "desc")
    limit = spec["limit"]
    bins = spec["bins"]

    y_label = PROP_LABELS.get(prop, prop.replace("_", " ").title())
    title = spec.get("title", "") or ""

    def base_query(mat=None):
        q = {}
        if mat:
            q["TestParametersFlat.MATERIAL"] = mat
        if spec.get("customer"):
            q["TestParametersFlat.CUSTOMER"] = spec["customer"]
        if spec.get("site"):
            q["TestParametersFlat.SITE"] = spec["site"]
        if spec.get("date_from") or spec.get("date_to"):
            q.update(build_date_filter(None, spec.get("date_from"), spec.get("date_to")))
        tt = _test_type_for(prop)
        if tt:
            q["TestParametersFlat.TYPE_OF_TESTING_STR"] = tt
        return q

    def _sort(data, key="mean"):
        if sort == "desc":
            data.sort(key=lambda x: x[key], reverse=True)
        elif sort == "asc":
            data.sort(key=lambda x: x[key])
        elif sort == "alpha":
            data.sort(key=lambda x: x["name"])

    series = []
    x_label = ""
    explanation = ""

    if chart_type == "bar":
        x_label = group_by.replace("_", " ").title() if group_by != "material" else "Material"
        group_field_map = {
            "material": ("TestParametersFlat.MATERIAL", materials[:limit]),
            "test_type": ("TestParametersFlat.TYPE_OF_TESTING_STR", None),
            "customer": ("TestParametersFlat.CUSTOMER", None),
            "standard": ("TestParametersFlat.STANDARD", None),
        }
        field_path, group_values = group_field_map.get(group_by, group_field_map["material"])
        if group_values is None:
            group_values = [g for g in get_distinct_values(field_path) if g][:limit]

        bar_data = []
        for group_val in group_values:
            q = {**base_query(), field_path: group_val}
            stats = get_stats_aggregation(q, prop)
            if stats["n"] == 0:
                stats = get_enriched_stats_aggregation(q, prop)
            if stats["n"] > 0:
                bar_data.append({"name": group_val, "mean": stats["mean"], "std": stats["std"], "n": stats["n"]})

        _sort(bar_data)
        series = [{"name": "mean", "data": bar_data}]
        if not title:
            title = f"{y_label} by {x_label}"
        explanation = f"Comparing {y_label} across {len(bar_data)} {group_by.replace('_', ' ')}(s). Error bars = ±1 std dev."

    elif chart_type == "line":
        x_label = "Month"
        if not title:
            title = f"{y_label} Over Time"
        for mat in materials:
            pts = [{"x": p["date"], "y": p["mean_value"], "n": p["n"]}
                   for p in get_monthly_aggregation(base_query(mat), prop, months_back=120)]
            if pts:
                series.append({"name": mat, "data": pts})
        names = [s["name"] for s in series]
        explanation = f"Monthly average {y_label} over time for {', '.join(names[:5])}{'...' if len(names) > 5 else ''}."

    elif chart_type == "scatter":
        if not prop_y:
            prop_y = "elongation_at_break_pct"
        x_label = PROP_LABELS.get(prop, prop)
        y_label = PROP_LABELS.get(prop_y, prop_y)
        if not title:
            title = f"{x_label} vs {y_label}"
        for mat in materials:
            q = base_query(mat)
            q.pop("TestParametersFlat.TYPE_OF_TESTING_STR", None)
            tests = get_tests_with_results(q, properties=[prop, prop_y], limit=2000)
            pts = []
            for t in tests:
                vx, vy = get_property_value(t, prop), get_property_value(t, prop_y)
                if vx is not None and vy is not None:
                    try:
                        pts.append({"x": round(float(vx), 2), "y": round(float(vy), 2)})
                    except (TypeError, ValueError):
                        pass
            if pts:
                series.append({"name": mat, "data": pts})
        explanation = f"Scatter: {x_label} vs {y_label}. Each point = one test."

    elif chart_type == "histogram":
        x_label = y_label
        y_label = "Frequency"
        if not title:
            title = f"Distribution of {x_label}"
        all_vals = []
        for mat in materials:
            q = base_query(mat)
            vals = extract_property_values(get_tests_with_results(q, properties=[prop], limit=5000), prop)
            if not vals:
                vals = get_enriched_property_values(q, prop, limit=5000)
            all_vals.extend(vals)
        if all_vals:
            arr = np.array(all_vals)
            n_bins = min(bins, max(5, int(np.ceil(np.sqrt(len(arr))))))
            counts, edges = np.histogram(arr, bins=n_bins)
            series = [{"name": "distribution", "data": [
                {"range": f"{edges[i]:.1f}-{edges[i+1]:.1f}", "count": int(counts[i]),
                 "mid": round(float((edges[i] + edges[i + 1]) / 2), 2)}
                for i in range(len(counts))
            ]}]
        explanation = f"Distribution of {x_label} across {len(all_vals)} tests."

    elif chart_type == "pie":
        group_field_map = {
            "material": "TestParametersFlat.MATERIAL",
            "test_type": "TestParametersFlat.TYPE_OF_TESTING_STR",
            "customer": "TestParametersFlat.CUSTOMER",
            "standard": "TestParametersFlat.STANDARD",
        }
        field_path = group_field_map.get(group_by, "TestParametersFlat.MATERIAL")
        grouped = get_grouped_counts(field_path, query=base_query())
        data = [{"name": g["name"], "value": g["count"]}
                for g in grouped if g["name"] not in (None, "", "unknown")][:limit]
        if sort == "desc":
            data.sort(key=lambda x: x["value"], reverse=True)
        elif sort == "asc":
            data.sort(key=lambda x: x["value"])
        elif sort == "alpha":
            data.sort(key=lambda x: x["name"])
        series = [{"name": "pie", "data": data}]
        total = sum(d["value"] for d in data)
        if not title:
            title = f"Tests by {group_by.replace('_', ' ').title()}"
        explanation = f"Distribution of {total:,} tests by {group_by.replace('_', ' ')}."

    return series, title, x_label, y_label, explanation


def _followup_suggestions(spec: dict) -> list[str]:
    """Return contextual follow-up prompt suggestions based on the current spec."""
    ct = spec.get("chart_type", "bar")
    prop = spec.get("property", "tensile_strength_mpa")
    mats = spec.get("materials", [])

    suggestions = {
        "bar": [
            "Sort alphabetically",
            "Show only top 10",
            "Group by test type instead",
            "Switch to line chart over time",
            "Filter to last 2 years",
        ],
        "line": [
            "Show only from 2022 to 2024",
            "Add another material",
            "Switch to bar chart",
            "Show tensile modulus instead",
        ],
        "scatter": [
            "Change Y axis to elongation at break",
            "Show only one material",
            "Switch to histogram",
        ],
        "histogram": [
            "Use 20 bins",
            "Filter to tensile tests only",
            "Show only Steel",
            "Switch to bar chart",
        ],
        "pie": [
            "Group by customer instead",
            "Group by test type",
            "Group by standard",
            "Show top 15 only",
        ],
    }
    base = suggestions.get(ct, [])

    # Add a material-specific suggestion if materials are set
    if mats:
        other_props = [p for p in PROP_LABELS if p != prop]
        if other_props:
            label = PROP_LABELS[other_props[0]].split(" (")[0]
            base = [f"Show {label} instead"] + base[:3]

    return base[:4]


@app.post("/api/graph-builder")
def graph_builder(req: GraphBuilderRequest):
    """
    LLM-powered graph builder. The LLM produces/updates a structured graph spec
    from natural language; the backend executes DB queries to populate it with data.
    """
    from data_access import get_distinct_values

    materials = sorted(m for m in get_distinct_values("TestParametersFlat.MATERIAL") if m)

    try:
        spec = _call_llm_for_spec(req.prompt, req.current_spec, req.history, materials)
    except Exception:
        logger.exception("LLM spec generation failed")
        return {
            "success": False,
            "message": "Could not interpret your request. Try something like: 'bar chart of tensile strength by material'.",
            "suggestions": ["Bar chart of tensile strength by material", "Histogram of max force distribution", "Pie chart of tests by test type"],
        }

    try:
        series, title, x_label, y_label, explanation = _fetch_data_for_spec(spec, materials)
    except Exception:
        logger.exception("Data fetch failed for spec: %s", spec)
        return {
            "success": False,
            "message": "Failed to fetch data for this chart. Check the server logs for details.",
            "spec": spec,
            "suggestions": ["Bar chart of tensile strength by material", "Histogram of max force distribution"],
        }

    has_data = any(s.get("data") for s in series)
    if not has_data:
        prop_label = PROP_LABELS.get(spec["property"], spec["property"])
        return {
            "success": False,
            "message": f"No data found for {prop_label} with the filters you specified. Try different materials or a different property.",
            "suggestions": [
                "Bar chart of tensile strength by material",
                "Histogram of max force distribution",
                "Pie chart of tests by material",
                f"Show {', '.join(materials[:3])} on a line chart",
            ],
            "spec": spec,
        }

    followups = _followup_suggestions(spec)

    return {
        "success": True,
        "chart_type": spec["chart_type"],
        "title": title,
        "x_label": x_label,
        "y_label": y_label,
        "series": series,
        "explanation": explanation,
        "spec": spec,
        "followups": followups,
        "message": f"Here's your {spec['chart_type']} chart: {title}",
    }


@app.get("/api/materials")
def materials_list():
    """List all distinct material names in the database."""
    from data_access import get_distinct_values
    mats = sorted(m for m in get_distinct_values("TestParametersFlat.MATERIAL") if m and not m.startswith("#"))
    return {"materials": mats}


@app.get("/api/standards")
def standards():
    """List distinct standards with test counts."""
    from data_access import get_grouped_counts
    from schema_map import STANDARD_TO_TEST_TYPE

    grouped = get_grouped_counts("TestParametersFlat.STANDARD")

    result = []
    for g in grouped:
        std_name = g["name"]
        test_type = None
        # Match against known standards
        for pattern, tt in STANDARD_TO_TEST_TYPE.items():
            if pattern.lower() in std_name.lower():
                test_type = tt
                break
        result.append({
            "standard": std_name,
            "count": g["count"],
            "test_type": test_type,
        })

    return {"standards": result}
