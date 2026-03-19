"""Tool 3: compare_groups — Statistical comparison between two groups."""

import numpy as np
from scipy import stats as sp_stats
from data_access import get_tests_with_results, get_distinct_values, get_stats_aggregation
from tools.utils import (
    extract_property_values,
    filter_by_date_range,
    fuzzy_match_name,
    infer_test_type_filter,
    build_date_filter,
)
from db import is_mock

GROUP_FIELD_MAP = {
    "material": "TestParametersFlat.MATERIAL",
    "machine": "TestParametersFlat.MACHINE",
    "site": "TestParametersFlat.SITE",
    "standard": "TestParametersFlat.STANDARD",
}


def compare_groups(
    group_type: str,
    group_a: str,
    group_b: str,
    property: str,
    date_from: str = None,
    date_to: str = None,
) -> dict:
    """Statistical comparison between two groups for a given property."""
    field = GROUP_FIELD_MAP.get(group_type)
    if not field:
        return {
            "result": {"error": f"Unknown group_type: {group_type}"},
            "steps": [f"Invalid group_type '{group_type}'. Must be material, machine, site, or standard."],
        }

    type_filter = infer_test_type_filter(property)

    # Fuzzy match for material/site/standard comparisons
    if group_type in ("material", "site", "standard"):
        known = get_distinct_values(field)
        group_a = fuzzy_match_name(group_a, known)
        group_b = fuzzy_match_name(group_b, known)

    date_filter = build_date_filter(date_from=date_from, date_to=date_to)

    query_a = {field: group_a, **type_filter, **date_filter}
    query_b = {field: group_b, **type_filter, **date_filter}

    # Fetch bounded results for t-test
    docs_a = get_tests_with_results(query_a, properties=[property], limit=10000)
    docs_b = get_tests_with_results(query_b, properties=[property], limit=10000)

    # For mock data with string dates, apply Python-side date filter
    if is_mock() and (date_from or date_to):
        docs_a = filter_by_date_range(docs_a, date_from, date_to)
        docs_b = filter_by_date_range(docs_b, date_from, date_to)

    vals_a = extract_property_values(docs_a, property)
    vals_b = extract_property_values(docs_b, property)

    if len(vals_a) < 2 or len(vals_b) < 2:
        return {
            "result": {"error": "Not enough data for comparison (need at least 2 values per group)."},
            "steps": [
                f"Queried {group_type}={group_a}: {len(vals_a)} values",
                f"Queried {group_type}={group_b}: {len(vals_b)} values",
                "Insufficient data for t-test",
            ],
        }

    arr_a = np.array(vals_a)
    arr_b = np.array(vals_b)
    t_stat, p_value = sp_stats.ttest_ind(arr_a, arr_b)
    alpha = 0.05
    significant = bool(p_value < alpha)

    mean_a = round(float(np.mean(arr_a)), 1)
    mean_b = round(float(np.mean(arr_b)), 1)
    higher = group_a if mean_a > mean_b else group_b
    diff = abs(mean_a - mean_b)

    if significant:
        interpretation = (
            f"The difference IS statistically meaningful (p={p_value:.3f}). "
            f"{higher} shows higher {property.replace('_', ' ')} by ~{diff:.1f} on average. "
            f"This is not random noise."
        )
    else:
        interpretation = (
            f"The difference is NOT statistically significant (p={p_value:.3f}). "
            f"The ~{diff:.1f} difference between {group_a} and {group_b} "
            f"could be due to normal variation."
        )

    steps = [
        f"Queried all tests for {group_type}={group_a} (n={len(vals_a)}) and {group_type}={group_b} (n={len(vals_b)})",
        f"Extracted {property} values for both groups",
        "Ran two-sample t-test using scipy.stats.ttest_ind",
        f"p-value={p_value:.4f} — {'below' if significant else 'above'} alpha threshold of {alpha} → {'statistically significant' if significant else 'not significant'}",
    ]

    return {
        "result": {
            "group_a": {
                "name": group_a,
                "mean": mean_a,
                "std": round(float(np.std(arr_a, ddof=1)), 1),
                "n": len(vals_a),
            },
            "group_b": {
                "name": group_b,
                "mean": mean_b,
                "std": round(float(np.std(arr_b, ddof=1)), 1),
                "n": len(vals_b),
            },
            "property": property,
            "t_statistic": round(float(t_stat), 2),
            "p_value": round(float(p_value), 4),
            "significant": significant,
            "alpha": alpha,
            "interpretation": interpretation,
        },
        "steps": steps,
    }
