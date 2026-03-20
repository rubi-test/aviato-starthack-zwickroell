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
    if material:
        known = get_distinct_values("TestParametersFlat.MATERIAL")
        material = fuzzy_match_name(material, known)

    type_filter = infer_test_type_filter(property)

    # Cascade: try progressively relaxed filter combinations until data is found.
    # Priority: (material + site + type) → (material + type) → (material only) → (type only)
    filter_candidates = []
    if material and site:
        filter_candidates.append((
            {**type_filter, "TestParametersFlat.MATERIAL": material, "TestParametersFlat.SITE": site},
            f"material={material}, site={site}, type filter",
        ))
    if material:
        filter_candidates.append((
            {**type_filter, "TestParametersFlat.MATERIAL": material},
            f"material={material}, type filter (no site)",
        ))
        filter_candidates.append((
            {"TestParametersFlat.MATERIAL": material},
            f"material={material}, no type or site filter",
        ))
    if not material:
        filter_candidates.append((
            {**type_filter, **({"TestParametersFlat.SITE": site} if site else {})},
            f"type filter{', site=' + site if site else ''}",
        ))

    time_series = []
    used_filter_desc = ""
    attempted = []
    for query, desc in filter_candidates:
        attempted.append(desc)
        time_series = get_monthly_aggregation(query, property, months_back)
        if time_series:
            used_filter_desc = desc
            break

    if not time_series:
        prop_label = property.replace("_", " ")
        mat_label = f" for {material}" if material else ""
        site_label = f" at the {site} site" if site else ""
        return {
            "result": {
                "error": (
                    f"No {prop_label} measurements found{mat_label}{site_label} "
                    f"over the last {months_back} months, even after relaxing site and test-type filters. "
                    f"This material may not have {prop_label} test data in the database."
                )
            },
            "steps": [f"Tried filters: {'; then '.join(attempted)}", "Found 0 monthly data points across all attempts"],
        }

    filter_desc = used_filter_desc

    if len(time_series) < 2:
        return {
            "result": {"error": "Not enough monthly data points for trend (need 2+)."},
            "steps": [f"Used filters: {filter_desc}", "Only 1 monthly data point found"],
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
        f"Queried tests with filters: {filter_desc or 'none'}",
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
