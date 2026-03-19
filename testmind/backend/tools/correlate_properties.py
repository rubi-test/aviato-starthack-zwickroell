"""Tool 6: correlate_properties — Find statistical correlation between two material properties."""

import numpy as np
from scipy import stats as sp_stats
from db import get_collection
from tools.utils import fuzzy_match_name, infer_test_type_filter, normalize_property


def correlate_properties(
    property_x: str,
    property_y: str,
    material: str = None,
    test_type: str = None,
) -> dict:
    """
    Compute Pearson correlation between two numeric properties across tests.
    Answers: 'If property X changes, does property Y tend to change too?'
    """
    property_x = normalize_property(property_x)
    property_y = normalize_property(property_y)
    tests_col = get_collection("Tests")
    query = {}

    if material:
        known = tests_col.distinct("TestParametersFlat.MATERIAL")
        material = fuzzy_match_name(material, known)
        query["TestParametersFlat.MATERIAL"] = material

    if test_type:
        query["TestParametersFlat.TYPE_OF_TESTING_STR"] = test_type
    else:
        # Infer test type from either property (prefer x)
        type_filter = infer_test_type_filter(property_x) or infer_test_type_filter(property_y)
        query.update(type_filter)

    all_tests = list(tests_col.find(query))

    # Extract paired (x, y) values — only tests that have both
    pairs = []
    for t in all_tests:
        p = t.get("TestParametersFlat", {})
        vx = p.get(property_x)
        vy = p.get(property_y)
        if vx is not None and vy is not None:
            try:
                pairs.append((float(vx), float(vy), p.get("MATERIAL", ""), p.get("Date", "")))
            except (TypeError, ValueError):
                pass

    if len(pairs) < 5:
        return {
            "result": {"error": f"Not enough paired data (need 5+, found {len(pairs)})."},
            "steps": [
                f"Queried tests for {property_x} and {property_y}",
                f"Found only {len(pairs)} tests with both values — insufficient",
            ],
        }

    x_vals = np.array([p[0] for p in pairs])
    y_vals = np.array([p[1] for p in pairs])

    r, p_value = sp_stats.pearsonr(x_vals, y_vals)
    r = round(float(r), 3)
    p_value = round(float(p_value), 4)

    abs_r = abs(r)
    if abs_r >= 0.7:
        strength = "strong"
    elif abs_r >= 0.4:
        strength = "moderate"
    else:
        strength = "weak"

    direction = "positive" if r > 0 else "negative"
    significant = p_value < 0.05

    if significant:
        interpretation = (
            f"There is a {strength} {direction} correlation between "
            f"{property_x.replace('_', ' ')} and {property_y.replace('_', ' ')} "
            f"(r={r}, p={p_value}). "
            f"{'This is statistically meaningful — the relationship is real, not random noise.' if significant else ''}"
        )
        if r > 0.4:
            interpretation += f" When {property_x.replace('_', ' ')} is higher, {property_y.replace('_', ' ')} tends to be higher too."
        elif r < -0.4:
            interpretation += f" When {property_x.replace('_', ' ')} is higher, {property_y.replace('_', ' ')} tends to be lower."
    else:
        interpretation = (
            f"No significant correlation found between "
            f"{property_x.replace('_', ' ')} and {property_y.replace('_', ' ')} "
            f"(r={r}, p={p_value}). Changing one does not reliably predict the other."
        )

    scatter_data = [
        {"x": p[0], "y": p[1], "material": p[2], "date": p[3]}
        for p in pairs
    ]

    # Trend line for scatter
    coeffs = np.polyfit(x_vals, y_vals, 1)
    x_min, x_max = float(x_vals.min()), float(x_vals.max())
    trend_line = [
        {"x": round(x_min, 2), "y": round(float(np.polyval(coeffs, x_min)), 2)},
        {"x": round(x_max, 2), "y": round(float(np.polyval(coeffs, x_max)), 2)},
    ]

    unit_x = "MPa" if "mpa" in property_x else ("J" if "_j" in property_x else "%")
    unit_y = "MPa" if "mpa" in property_y else ("J" if "_j" in property_y else "%")

    steps = [
        f"Queried tests{f' for {material}' if material else ''} with both {property_x} and {property_y} values",
        f"Found {len(pairs)} tests with paired data",
        f"Computed Pearson correlation coefficient using scipy.stats.pearsonr",
        f"r = {r} (p = {p_value}) — {strength} {direction} correlation",
        f"{'Statistically significant (p < 0.05)' if significant else 'Not statistically significant (p >= 0.05)'}",
    ]

    return {
        "result": {
            "property_x": property_x,
            "property_y": property_y,
            "unit_x": unit_x,
            "unit_y": unit_y,
            "material": material,
            "n": len(pairs),
            "correlation_coefficient": r,
            "p_value": p_value,
            "strength": strength,
            "direction": direction,
            "significant": significant,
            "interpretation": interpretation,
            "scatter_data": scatter_data,
            "trend_line": trend_line,
        },
        "steps": steps,
    }
