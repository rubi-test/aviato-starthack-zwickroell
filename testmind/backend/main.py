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
    allow_origins=["http://localhost:5173"],
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

    return {
        "tests_last_7_days": len(recent),
        "anomalies_flagged": len(anomalies),
        "materials_in_db": len(materials),
        "boundary_risks": len(boundary_risks),
        "recent_tests": recent_table,
        "anomalies": anomalies,
        "boundary_risks_detail": boundary_risks,
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
