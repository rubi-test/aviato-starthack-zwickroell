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
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
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

    materials = sorted(m for m in get_distinct_values("TestParametersFlat.MATERIAL") if m)

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


@app.post("/api/graph-builder")
def graph_builder(req: GraphBuilderRequest):
    """
    AI-powered graph builder — interprets natural language requests and returns
    chart configuration + data. Supports incremental updates via current_spec.
    """
    import numpy as np
    from data_access import (
        get_distinct_values,
        get_monthly_aggregation,
        get_stats_aggregation,
        get_tests_with_results,
        get_grouped_counts,
    )
    from tools.utils import fuzzy_match_name, get_property_value
    from schema_map import get_unit

    # Available materials and properties
    materials = sorted(m for m in get_distinct_values("TestParametersFlat.MATERIAL") if m)

    properties = [
        "tensile_strength_mpa", "tensile_modulus_mpa",
        "elongation_at_break_pct", "impact_energy_j", "max_force_n",
    ]
    property_labels = {
        "tensile_strength_mpa": "Tensile Strength (MPa)",
        "tensile_modulus_mpa": "Tensile Modulus (MPa)",
        "elongation_at_break_pct": "Elongation at Break (%)",
        "impact_energy_j": "Impact Energy (J)",
        "max_force_n": "Max Force (N)",
    }

    prompt_lower = req.prompt.lower()
    spec = req.current_spec

    # ─── Detect modification intent ────────────────────────────────────────
    is_add = any(w in prompt_lower for w in ["add ", "also ", "include ", "overlay ", "plus ", "and also", "additionally", "as well", "too", "along with"])
    is_remove = any(w in prompt_lower for w in ["remove ", "drop ", "exclude ", "without ", "hide ", "take off", "take away", "get rid of"])
    is_change_type = any(w in prompt_lower for w in ["change to ", "switch to ", "make it a ", "convert to ", "show as "])
    is_clear = any(w in prompt_lower for w in ["clear", "reset", "start over", "new graph", "from scratch"])
    has_spec = spec is not None and not is_clear

    # ─── Simple NLP parser to extract intent ───────────────────────────────
    prompt_chart_type = None
    if any(w in prompt_lower for w in ["scatter", "correlation", "vs", "versus"]):
        prompt_chart_type = "scatter"
    elif any(w in prompt_lower for w in ["bar", "compare", "comparison", "group"]):
        prompt_chart_type = "bar"
    elif any(w in prompt_lower for w in ["histogram", "distribution"]):
        prompt_chart_type = "histogram"
    elif any(w in prompt_lower for w in ["pie", "breakdown", "proportion"]):
        prompt_chart_type = "pie"
    elif any(w in prompt_lower for w in ["line", "trend", "over time", "time series"]):
        prompt_chart_type = "line"

    # Find mentioned materials
    prompt_materials = [m for m in materials if m.lower() in prompt_lower]

    # Find mentioned properties
    prop_aliases = {
        "tensile strength": "tensile_strength_mpa",
        "tensile modulus": "tensile_modulus_mpa",
        "modulus": "tensile_modulus_mpa",
        "elongation": "elongation_at_break_pct",
        "impact energy": "impact_energy_j",
        "impact": "impact_energy_j",
        "charpy": "impact_energy_j",
        "max force": "max_force_n",
        "force": "max_force_n",
        "strength": "tensile_strength_mpa",
        "mpa": "tensile_strength_mpa",
    }

    prompt_props = []
    for alias, prop in prop_aliases.items():
        if alias in prompt_lower and prop not in prompt_props:
            prompt_props.append(prop)

    # ─── Resolve final spec by merging with current_spec ───────────────────
    is_modification = has_spec and (is_add or is_remove or is_change_type)
    is_full_fresh = prompt_chart_type and prompt_materials and prompt_props

    if has_spec and not is_clear and not is_full_fresh:
        existing_materials = spec.get("materials", [])
        existing_props = spec.get("properties", ["tensile_strength_mpa"])
        chart_type = prompt_chart_type or spec.get("chart_type", "line")

        if is_add and prompt_materials:
            mentioned_materials = list(dict.fromkeys(existing_materials + prompt_materials))
        elif is_remove and prompt_materials:
            mentioned_materials = [m for m in existing_materials if m not in prompt_materials]
            if not mentioned_materials:
                mentioned_materials = existing_materials
        elif prompt_materials and not is_add and not is_remove:
            mentioned_materials = prompt_materials
        else:
            mentioned_materials = existing_materials

        if is_add and prompt_props:
            mentioned_props = list(dict.fromkeys(existing_props + prompt_props))
        elif is_remove and prompt_props:
            mentioned_props = [p for p in existing_props if p not in prompt_props]
            if not mentioned_props:
                mentioned_props = existing_props
        elif prompt_props:
            mentioned_props = prompt_props
        else:
            mentioned_props = existing_props
    else:
        chart_type = prompt_chart_type or "line"
        mentioned_materials = prompt_materials if prompt_materials else materials
        mentioned_props = prompt_props if prompt_props else ["tensile_strength_mpa"]

    def test_type_for_prop(prop):
        if "impact" in prop or "charpy" in prop.lower():
            return "charpy"
        return "tensile"

    # ─── Build data based on chart type (using data_access) ────────────────
    series = []
    explanation = ""
    x_label = ""
    y_label = property_labels.get(mentioned_props[0], mentioned_props[0])
    title = ""

    if chart_type == "scatter" and len(mentioned_props) >= 2:
        prop_x = mentioned_props[0]
        prop_y = mentioned_props[1]
        x_label = property_labels.get(prop_x, prop_x)
        y_label = property_labels.get(prop_y, prop_y)
        title = f"{x_label} vs {y_label}"

        for mat in mentioned_materials:
            tt = test_type_for_prop(prop_x)
            query = {
                "TestParametersFlat.MATERIAL": mat,
                "TestParametersFlat.TYPE_OF_TESTING_STR": tt,
            }
            tests = get_tests_with_results(query, properties=[prop_x, prop_y], limit=2000)
            points = []
            for t in tests:
                vx = get_property_value(t, prop_x)
                vy = get_property_value(t, prop_y)
                if vx is not None and vy is not None:
                    try:
                        points.append({"x": round(float(vx), 2), "y": round(float(vy), 2)})
                    except (TypeError, ValueError):
                        pass
            if points:
                series.append({"name": mat, "data": points})

        explanation = f"Scatter plot of {x_label} vs {y_label} for {', '.join(mentioned_materials)}. Each point represents one test."

    elif chart_type == "bar":
        prop = mentioned_props[0]
        title = f"{y_label} by Material"
        x_label = "Material"
        bar_data = []
        for mat in mentioned_materials:
            tt = test_type_for_prop(prop)
            query = {
                "TestParametersFlat.MATERIAL": mat,
                "TestParametersFlat.TYPE_OF_TESTING_STR": tt,
            }
            stats = get_stats_aggregation(query, prop)
            if stats["n"] > 0:
                bar_data.append({
                    "name": mat,
                    "mean": stats["mean"],
                    "std": stats["std"],
                    "n": stats["n"],
                })
        series = [{"name": "comparison", "data": bar_data}]
        explanation = f"Bar chart comparing {y_label} across {len(mentioned_materials)} materials. Error bars show ±1 standard deviation."

    elif chart_type == "histogram":
        prop = mentioned_props[0]
        title = f"Distribution of {y_label}"
        x_label = y_label
        y_label = "Frequency"
        all_vals = []
        for mat in mentioned_materials:
            tt = test_type_for_prop(prop)
            query = {
                "TestParametersFlat.MATERIAL": mat,
                "TestParametersFlat.TYPE_OF_TESTING_STR": tt,
            }
            tests = get_tests_with_results(query, properties=[prop], limit=5000)
            from tools.utils import extract_property_values
            all_vals.extend(extract_property_values(tests, prop))

        if all_vals:
            arr = np.array(all_vals)
            n_bins = min(15, max(5, int(np.ceil(np.sqrt(len(arr))))))
            counts, edges = np.histogram(arr, bins=n_bins)
            bins_data = []
            for i in range(len(counts)):
                bins_data.append({
                    "range": f"{edges[i]:.1f}-{edges[i+1]:.1f}",
                    "count": int(counts[i]),
                    "mid": round(float((edges[i] + edges[i+1]) / 2), 2),
                })
            series = [{"name": "distribution", "data": bins_data}]
        explanation = f"Histogram showing the distribution of {property_labels.get(prop, prop)} across {len(all_vals)} tests."

    elif chart_type == "pie":
        title = "Test Distribution"
        if any(w in prompt_lower for w in ["type", "test type", "testing"]):
            grouped = get_grouped_counts("TestParametersFlat.TYPE_OF_TESTING_STR")
            known = [g for g in grouped if g["name"] != "unknown"]
            excluded = sum(g["count"] for g in grouped if g["name"] == "unknown")
            series = [{"name": "by_type", "data": [{"name": g["name"], "value": g["count"]} for g in known]}]
            total = sum(g["count"] for g in known)
            explanation = f"Pie chart showing test distribution by test type across {total:,} tests."
            if excluded:
                explanation += f" ({excluded:,} tests with no test type excluded.)"
        elif any(w in prompt_lower for w in ["standard", "norm", "iso", "din", "astm"]):
            grouped = get_grouped_counts("TestParametersFlat.STANDARD")
            known = [g for g in grouped if g["name"] != "unknown"]
            excluded = sum(g["count"] for g in grouped if g["name"] == "unknown")
            series = [{"name": "by_standard", "data": [{"name": g["name"], "value": g["count"]} for g in known[:15]]}]
            total = sum(g["count"] for g in known)
            explanation = f"Pie chart showing test distribution by standard across {total:,} tests (top 15 shown)."
            if excluded:
                explanation += f" ({excluded:,} tests with no standard excluded.)"
        elif any(w in prompt_lower for w in ["customer", "company"]):
            grouped = get_grouped_counts("TestParametersFlat.CUSTOMER")
            known = [g for g in grouped if g["name"] != "unknown"]
            excluded = sum(g["count"] for g in grouped if g["name"] == "unknown")
            series = [{"name": "by_customer", "data": [{"name": g["name"], "value": g["count"]} for g in known[:15]]}]
            total = sum(g["count"] for g in known)
            explanation = f"Pie chart showing test distribution by customer across {total:,} tests (top 15 shown)."
            if excluded:
                explanation += f" ({excluded:,} tests with no customer excluded.)"
        else:
            grouped = get_grouped_counts("TestParametersFlat.MATERIAL")
            known = [g for g in grouped if g["name"] != "unknown"]
            excluded = sum(g["count"] for g in grouped if g["name"] == "unknown")
            series = [{"name": "by_material", "data": [{"name": g["name"], "value": g["count"]} for g in known]}]
            total = sum(g["count"] for g in known)
            explanation = f"Pie chart showing test distribution by material across {total:,} tests."
            if excluded:
                explanation += f" ({excluded:,} tests with no material field excluded.)"

    else:
        # Line: time series via monthly aggregation
        prop = mentioned_props[0]
        title = f"{y_label} Over Time"
        x_label = "Month"

        for mat in mentioned_materials:
            tt = test_type_for_prop(prop)
            query = {
                "TestParametersFlat.MATERIAL": mat,
                "TestParametersFlat.TYPE_OF_TESTING_STR": tt,
            }
            time_series = get_monthly_aggregation(query, prop, months_back=120)
            points = [{"x": pt["date"], "y": pt["mean_value"], "n": pt["n"]} for pt in time_series]
            if points:
                series.append({"name": mat, "data": points})

        explanation = f"Time series of monthly average {y_label} for {', '.join([s['name'] for s in series])}."

    # Check if we actually have data
    has_data = any(s.get("data") for s in series)
    if not has_data:
        suggestions = []
        if not mentioned_materials:
            suggestions.append("Specify a material (e.g., Steel, FEP, Spur+ 1015)")
        if chart_type == "scatter" and len(mentioned_props) < 2:
            suggestions.append("For scatter plots, mention two properties (e.g., 'tensile strength vs elongation')")
        suggestions.append(f"Available materials: {', '.join(materials[:10])}")
        suggestions.append(f"Available properties: {', '.join(property_labels.values())}")

        return {
            "success": False,
            "message": "I couldn't build that graph — no matching data found for your request.",
            "suggestions": suggestions,
            "available": {
                "materials": materials,
                "properties": list(property_labels.keys()),
                "property_labels": property_labels,
                "chart_types": ["line", "bar", "scatter", "histogram", "pie"],
            },
        }

    resolved_spec = {
        "chart_type": chart_type,
        "materials": mentioned_materials,
        "properties": mentioned_props,
    }

    return {
        "success": True,
        "chart_type": chart_type,
        "title": title,
        "x_label": x_label,
        "y_label": y_label,
        "series": series,
        "explanation": explanation,
        "spec": resolved_spec,
        "message": f"Here's your {chart_type} chart: {title}",
        "available": {
            "materials": materials,
            "properties": list(property_labels.keys()),
            "property_labels": property_labels,
            "chart_types": ["line", "bar", "scatter", "histogram", "pie"],
        },
    }


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
