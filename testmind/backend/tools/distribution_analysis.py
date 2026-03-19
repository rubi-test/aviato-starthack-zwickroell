"""Tool 8: distribution_analysis — Show the value distribution (histogram) for a property."""

import numpy as np
from db import get_collection
from tools.utils import fuzzy_match_name, normalize_property, infer_test_type_filter


def distribution_analysis(
    property: str,
    material: str = None,
    n_bins: int = 10,
) -> dict:
    """Compute a histogram of a property's values for a material."""
    property = normalize_property(property)
    tests_col = get_collection("Tests")

    query = {**infer_test_type_filter(property)}
    if material:
        known = tests_col.distinct("TestParametersFlat.MATERIAL")
        material = fuzzy_match_name(material, known)
        query["TestParametersFlat.MATERIAL"] = material

    docs = list(tests_col.find(query))
    values = []
    for doc in docs:
        v = doc.get("TestParametersFlat", {}).get(property)
        if v is not None:
            try:
                values.append(float(v))
            except (TypeError, ValueError):
                pass

    if len(values) < 3:
        label = f"{material or 'all materials'} / {property}"
        return {
            "result": {"error": f"Not enough data to build a distribution for {label} (found {len(values)} values)."},
            "steps": [f"Queried {len(docs)} tests, found {len(values)} valid {property} values"],
        }

    counts, bin_edges = np.histogram(values, bins=min(n_bins, len(values)))
    unit = "MPa" if "mpa" in property else ("J" if "_j" in property else ("N" if "_n" in property else "%"))

    bins = [
        {
            "range_start": round(float(bin_edges[i]), 2),
            "range_end": round(float(bin_edges[i + 1]), 2),
            "count": int(counts[i]),
            "label": f"{bin_edges[i]:.1f}–{bin_edges[i+1]:.1f}",
        }
        for i in range(len(counts))
    ]

    steps = [
        f"Queried {len(docs)} tests for {material or 'all materials'}",
        f"Extracted {len(values)} valid {property} values",
        f"Computed histogram with {len(bins)} bins (min={min(values):.1f}, max={max(values):.1f}, mean={np.mean(values):.1f})",
    ]

    return {
        "result": {
            "bins": bins,
            "property": property,
            "material": material,
            "unit": unit,
            "n": len(values),
            "min": round(float(min(values)), 2),
            "max": round(float(max(values)), 2),
            "mean": round(float(np.mean(values)), 2),
            "std": round(float(np.std(values)), 2),
        },
        "steps": steps,
    }
