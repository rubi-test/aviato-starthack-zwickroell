"""Tool 5: boundary_forecast — Forecast if a property will cross a boundary value."""

import numpy as np
from datetime import datetime, timedelta
from db import get_collection
from tools.utils import parse_date, infer_test_type_filter


def boundary_forecast(
    material: str,
    property: str,
    boundary_value: float,
    months_history: int = 12,
    months_forecast: int = 24,
) -> dict:
    """Forecast if a property will cross a boundary value based on current trend."""
    tests_col = get_collection("Tests")
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
                dated_values.append((dt, float(val)))
            except (ValueError, TypeError):
                pass

    if len(dated_values) < 3:
        return {
            "result": {"error": f"Not enough data for {material}/{property} (found {len(dated_values)})."},
            "steps": [f"Queried {material}, found {len(dated_values)} values — insufficient"],
        }

    dated_values.sort(key=lambda x: x[0])
    latest_date = dated_values[-1][0]
    cutoff = latest_date - timedelta(days=months_history * 30)
    dated_values = [(dt, v) for dt, v in dated_values if dt >= cutoff]

    # Monthly aggregation
    monthly = {}
    for dt, val in dated_values:
        key = f"{dt.year}-{dt.month:02d}"
        monthly.setdefault(key, []).append(val)

    sorted_months = sorted(monthly.keys())
    time_series = []
    for key in sorted_months:
        vals = monthly[key]
        time_series.append({
            "date": key,
            "mean_value": round(float(np.mean(vals)), 1),
            "n": len(vals),
        })

    if len(time_series) < 2:
        return {
            "result": {"error": "Not enough monthly data points."},
            "steps": ["Insufficient monthly data"],
        }

    # Linear regression
    x = np.arange(len(time_series))
    y = np.array([pt["mean_value"] for pt in time_series])
    coeffs = np.polyfit(x, y, 1)
    slope = coeffs[0]
    intercept = coeffs[1]

    current_value = round(float(y[-1]), 1)

    # Generate forecast series
    forecast_series = []
    last_month_idx = len(time_series) - 1

    # Parse the last date to generate future months
    last_year, last_month = map(int, sorted_months[-1].split("-"))

    for i in range(1, months_forecast + 1):
        future_idx = last_month_idx + i
        forecast_val = round(float(intercept + slope * future_idx), 1)
        # Calculate future date
        future_month = last_month + i
        future_year = last_year + (future_month - 1) // 12
        future_month = ((future_month - 1) % 12) + 1
        forecast_series.append({
            "date": f"{future_year}-{future_month:02d}",
            "forecast_value": forecast_val,
        })

    # Check for boundary violation
    will_violate = False
    estimated_violation_date = None
    months_until_violation = None

    if abs(slope) > 0.001:
        # Solve: intercept + slope * x = boundary_value
        crossing_idx = (boundary_value - intercept) / slope

        if crossing_idx > last_month_idx:
            months_away = int(crossing_idx - last_month_idx)
            if 0 < months_away <= months_forecast:
                will_violate = True
                months_until_violation = months_away
                v_month = last_month + months_away
                v_year = last_year + (v_month - 1) // 12
                v_month = ((v_month - 1) % 12) + 1
                estimated_violation_date = f"{v_year}-{v_month:02d}"

    unit = "MPa" if "mpa" in property else ("J" if "_j" in property else "%")

    if will_violate:
        interpretation = (
            f"Based on current trend, {property.replace('_', ' ')} for {material} "
            f"will cross the {boundary_value} {unit} boundary in ~{months_until_violation} months "
            f"({estimated_violation_date}). Current value: {current_value} {unit}, "
            f"declining at {abs(slope):.2f} {unit}/month."
        )
    else:
        interpretation = (
            f"Based on current trend, {property.replace('_', ' ')} for {material} "
            f"is NOT expected to cross {boundary_value} {unit} within {months_forecast} months. "
            f"Current value: {current_value} {unit}."
        )

    # Add trend values to time_series
    for i, pt in enumerate(time_series):
        pt["trend_value"] = round(float(intercept + slope * i), 1)

    steps = [
        f"Queried all tests for {material}",
        f"Extracted {property} values over last {months_history} months",
        f"Aggregated to {len(time_series)} monthly data points",
        f"Ran linear regression: slope={slope:.3f} {unit}/month",
        f"Current value: {current_value} {unit}, boundary: {boundary_value} {unit}",
        f"{'Violation' if will_violate else 'No violation'} expected within {months_forecast} months"
        + (f" (ETA: {estimated_violation_date})" if will_violate else ""),
    ]

    return {
        "result": {
            "material": material,
            "property": property,
            "boundary": boundary_value,
            "will_violate": will_violate,
            "estimated_violation_date": estimated_violation_date,
            "months_until_violation": months_until_violation,
            "current_value": current_value,
            "slope_per_month": round(float(slope), 3),
            "time_series": time_series,
            "forecast_series": forecast_series,
            "interpretation": interpretation,
        },
        "steps": steps,
    }
