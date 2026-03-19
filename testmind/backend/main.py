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
    from db import get_collection
    from tools.utils import parse_date

    tests_col = get_collection("Tests")
    all_tests = list(tests_col.find())

    # Find the latest test date in DB
    dates = []
    for t in all_tests:
        date_str = t.get("TestParametersFlat", {}).get("Date")
        if date_str:
            try:
                dates.append(parse_date(date_str))
            except ValueError:
                pass

    latest = max(dates) if dates else datetime.now()
    week_ago = latest - timedelta(days=7)

    # Tests in last 7 days (relative to latest test in DB)
    recent = [t for t in all_tests if _test_after(t, week_ago)]

    # Materials in DB
    materials = set()
    for t in all_tests:
        m = t.get("TestParametersFlat", {}).get("MATERIAL")
        if m:
            materials.add(m)

    # Anomaly detection: materials where latest test is >15% below 6-month average
    anomalies = _detect_anomalies(all_tests, latest)

    # Boundary risks
    boundary_risks = _get_boundary_risks()

    # Recent tests for table (last 8)
    recent_sorted = sorted(all_tests, key=lambda t: _get_date(t), reverse=True)[:8]
    recent_table = []
    for t in recent_sorted:
        p = t.get("TestParametersFlat", {})
        recent_table.append({
            "date": p.get("Date", ""),
            "material": p.get("MATERIAL", ""),
            "test_type": p.get("TYPE_OF_TESTING_STR", ""),
            "machine": p.get("MACHINE", ""),
            "site": p.get("SITE", ""),
            "tester": p.get("TESTER", ""),
        })

    # Sparkline data: daily test counts for the last 30 days
    sparkline_days = 14
    sparkline = []
    for day_offset in range(sparkline_days - 1, -1, -1):
        day = latest - timedelta(days=day_offset)
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        count = sum(1 for t in all_tests if day_start <= _get_date(t) < day_end)
        sparkline.append(count)

    return {
        "tests_last_7_days": len(recent),
        "anomalies_flagged": len(anomalies),
        "materials_in_db": len(materials),
        "boundary_risks": len(boundary_risks),
        "recent_tests": recent_table,
        "anomalies": anomalies,
        "boundary_risks_detail": boundary_risks,
        "sparkline_tests": sparkline,
    }


def _get_date(t: dict) -> datetime:
    from tools.utils import parse_date
    try:
        return parse_date(t.get("TestParametersFlat", {}).get("Date", ""))
    except (ValueError, TypeError):
        return datetime.min


def _test_after(t: dict, cutoff: datetime) -> bool:
    return _get_date(t) >= cutoff


def _detect_anomalies(all_tests: list[dict], latest: datetime) -> list[dict]:
    """Find materials where latest tensile_strength_mpa is >15% below 6-month average."""
    import numpy as np
    from tools.utils import parse_date

    six_months_ago = latest - timedelta(days=180)
    anomalies = []

    materials = set(t.get("TestParametersFlat", {}).get("MATERIAL") for t in all_tests)
    materials.discard(None)

    for mat in sorted(materials):
        mat_tests = [t for t in all_tests
                     if t.get("TestParametersFlat", {}).get("MATERIAL") == mat
                     and t.get("TestParametersFlat", {}).get("TYPE_OF_TESTING_STR") == "tensile"]

        if len(mat_tests) < 5:
            continue

        # Get 6-month values
        recent_vals = []
        all_vals = []
        for t in mat_tests:
            val = t.get("TestParametersFlat", {}).get("tensile_strength_mpa")
            if val is None:
                continue
            dt = _get_date(t)
            all_vals.append(val)
            if dt >= six_months_ago:
                recent_vals.append((dt, val))

        if not recent_vals or not all_vals:
            continue

        avg_6m = np.mean([v for _, v in recent_vals])
        latest_val = max(recent_vals, key=lambda x: x[0])[1]

        if latest_val < avg_6m * 0.85:
            pct_below = round((1 - latest_val / avg_6m) * 100)
            anomalies.append({
                "material": mat,
                "issue": f"Tensile strength {pct_below}% below 6-month average",
                "severity": "warning",
            })

    return anomalies


def _get_boundary_risks() -> list[dict]:
    """Check boundary risks for known materials."""
    from tools.boundary_forecast import boundary_forecast

    risks = []

    # Check FancyPlast 42 tensile modulus approaching 10 MPa
    result = boundary_forecast("FancyPlast 42", "tensile_modulus_mpa", 10.0, months_history=36)
    r = result["result"]
    if r.get("will_violate"):
        risks.append({
            "material": "FancyPlast 42",
            "property": "tensile_modulus_mpa",
            "boundary": 10.0,
            "current": r.get("current_value"),
            "eta_months": r.get("months_until_violation"),
        })

    return risks


@app.get("/api/insights")
def insights():
    """
    Proactive AI insights — auto-scans all materials for trends and risks,
    returns top insights ranked by severity without the user needing to ask.
    """
    import numpy as np
    from db import get_collection
    from tools.trend_analysis import trend_analysis
    from tools.boundary_forecast import boundary_forecast

    tests_col = get_collection("Tests")
    materials = sorted(set(
        t.get("TestParametersFlat", {}).get("MATERIAL")
        for t in tests_col.find()
        if t.get("TestParametersFlat", {}).get("MATERIAL")
    ))

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
                        "title": f"{mat} tensile strength declining",
                        "detail": f"Dropping ~{abs(slope):.2f} MPa/month (R²={r2:.2f})",
                        "action": f"Is {mat} tensile strength degrading?",
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
                    "title": f"{mat} modulus approaching limit",
                    "detail": f"Will cross 10 MPa boundary in ~{eta} months",
                    "action": f"Will {mat} tensile modulus violate 10 MPa boundary?",
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
    from db import get_collection
    from tools.utils import parse_date, extract_property_values

    tests_col = get_collection("Tests")
    all_tests = list(tests_col.find())

    materials = sorted(set(
        t.get("TestParametersFlat", {}).get("MATERIAL")
        for t in all_tests
        if t.get("TestParametersFlat", {}).get("MATERIAL")
    ))

    prop = "tensile_strength_mpa"
    results = []

    for mat in materials:
        mat_tests = [
            t for t in all_tests
            if t.get("TestParametersFlat", {}).get("MATERIAL") == mat
            and t.get("TestParametersFlat", {}).get("TYPE_OF_TESTING_STR") == "tensile"
        ]

        vals = [
            t["TestParametersFlat"][prop]
            for t in mat_tests
            if t.get("TestParametersFlat", {}).get(prop) is not None
        ]

        if len(vals) < 5:
            continue

        arr = np.array(vals, dtype=float)
        mean = float(np.mean(arr))
        std = float(np.std(arr, ddof=1)) if len(arr) > 1 else 0

        # --- Trend stability score (0-100) ---
        # Get monthly means, fit linear regression, score based on slope magnitude
        dated = []
        for t in mat_tests:
            p = t.get("TestParametersFlat", {})
            v = p.get(prop)
            d = p.get("Date")
            if v is not None and d:
                try:
                    dt = parse_date(d)
                    dated.append((dt, float(v)))
                except (ValueError, TypeError):
                    pass
        dated.sort(key=lambda x: x[0])

        trend_score = 80  # default if not enough data
        slope_val = 0
        if len(dated) >= 6:
            x = np.arange(len(dated))
            y = np.array([v for _, v in dated])
            coeffs = np.polyfit(x, y, 1)
            slope_val = float(coeffs[0])
            # Normalize: slope of 0 = 100, slope of ±1 = 0
            trend_score = max(0, min(100, 100 - abs(slope_val) * 100))

        # --- Variability score (0-100) ---
        cv = (std / mean * 100) if mean > 0 else 0  # coefficient of variation %
        # CV of 0% = 100, CV of 20%+ = 0
        variability_score = max(0, min(100, 100 - cv * 5))

        # --- Boundary proximity score (0-100) ---
        # How far is the mean from a critical lower boundary (e.g. 10 MPa for modulus)
        # For tensile strength, use 80% of the overall mean as a "soft boundary"
        soft_boundary = mean * 0.7
        min_val = float(np.min(arr))
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
                "n_tests": len(vals),
            },
        })

    results.sort(key=lambda x: x["score"])
    return {"scores": results}


@app.get("/api/explore")
def explore(material: str, property: str = "tensile_strength_mpa"):
    """
    Interactive data explorer — returns time series + stats for a material/property combo.
    Used by the ExploreScreen for real-time interactive charting.
    """
    import numpy as np
    from db import get_collection
    from tools.utils import fuzzy_match_name, parse_date, infer_test_type_filter, extract_property_values

    tests_col = get_collection("Tests")
    known = tests_col.distinct("TestParametersFlat.MATERIAL")
    material = fuzzy_match_name(material, known)

    query = {"TestParametersFlat.MATERIAL": material, **infer_test_type_filter(property)}
    all_tests = list(tests_col.find(query))

    # Extract dated values
    dated_values = []
    for t in all_tests:
        p = t.get("TestParametersFlat", {})
        date_str = p.get("Date")
        val = p.get(property)
        if date_str and val is not None:
            try:
                dt = parse_date(date_str)
                dated_values.append({
                    "date": date_str,
                    "date_iso": dt.strftime("%Y-%m-%d"),
                    "month": f"{dt.year}-{dt.month:02d}",
                    "value": round(float(val), 2),
                    "machine": p.get("MACHINE", ""),
                    "site": p.get("SITE", ""),
                    "tester": p.get("TESTER", ""),
                    "test_id": t.get("_id", ""),
                })
            except (ValueError, TypeError):
                pass

    dated_values.sort(key=lambda x: x["date_iso"])

    # Monthly aggregation
    monthly = {}
    for dv in dated_values:
        key = dv["month"]
        monthly.setdefault(key, []).append(dv["value"])

    time_series = []
    for key in sorted(monthly.keys()):
        vals = monthly[key]
        arr = np.array(vals)
        time_series.append({
            "date": key,
            "mean_value": round(float(np.mean(arr)), 2),
            "min_value": round(float(np.min(arr)), 2),
            "max_value": round(float(np.max(arr)), 2),
            "n": len(vals),
        })

    # Overall stats
    all_vals = [dv["value"] for dv in dated_values]
    arr = np.array(all_vals) if all_vals else np.array([0])
    stats = {
        "n": len(all_vals),
        "mean": round(float(np.mean(arr)), 2),
        "std": round(float(np.std(arr, ddof=1)) if len(arr) > 1 else 0, 2),
        "min": round(float(np.min(arr)), 2),
        "max": round(float(np.max(arr)), 2),
    }

    # Trend line
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

    unit = "MPa" if "mpa" in property else ("J" if "_j" in property else "%")

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
    chart configuration + data. Supports incremental updates via current_spec:
    "add X", "remove X", "change to bar chart", etc.
    """
    import numpy as np
    from db import get_collection

    tests_col = get_collection("Tests")
    all_tests = list(tests_col.find())

    # Available materials and properties
    materials = sorted(set(
        t.get("TestParametersFlat", {}).get("MATERIAL")
        for t in all_tests
        if t.get("TestParametersFlat", {}).get("MATERIAL")
    ))

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

    machines = sorted(set(
        t.get("TestParametersFlat", {}).get("MACHINE")
        for t in all_tests
        if t.get("TestParametersFlat", {}).get("MACHINE")
    ))

    test_types_set = sorted(set(
        t.get("TestParametersFlat", {}).get("TYPE_OF_TESTING_STR")
        for t in all_tests
        if t.get("TestParametersFlat", {}).get("TYPE_OF_TESTING_STR")
    ))

    prompt_lower = req.prompt.lower()
    spec = req.current_spec  # The existing graph spec, if any

    # ─── Detect modification intent ────────────────────────────────────────
    is_add = any(w in prompt_lower for w in ["add ", "also ", "include ", "overlay ", "plus ", "and also", "additionally", "as well", "too", "along with"])
    is_remove = any(w in prompt_lower for w in ["remove ", "drop ", "exclude ", "without ", "hide ", "take off", "take away", "get rid of"])
    is_change_type = any(w in prompt_lower for w in ["change to ", "switch to ", "make it a ", "convert to ", "show as "])
    is_clear = any(w in prompt_lower for w in ["clear", "reset", "start over", "new graph", "from scratch"])
    has_spec = spec is not None and not is_clear

    # ─── Simple NLP parser to extract intent ───────────────────────────────
    # Determine chart type from prompt
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

    # Find mentioned materials in this prompt
    prompt_materials = [m for m in materials if m.lower() in prompt_lower]

    # Find mentioned properties in this prompt
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
    # Determine if this is a modification of existing graph or a fresh request
    is_modification = has_spec and (is_add or is_remove or is_change_type)
    # A prompt with a chart type + materials + properties is a full fresh request
    # (e.g. "scatter plot of tensile strength vs elongation for Hostacomp G2")
    is_full_fresh = prompt_chart_type and prompt_materials and prompt_props

    if has_spec and not is_clear and not is_full_fresh:
        # We have an existing spec — modify it
        existing_materials = spec.get("materials", [])
        existing_props = spec.get("properties", ["tensile_strength_mpa"])
        chart_type = prompt_chart_type or spec.get("chart_type", "line")

        # Resolve materials
        if is_add and prompt_materials:
            mentioned_materials = list(dict.fromkeys(existing_materials + prompt_materials))
        elif is_remove and prompt_materials:
            mentioned_materials = [m for m in existing_materials if m not in prompt_materials]
            if not mentioned_materials:
                mentioned_materials = existing_materials  # Don't remove everything
        elif prompt_materials and not is_add and not is_remove:
            # Mentioned materials without add/remove — replace
            mentioned_materials = prompt_materials
        else:
            # No materials mentioned — keep existing
            mentioned_materials = existing_materials

        # Resolve properties
        if is_add and prompt_props:
            mentioned_props = list(dict.fromkeys(existing_props + prompt_props))
        elif is_remove and prompt_props:
            mentioned_props = [p for p in existing_props if p not in prompt_props]
            if not mentioned_props:
                mentioned_props = existing_props
        elif prompt_props:
            # Mentioned properties without add/remove — replace
            mentioned_props = prompt_props
        else:
            # No properties mentioned — keep existing
            mentioned_props = existing_props
    else:
        # Fresh graph (no spec, cleared, or full fresh request)
        chart_type = prompt_chart_type or "line"
        mentioned_materials = prompt_materials if prompt_materials else materials
        mentioned_props = prompt_props if prompt_props else ["tensile_strength_mpa"]

    # Infer test type from property
    def test_type_for_prop(prop):
        if "impact" in prop or "charpy" in prop.lower():
            return "charpy"
        return "tensile"

    # ─── Build data based on chart type ────────────────────────────────────
    from tools.utils import parse_date

    series = []
    explanation = ""
    x_label = ""
    y_label = property_labels.get(mentioned_props[0], mentioned_props[0])
    title = ""

    if chart_type == "scatter" and len(mentioned_props) >= 2:
        # Scatter: prop X vs prop Y
        prop_x = mentioned_props[0]
        prop_y = mentioned_props[1]
        x_label = property_labels.get(prop_x, prop_x)
        y_label = property_labels.get(prop_y, prop_y)
        title = f"{x_label} vs {y_label}"

        for mat in mentioned_materials:
            tt = test_type_for_prop(prop_x)
            mat_tests = [t for t in all_tests
                        if t.get("TestParametersFlat", {}).get("MATERIAL") == mat
                        and t.get("TestParametersFlat", {}).get("TYPE_OF_TESTING_STR") == tt]
            points = []
            for t in mat_tests:
                p = t.get("TestParametersFlat", {})
                vx = p.get(prop_x)
                vy = p.get(prop_y)
                if vx is not None and vy is not None:
                    points.append({"x": round(float(vx), 2), "y": round(float(vy), 2)})
            if points:
                series.append({"name": mat, "data": points})

        explanation = f"Scatter plot of {x_label} vs {y_label} for {', '.join(mentioned_materials)}. Each point represents one test."

    elif chart_type == "bar":
        # Bar: compare materials on a property
        prop = mentioned_props[0]
        title = f"{y_label} by Material"
        x_label = "Material"
        bar_data = []
        for mat in mentioned_materials:
            tt = test_type_for_prop(prop)
            vals = [
                float(t["TestParametersFlat"][prop])
                for t in all_tests
                if t.get("TestParametersFlat", {}).get("MATERIAL") == mat
                and t.get("TestParametersFlat", {}).get("TYPE_OF_TESTING_STR") == tt
                and t.get("TestParametersFlat", {}).get(prop) is not None
            ]
            if vals:
                bar_data.append({
                    "name": mat,
                    "mean": round(float(np.mean(vals)), 2),
                    "std": round(float(np.std(vals, ddof=1)) if len(vals) > 1 else 0, 2),
                    "n": len(vals),
                })
        series = [{"name": "comparison", "data": bar_data}]
        explanation = f"Bar chart comparing {y_label} across {len(mentioned_materials)} materials. Error bars show ±1 standard deviation."

    elif chart_type == "histogram":
        # Histogram: distribution of a property
        prop = mentioned_props[0]
        title = f"Distribution of {y_label}"
        x_label = y_label
        y_label = "Frequency"
        all_vals = []
        for mat in mentioned_materials:
            tt = test_type_for_prop(prop)
            vals = [
                float(t["TestParametersFlat"][prop])
                for t in all_tests
                if t.get("TestParametersFlat", {}).get("MATERIAL") == mat
                and t.get("TestParametersFlat", {}).get("TYPE_OF_TESTING_STR") == tt
                and t.get("TestParametersFlat", {}).get(prop) is not None
            ]
            all_vals.extend(vals)

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
        # Pie: test counts by material or test type
        title = "Test Distribution"
        if any(w in prompt_lower for w in ["type", "test type", "testing"]):
            pie_data = {}
            for t in all_tests:
                tt = t.get("TestParametersFlat", {}).get("TYPE_OF_TESTING_STR", "unknown")
                pie_data[tt] = pie_data.get(tt, 0) + 1
            series = [{"name": "by_type", "data": [{"name": k, "value": v} for k, v in sorted(pie_data.items())]}]
            explanation = f"Pie chart showing test distribution by test type across {sum(pie_data.values())} total tests."
        else:
            pie_data = {}
            for t in all_tests:
                m = t.get("TestParametersFlat", {}).get("MATERIAL", "unknown")
                pie_data[m] = pie_data.get(m, 0) + 1
            series = [{"name": "by_material", "data": [{"name": k, "value": v} for k, v in sorted(pie_data.items())]}]
            explanation = f"Pie chart showing test distribution by material across {sum(pie_data.values())} total tests."

    else:
        # Line: time series
        prop = mentioned_props[0]
        title = f"{y_label} Over Time"
        x_label = "Month"

        for mat in mentioned_materials:
            tt = test_type_for_prop(prop)
            mat_tests = [t for t in all_tests
                        if t.get("TestParametersFlat", {}).get("MATERIAL") == mat
                        and t.get("TestParametersFlat", {}).get("TYPE_OF_TESTING_STR") == tt]

            monthly = {}
            for t in mat_tests:
                p = t.get("TestParametersFlat", {})
                val = p.get(prop)
                date_str = p.get("Date")
                if val is not None and date_str:
                    try:
                        dt = parse_date(date_str)
                        key = f"{dt.year}-{dt.month:02d}"
                        monthly.setdefault(key, []).append(float(val))
                    except (ValueError, TypeError):
                        pass

            points = []
            for key in sorted(monthly.keys()):
                vals = monthly[key]
                points.append({"x": key, "y": round(float(np.mean(vals)), 2), "n": len(vals)})

            if points:
                series.append({"name": mat, "data": points})

        explanation = f"Time series of monthly average {y_label} for {', '.join([s['name'] for s in series])}."

    # Check if we actually have data
    has_data = any(s.get("data") for s in series)
    if not has_data:
        # Can't build this graph — explain why and suggest alternatives
        suggestions = []
        if not mentioned_materials:
            suggestions.append("Specify a material (e.g., FancyPlast 42, UltraPlast 99)")
        if chart_type == "scatter" and len(mentioned_props) < 2:
            suggestions.append("For scatter plots, mention two properties (e.g., 'tensile strength vs elongation')")
        suggestions.append(f"Available materials: {', '.join(materials)}")
        suggestions.append(f"Available properties: {', '.join(property_labels.values())}")

        return {
            "success": False,
            "message": f"I couldn't build that graph — no matching data found for your request.",
            "suggestions": suggestions,
            "available": {
                "materials": materials,
                "properties": list(property_labels.keys()),
                "property_labels": property_labels,
                "chart_types": ["line", "bar", "scatter", "histogram", "pie"],
            },
        }

    # Build the resolved spec so the frontend can track state
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
