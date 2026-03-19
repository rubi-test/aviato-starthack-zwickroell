"""Tool 4: trend_analysis — Detect trends over time for a property."""

import numpy as np
from datetime import datetime, timedelta
from db import get_collection
from tools.utils import extract_property_values, fuzzy_match_name, parse_date, infer_test_type_filter


def trend_analysis(
    property: str,
    material: str = None,
    site: str = None,
    months_back: int = 12,
) -> dict:
    """Detect trends over time for a property, aggregated to monthly averages."""
    query = {**infer_test_type_filter(property)}
    filter_desc = []

    tests_col = get_collection("Tests")

    if material:
        known = tests_col.distinct("TestParametersFlat.MATERIAL")
        material = fuzzy_match_name(material, known)
        query["TestParametersFlat.MATERIAL"] = material
        filter_desc.append(f"material={material}")
    if site:
        query["TestParametersFlat.SITE"] = site
        filter_desc.append(f"site={site}")
    all_tests = list(tests_col.find(query))

    if not all_tests:
        return {
            "result": {"error": "No tests found matching filters."},
            "steps": [f"Queried with filters: {', '.join(filter_desc)}", "Found 0 tests"],
        }

    # Parse dates and pair with property values
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
            "result": {"error": "Not enough dated values for trend analysis (need 3+)."},
            "steps": [f"Found only {len(dated_values)} dated values — insufficient"],
        }

    # Determine date range
    dated_values.sort(key=lambda x: x[0])
    latest_date = dated_values[-1][0]
    cutoff = latest_date - timedelta(days=months_back * 30)
    dated_values = [(dt, v) for dt, v in dated_values if dt >= cutoff]

    # Aggregate to monthly averages
    monthly = {}
    for dt, val in dated_values:
        key = f"{dt.year}-{dt.month:02d}"
        monthly.setdefault(key, []).append(val)

    time_series = []
    for key in sorted(monthly.keys()):
        vals = monthly[key]
        time_series.append({
            "date": key,
            "mean_value": round(float(np.mean(vals)), 1),
            "std_value": round(float(np.std(vals, ddof=1)) if len(vals) > 1 else 0, 2),
            "min_value": round(float(np.min(vals)), 1),
            "max_value": round(float(np.max(vals)), 1),
            "n": len(vals),
        })

    if len(time_series) < 2:
        return {
            "result": {"error": "Not enough monthly data points for trend (need 2+)."},
            "steps": ["Only 1 monthly data point found"],
        }

    # Linear regression
    x = np.arange(len(time_series))
    y = np.array([pt["mean_value"] for pt in time_series])
    coeffs = np.polyfit(x, y, 1)
    slope = coeffs[0]
    intercept = coeffs[1]

    # R-squared
    y_pred = np.polyval(coeffs, x)
    ss_res = np.sum((y - y_pred) ** 2)
    ss_tot = np.sum((y - np.mean(y)) ** 2)
    r_squared = 1 - (ss_res / ss_tot) if ss_tot > 0 else 0.0

    if abs(slope) < 0.1:
        trend_direction = "stable"
    elif slope > 0:
        trend_direction = "increasing"
    else:
        trend_direction = "decreasing"

    unit = "MPa" if "mpa" in property else ("J" if "_j" in property else "%")
    interpretation = (
        f"{property.replace('_', ' ').title()} is {trend_direction} "
        f"at ~{abs(slope):.2f} {unit}/month. "
        f"R²={r_squared:.2f} {'suggests a strong trend' if r_squared > 0.7 else 'suggests moderate confidence' if r_squared > 0.4 else 'suggests weak trend'}."
    )

    # Add trend line values to time series
    for i, pt in enumerate(time_series):
        pt["trend_value"] = round(float(intercept + slope * i), 1)

    steps = [
        f"Queried tests with filters: {', '.join(filter_desc) or 'none'}",
        f"Found {len(dated_values)} values over {len(time_series)} months",
        f"Aggregated to monthly averages",
        f"Ran linear regression (numpy.polyfit degree=1)",
        f"Slope = {slope:.3f} {unit}/month, R² = {r_squared:.3f}",
        f"Trend direction: {trend_direction}",
    ]

    return {
        "result": {
            "material": material,
            "property": property,
            "analysis_window_months": months_back,
            "time_series": time_series,
            "slope_per_month": round(float(slope), 3),
            "r_squared": round(float(r_squared), 3),
            "trend_direction": trend_direction,
            "interpretation": interpretation,
        },
        "steps": steps,
    }
