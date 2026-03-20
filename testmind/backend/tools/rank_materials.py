"""Tool: rank_materials — Rank all materials by a given property."""

from data_access import get_distinct_values, get_stats_aggregation


def rank_materials(
    property: str,
    test_type: str = "tensile",
    top_n: int = 10,
    order: str = "desc",
) -> dict:
    """Rank all materials by mean value of a property.

    Returns top_n materials sorted by mean, with full stats per material.
    """
    materials = [m for m in get_distinct_values("TestParametersFlat.MATERIAL") if m]

    rows = []
    for mat in materials:
        query = {"TestParametersFlat.MATERIAL": mat}
        if test_type:
            query["TestParametersFlat.TYPE_OF_TESTING_STR"] = test_type

        stats = get_stats_aggregation(query, property)
        if stats["n"] < 3:
            continue

        rows.append({
            "material": mat,
            "mean": stats["mean"],
            "std": stats["std"],
            "min": stats["min"],
            "max": stats["max"],
            "n": stats["n"],
        })

    rows.sort(key=lambda r: r["mean"], reverse=(order == "desc"))
    top = rows[:top_n]

    unit_hint = ""
    if "mpa" in property:
        unit_hint = "MPa"
    elif "_n" in property:
        unit_hint = "N"
    elif "_j" in property:
        unit_hint = "J"
    elif "pct" in property:
        unit_hint = "%"

    steps = [
        f"Queried distinct materials: {len(materials)} found",
        f"Computed stats for {len(rows)} materials with ≥3 {test_type} tests",
        f"Sorted by {property} ({order}ending), showing top {top_n}",
    ]

    return {
        "result": {
            "ranking": top,
            "property": property,
            "unit": unit_hint,
            "test_type": test_type,
            "total_materials_evaluated": len(rows),
        },
        "steps": steps,
    }
