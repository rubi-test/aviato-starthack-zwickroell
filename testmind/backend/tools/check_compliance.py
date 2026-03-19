"""Tool 7: check_compliance — Check if material test results meet a threshold guideline."""

import numpy as np
from data_access import get_tests_with_results, get_distinct_values, get_stats_aggregation
from tools.utils import extract_property_values, fuzzy_match_name, test_to_summary, get_property_value
from schema_map import get_unit


def check_compliance(
    material: str,
    property: str,
    threshold_value: float,
    direction: str = "above",
) -> dict:
    """
    Check what percentage of test results for a material meet an internal guideline.
    direction='above' means the value must be >= threshold (minimum spec).
    direction='below' means the value must be <= threshold (maximum spec).
    """
    known = get_distinct_values("TestParametersFlat.MATERIAL")
    material = fuzzy_match_name(material, known)

    query = {"TestParametersFlat.MATERIAL": material}

    # Get stats via aggregation (fast)
    stats = get_stats_aggregation(query, property)

    if stats["n"] == 0:
        return {
            "result": {"error": f"No values found for property '{property}' on '{material}'."},
            "steps": [f"Queried Tests for MATERIAL={material}", f"Found 0 tests with {property}"],
        }

    # Get individual values for pass/fail calculation and failed samples
    all_tests = get_tests_with_results(query, properties=[property], limit=50000)
    values = extract_property_values(all_tests, property)

    if not values:
        return {
            "result": {"error": f"No values found for property '{property}' on '{material}'."},
            "steps": [f"Found tests but none have {property}"],
        }

    arr = np.array(values)
    total = len(arr)

    if direction == "above":
        passing = arr[arr >= threshold_value]
        failing_mask = arr < threshold_value
    else:
        passing = arr[arr <= threshold_value]
        failing_mask = arr > threshold_value

    pass_count = len(passing)
    fail_count = total - pass_count
    pass_rate = round(100 * pass_count / total, 1)

    mean_val = round(float(np.mean(arr)), 1)
    unit = get_unit(property)

    # Get failed test summaries
    failed_tests = []
    for t in all_tests:
        v = get_property_value(t, property)
        if v is None:
            continue
        v = float(v)
        if (direction == "above" and v < threshold_value) or (direction == "below" and v > threshold_value):
            s = test_to_summary(t)
            s["value"] = round(v, 1)
            failed_tests.append(s)

    failed_tests.sort(key=lambda x: x.get("date", ""))

    if pass_rate >= 95:
        verdict = "COMPLIANT"
        verdict_detail = f"Excellent — {pass_rate}% of tests meet the {threshold_value} {unit} guideline."
    elif pass_rate >= 80:
        verdict = "AT RISK"
        verdict_detail = f"Caution — {pass_rate}% pass rate. {fail_count} test(s) below spec. Monitor closely."
    else:
        verdict = "NON-COMPLIANT"
        verdict_detail = f"Action required — only {pass_rate}% of tests meet the guideline. Mean is {mean_val} {unit} vs threshold {threshold_value} {unit}."

    direction_label = f">= {threshold_value}" if direction == "above" else f"<= {threshold_value}"

    steps = [
        f"Queried all tests for MATERIAL={material}",
        f"Found {total} tests with {property} values",
        f"Compliance rule: {property.replace('_', ' ')} {direction_label} {unit}",
        f"{pass_count}/{total} tests pass ({pass_rate}%)",
        f"Verdict: {verdict}",
    ]

    return {
        "result": {
            "material": material,
            "property": property,
            "threshold_value": threshold_value,
            "direction": direction,
            "unit": unit,
            "total_tests": total,
            "passing_tests": pass_count,
            "failing_tests": fail_count,
            "pass_rate_pct": pass_rate,
            "mean_value": mean_val,
            "verdict": verdict,
            "verdict_detail": verdict_detail,
            "failed_test_samples": failed_tests[:10],
        },
        "steps": steps,
    }
