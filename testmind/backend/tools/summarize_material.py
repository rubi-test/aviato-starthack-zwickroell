"""Tool 2: summarize_material_properties — Statistical summary for a material."""

import numpy as np
from db import get_collection
from tools.utils import extract_property_values

NUMERIC_PROPS = [
    ("tensile_strength_mpa", "MPa"),
    ("tensile_modulus_mpa", "MPa"),
    ("elongation_at_break_pct", "%"),
    ("impact_energy_j", "J"),
    ("max_force_n", "N"),
]


def summarize_material_properties(material: str) -> dict:
    """Statistical summary of all measured properties for a material."""
    tests_col = get_collection("Tests")
    matched = list(tests_col.find({"TestParametersFlat.MATERIAL": material}))

    if not matched:
        return {
            "result": {
                "material": material,
                "properties": [],
                "summary_text": f"No tests found for material '{material}'.",
            },
            "steps": [f"Queried Tests collection for MATERIAL={material}", "Found 0 tests"],
        }

    properties = []
    for prop_name, unit in NUMERIC_PROPS:
        values = extract_property_values(matched, prop_name)
        if not values:
            continue
        arr = np.array(values)
        properties.append({
            "name": prop_name,
            "unit": unit,
            "n": len(values),
            "mean": round(float(np.mean(arr)), 1),
            "std": round(float(np.std(arr, ddof=1)) if len(arr) > 1 else 0.0, 1),
            "min": round(float(np.min(arr)), 1),
            "max": round(float(np.max(arr)), 1),
        })

    # Build readable summary text
    parts = [f"{material} — {len(matched)} tests in database."]
    for p in properties:
        parts.append(
            f"  {p['name'].replace('_', ' ').title()}: "
            f"mean {p['mean']} {p['unit']} (std {p['std']}, range {p['min']}–{p['max']}, n={p['n']})"
        )

    steps = [
        f"Queried all tests for MATERIAL={material}",
        f"Found {len(matched)} tests",
        f"Computed statistics for {len(properties)} numeric properties (mean, std, min, max)",
    ]

    return {
        "result": {
            "material": material,
            "properties": properties,
            "summary_text": "\n".join(parts),
        },
        "steps": steps,
    }
