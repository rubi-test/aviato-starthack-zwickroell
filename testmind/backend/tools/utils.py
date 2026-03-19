"""Shared utilities for tool modules."""

from datetime import datetime


def parse_date(date_str: str) -> datetime:
    """Parse DD.MM.YYYY date string to datetime."""
    return datetime.strptime(date_str, "%d.%m.%Y")


def format_date(dt: datetime) -> str:
    """Format datetime to DD.MM.YYYY."""
    return dt.strftime("%d.%m.%Y")


def build_date_filter(date: str = None, date_from: str = None, date_to: str = None) -> dict:
    """Build a MongoDB query fragment for date filtering on TestParametersFlat.Date.

    Dates are stored as 'DD.MM.YYYY' strings, so we compare them as parsed datetimes
    by filtering in Python after retrieval. Returns filter criteria as a dict.
    """
    filters = {}
    if date:
        filters["TestParametersFlat.Date"] = date
    # date_from/date_to are handled post-query since string comparison
    # on DD.MM.YYYY doesn't sort correctly. The caller must filter in Python.
    return filters


def filter_by_date_range(tests: list[dict], date_from: str = None, date_to: str = None) -> list[dict]:
    """Filter test documents by date range (inclusive)."""
    if not date_from and not date_to:
        return tests

    dt_from = parse_date(date_from) if date_from else None
    dt_to = parse_date(date_to) if date_to else None

    result = []
    for t in tests:
        date_str = t.get("TestParametersFlat", {}).get("Date", "")
        if not date_str:
            continue
        try:
            dt = parse_date(date_str)
        except ValueError:
            continue
        if dt_from and dt < dt_from:
            continue
        if dt_to and dt > dt_to:
            continue
        result.append(t)
    return result


def extract_property_values(tests: list[dict], prop: str) -> list[float]:
    """Extract numeric property values from TestParametersFlat, skipping missing."""
    values = []
    for t in tests:
        v = t.get("TestParametersFlat", {}).get(prop)
        if v is not None:
            try:
                values.append(float(v))
            except (TypeError, ValueError):
                pass
    return values


PROPERTY_TEST_TYPE = {
    "tensile_strength_mpa": "tensile",
    "tensile_modulus_mpa": "tensile",
    "elongation_at_break_pct": "tensile",
    "impact_energy_j": "charpy",
}


def infer_test_type_filter(property: str) -> dict:
    """Return a MongoDB query fragment to filter by the test type that produces this property."""
    test_type = PROPERTY_TEST_TYPE.get(property)
    if test_type:
        return {"TestParametersFlat.TYPE_OF_TESTING_STR": test_type}
    return {}


def test_to_summary(t: dict) -> dict:
    """Convert a test document to a flat summary dict for API responses."""
    p = t.get("TestParametersFlat", {})
    return {
        "id": t.get("_id", ""),
        "date": p.get("Date", ""),
        "customer": p.get("CUSTOMER", ""),
        "material": p.get("MATERIAL", ""),
        "test_type": p.get("TYPE_OF_TESTING_STR", ""),
        "machine": p.get("MACHINE", ""),
        "site": p.get("SITE", ""),
        "tester": p.get("TESTER", ""),
        "tensile_strength_mpa": p.get("tensile_strength_mpa"),
        "tensile_modulus_mpa": p.get("tensile_modulus_mpa"),
        "elongation_at_break_pct": p.get("elongation_at_break_pct"),
        "impact_energy_j": p.get("impact_energy_j"),
        "max_force_n": p.get("max_force_n"),
    }
