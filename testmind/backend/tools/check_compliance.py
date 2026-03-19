"""Tool 7: check_compliance — Check if material test results meet a threshold guideline."""

import numpy as np
from db import get_collection
from tools.utils import extract_property_values, fuzzy_match_name, test_to_summary


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
    tests_col = get_collection("Tests")
    known = tests_col.distinct("TestParametersFlat.MATERIAL")
    material = fuzzy_match_name(material, known)

    all_tests = list(tests_col.find({"TestParametersFlat.MATERIAL": material}))

    if not all_tests:
        return {
            "result": {"error": f"No tests found for material '{material}'."},
            "steps": [f"Queried Tests for MATERIAL={material}", "Found 0 tests"],
        }

    values = extract_property_values(all_tests, property)

    if not values:
        return {
            "result": {"error": f"No values found for property '{property}' on '{material}'."},
            "steps": [f"Found {len(all_tests)} tests but none have {property}"],
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
    unit = "MPa" if "mpa" in property else ("J" if "_j" in property else "%")

    # Get failed test summaries
    failed_tests = []
    for t in all_tests:
        v = t.get("TestParametersFlat", {}).get(property)
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
