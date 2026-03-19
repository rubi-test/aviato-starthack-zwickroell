"""Tool 2: summarize_material_properties — Statistical summary for a material."""

from data_access import get_distinct_values, get_stats_aggregation
from tools.utils import fuzzy_match_name, infer_test_type_filter
from schema_map import TOOL_PROPERTIES


def summarize_material_properties(material: str) -> dict:
    """Statistical summary of all measured properties for a material."""
    known = get_distinct_values("TestParametersFlat.MATERIAL")
    material = fuzzy_match_name(material, known)

    base_query = {"TestParametersFlat.MATERIAL": material}

    properties = []
    for prop_name, unit in TOOL_PROPERTIES:
        type_filter = infer_test_type_filter(prop_name)
        query = {**base_query, **type_filter}

        stats = get_stats_aggregation(query, prop_name)
        if stats["n"] == 0:
            continue

        properties.append({
            "name": prop_name,
            "unit": unit,
            "n": stats["n"],
            "mean": stats["mean"],
            "std": stats["std"],
            "min": stats["min"],
            "max": stats["max"],
        })

    if not properties:
        return {
            "result": {
                "material": material,
                "properties": [],
                "summary_text": f"No tests found for material '{material}'.",
            },
            "steps": [f"Queried Tests collection for MATERIAL={material}", "Found 0 tests"],
        }

    # Build readable summary text
    total_n = sum(p["n"] for p in properties)
    parts = [f"{material} — {total_n} test values across {len(properties)} properties."]
    for p in properties:
        parts.append(
            f"  {p['name'].replace('_', ' ').title()}: "
            f"mean {p['mean']} {p['unit']} (std {p['std']}, range {p['min']}–{p['max']}, n={p['n']})"
        )

    steps = [
        f"Queried all tests for MATERIAL={material}",
        f"Computed statistics for {len(properties)} numeric properties via aggregation",
    ]

    return {
        "result": {
            "material": material,
            "properties": properties,
            "summary_text": "\n".join(parts),
        },
        "steps": steps,
    }
