"""Tool: search_materials — Find materials by property criteria or description filters.

Useful for queries like:
  - "which materials are high strength?"
  - "find flexible materials with low modulus"
  - "materials with strength above 500 MPa"
"""

from data_access import get_distinct_values, get_stats_aggregation


TENSILE_PROPERTIES = [
    "tensile_strength_mpa",
    "tensile_modulus_mpa",
    "elongation_at_break_pct",
    "max_force_n",
]

CHARPY_PROPERTIES = [
    "impact_energy_j",
    "max_force_n",
]


def search_materials(
    test_type: str = "tensile",
    min_tensile_strength_mpa: float = None,
    max_tensile_strength_mpa: float = None,
    min_elongation_pct: float = None,
    max_elongation_pct: float = None,
    min_modulus_mpa: float = None,
    max_modulus_mpa: float = None,
    min_impact_energy_j: float = None,
    max_impact_energy_j: float = None,
    top_n: int = 15,
) -> dict:
    """Find and rank materials matching quantitative property criteria.

    Pass min/max filters to narrow down materials — e.g. min_tensile_strength_mpa=500
    for high-strength materials, or max_elongation_pct=10 for brittle ones.
    Returns all qualifying materials with their full stats.
    """
    materials = [m for m in get_distinct_values("TestParametersFlat.MATERIAL") if m]

    properties = CHARPY_PROPERTIES if test_type == "charpy" else TENSILE_PROPERTIES

    rows = []
    for mat in materials:
        query = {
            "TestParametersFlat.MATERIAL": mat,
            "TestParametersFlat.TYPE_OF_TESTING_STR": test_type,
        }

        # Gather stats for each relevant property
        stats_by_prop = {}
        for prop in properties:
            s = get_stats_aggregation(query, prop)
            if s["n"] >= 3:
                stats_by_prop[prop] = s

        if not stats_by_prop:
            continue

        # Get the primary stat count from the most populated property
        best_prop = max(stats_by_prop, key=lambda p: stats_by_prop[p]["n"])
        n_tests = stats_by_prop[best_prop]["n"]

        def _mean(prop):
            return stats_by_prop.get(prop, {}).get("mean")

        strength = _mean("tensile_strength_mpa")
        modulus = _mean("tensile_modulus_mpa")
        elongation = _mean("elongation_at_break_pct")
        impact = _mean("impact_energy_j")
        max_force = _mean("max_force_n")

        # Apply filters
        if min_tensile_strength_mpa is not None and (strength is None or strength < min_tensile_strength_mpa):
            continue
        if max_tensile_strength_mpa is not None and (strength is None or strength > max_tensile_strength_mpa):
            continue
        if min_elongation_pct is not None and (elongation is None or elongation < min_elongation_pct):
            continue
        if max_elongation_pct is not None and (elongation is None or elongation > max_elongation_pct):
            continue
        if min_modulus_mpa is not None and (modulus is None or modulus < min_modulus_mpa):
            continue
        if max_modulus_mpa is not None and (modulus is None or modulus > max_modulus_mpa):
            continue
        if min_impact_energy_j is not None and (impact is None or impact < min_impact_energy_j):
            continue
        if max_impact_energy_j is not None and (impact is None or impact > max_impact_energy_j):
            continue

        row = {
            "material": mat,
            "n_tests": n_tests,
        }
        if strength is not None:
            row["tensile_strength_mpa"] = round(strength, 1)
        if modulus is not None:
            row["tensile_modulus_mpa"] = round(modulus, 1)
        if elongation is not None:
            row["elongation_at_break_pct"] = round(elongation, 2)
        if impact is not None:
            row["impact_energy_j"] = round(impact, 2)
        if max_force is not None:
            row["max_force_n"] = round(max_force, 1)

        rows.append(row)

    # Sort by primary property (strength for tensile, impact for charpy)
    sort_prop = "tensile_strength_mpa" if test_type != "charpy" else "impact_energy_j"
    rows.sort(key=lambda r: r.get(sort_prop, 0), reverse=True)
    top = rows[:top_n]

    # Build filter description for steps
    filters_applied = []
    if min_tensile_strength_mpa is not None:
        filters_applied.append(f"strength ≥ {min_tensile_strength_mpa} MPa")
    if max_tensile_strength_mpa is not None:
        filters_applied.append(f"strength ≤ {max_tensile_strength_mpa} MPa")
    if min_elongation_pct is not None:
        filters_applied.append(f"elongation ≥ {min_elongation_pct}%")
    if max_elongation_pct is not None:
        filters_applied.append(f"elongation ≤ {max_elongation_pct}%")
    if min_modulus_mpa is not None:
        filters_applied.append(f"modulus ≥ {min_modulus_mpa} MPa")
    if max_modulus_mpa is not None:
        filters_applied.append(f"modulus ≤ {max_modulus_mpa} MPa")

    steps = [
        f"Scanned {len(materials)} distinct materials in database",
        f"Evaluated {test_type} test stats for each material",
        f"Filters: {', '.join(filters_applied) if filters_applied else 'none (showing all)'}",
        f"{len(rows)} materials matched, returning top {len(top)}",
    ]

    return {
        "result": {
            "materials": top,
            "test_type": test_type,
            "total_matched": len(rows),
            "filters_applied": filters_applied,
        },
        "steps": steps,
    }
