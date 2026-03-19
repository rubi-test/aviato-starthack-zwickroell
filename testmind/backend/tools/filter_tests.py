"""Tool 1: filter_tests — Search and filter tests by metadata."""

from collections import Counter
from db import get_collection
from tools.utils import filter_by_date_range, fuzzy_match_name, parse_natural_date_range, test_to_summary


def filter_tests(
    test_type: str = None,
    customer: str = None,
    material: str = None,
    tester: str = None,
    machine: str = None,
    site: str = None,
    date: str = None,
    date_from: str = None,
    date_to: str = None,
    limit: int = 50,
) -> dict:
    """Search and filter tests by metadata. At least one parameter should be provided."""
    tests_col = get_collection("Tests")

    # Resolve natural language date ranges
    if date_from and not date_to:
        nl_from, nl_to = parse_natural_date_range(date_from)
        if nl_from:
            date_from, date_to = nl_from, nl_to

    # Fuzzy match string fields
    if material:
        known = tests_col.distinct("TestParametersFlat.MATERIAL")
        material = fuzzy_match_name(material, known)
    if customer:
        known = tests_col.distinct("TestParametersFlat.CUSTOMER")
        customer = fuzzy_match_name(customer, known)
    if tester:
        known = tests_col.distinct("TestParametersFlat.TESTER")
        tester = fuzzy_match_name(tester, known)

    query = {}
    filter_descriptions = []

    if test_type:
        query["TestParametersFlat.TYPE_OF_TESTING_STR"] = test_type
        filter_descriptions.append(f"test_type={test_type}")
    if customer:
        query["TestParametersFlat.CUSTOMER"] = customer
        filter_descriptions.append(f"customer={customer}")
    if material:
        query["TestParametersFlat.MATERIAL"] = material
        filter_descriptions.append(f"material={material}")
    if tester:
        query["TestParametersFlat.TESTER"] = tester
        filter_descriptions.append(f"tester={tester}")
    if machine:
        query["TestParametersFlat.MACHINE"] = machine
        filter_descriptions.append(f"machine={machine}")
    if site:
        query["TestParametersFlat.SITE"] = site
        filter_descriptions.append(f"site={site}")
    if date:
        query["TestParametersFlat.Date"] = date
        filter_descriptions.append(f"date={date}")

    matched = list(tests_col.find(query))

    # Apply date range filtering (can't do in MongoDB query for DD.MM.YYYY strings)
    if date_from or date_to:
        matched = filter_by_date_range(matched, date_from, date_to)
        if date_from:
            filter_descriptions.append(f"date_from={date_from}")
        if date_to:
            filter_descriptions.append(f"date_to={date_to}")

    total = len(matched)
    limited = matched[:limit]

    summaries = [test_to_summary(t) for t in limited]

    # Build summary aggregations
    mat_counts = Counter(s["material"] for s in summaries)
    type_counts = Counter(s["test_type"] for s in summaries)

    steps = [
        f"Filters applied: {', '.join(filter_descriptions) or 'none'}",
        "Queried Tests collection with $match on TestParametersFlat fields",
        f"Found {total} matching tests" + (f" (showing first {limit})" if total > limit else ""),
    ]

    return {
        "result": {
            "tests": summaries,
            "count": total,
            "summary": {
                "by_material": dict(mat_counts),
                "by_test_type": dict(type_counts),
            },
        },
        "steps": steps,
    }
