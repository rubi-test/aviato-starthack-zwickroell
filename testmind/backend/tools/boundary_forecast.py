"""Tool 5: boundary_forecast — Forecast if a property will cross a boundary value."""

import numpy as np
from data_access import get_monthly_aggregation, get_distinct_values
from tools.utils import fuzzy_match_name, infer_test_type_filter
from schema_map import get_unit


def boundary_forecast(
    material: str,
    property: str,
    boundary_value: float,
    months_history: int = 12,
    months_forecast: int = 24,
) -> dict:
    """Forecast if a property will cross a boundary value based on current trend."""
    known = get_distinct_values("TestParametersFlat.MATERIAL")
    material = fuzzy_match_name(material, known)

    type_filter = infer_test_type_filter(property)

    # Cascade: relax filters until data is found.
    filter_candidates = [
        ({"TestParametersFlat.MATERIAL": material, **type_filter}, "material + type filter"),
        ({"TestParametersFlat.MATERIAL": material}, "material only (no type filter)"),
    ]

    time_series = []
    used_filter_desc = ""
    attempted = []
    for query, desc in filter_candidates:
        attempted.append(desc)
        time_series = get_monthly_aggregation(query, property, months_history)
        if time_series:
            used_filter_desc = desc
            break

    if not time_series:
        prop_label = property.replace("_", " ")
        return {
            "result": {
                "error": (
                    f"No {prop_label} measurements found for {material} over the last {months_history} months, "
                    f"even after relaxing test-type filters. "
                    f"This material may not have {prop_label} test data in the database."
                )
            },
            "steps": [f"Tried filters: {'; then '.join(attempted)}", "Found 0 monthly data points across all attempts"],
        }

    if len(time_series) < 2:
        return {
            "result": {"error": "Not enough monthly data points."},
            "steps": [f"Used filters: {used_filter_desc}", "Insufficient monthly data (need 2+)"],
        }

    # Linear regression
    x = np.arange(len(time_series))
    y = np.array([pt["mean_value"] for pt in time_series])
    coeffs = np.polyfit(x, y, 1)
    slope = coeffs[0]
    intercept = coeffs[1]

    current_value = round(float(y[-1]), 1)

    # Generate forecast series
    sorted_months = [pt["date"] for pt in time_series]
    last_month_idx = len(time_series) - 1
    last_year, last_month = map(int, sorted_months[-1].split("-"))

    forecast_series = []
    for i in range(1, months_forecast + 1):
        future_idx = last_month_idx + i
        forecast_val = round(float(intercept + slope * future_idx), 1)
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

    unit = get_unit(property)

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

    total_values = sum(pt["n"] for pt in time_series)
    steps = [
        f"Queried all tests for {material}",
        f"Extracted {property} values over last {months_history} months",
        f"Aggregated to {len(time_series)} monthly data points ({total_values} values)",
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
