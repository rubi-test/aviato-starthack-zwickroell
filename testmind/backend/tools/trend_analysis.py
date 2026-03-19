"""Tool 4: trend_analysis — Detect trends over time for a property."""

import numpy as np
from data_access import get_monthly_aggregation, get_distinct_values
from tools.utils import fuzzy_match_name, infer_test_type_filter
from schema_map import get_unit


def trend_analysis(
    property: str,
    material: str = None,
    site: str = None,
    months_back: int = 12,
) -> dict:
    """Detect trends over time for a property, aggregated to monthly averages."""
    query = {**infer_test_type_filter(property)}
    filter_desc = []

    if material:
        known = get_distinct_values("TestParametersFlat.MATERIAL")
        material = fuzzy_match_name(material, known)
        query["TestParametersFlat.MATERIAL"] = material
        filter_desc.append(f"material={material}")
    if site:
        query["TestParametersFlat.SITE"] = site
        filter_desc.append(f"site={site}")

    time_series = get_monthly_aggregation(query, property, months_back)

    if not time_series:
        return {
            "result": {"error": "No tests found matching filters."},
            "steps": [f"Queried with filters: {', '.join(filter_desc)}", "Found 0 monthly data points"],
        }

    if len(time_series) < 2:
        return {
            "result": {"error": "Not enough monthly data points for trend (need 2+)."},
            "steps": ["Only 1 monthly data point found"],
        }

    # Linear regression on monthly means
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

    unit = get_unit(property)
    total_values = sum(pt["n"] for pt in time_series)

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
        f"Found {total_values} values over {len(time_series)} months",
        "Aggregated to monthly averages",
        "Ran linear regression (numpy.polyfit degree=1)",
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
