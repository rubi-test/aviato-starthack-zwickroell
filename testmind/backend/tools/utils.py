"""Shared utilities for tool modules."""

import difflib
import re
from datetime import datetime, timedelta

from schema_map import STANDARD_TO_TEST_TYPE


def parse_date(date_str: str) -> datetime:
    """Parse date string to datetime. Supports multiple formats found in real data."""
    if not date_str:
        raise ValueError("Empty date string")

    date_str = date_str.strip()

    for fmt in (
        "%d.%m.%Y",   # 26.11.2021
        "%Y-%m-%d",    # 2021-11-26
        "%d-%m-%Y",    # 17-06-2025
        "%m/%d/%Y",    # 07/12/2023
        "%d-%b-%y",    # 03-Jun-25
        "%d-%b-%Y",    # 03-Jun-2025
    ):
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            pass

    # M/D/YYYY or M/DD/YYYY (no leading zeros)
    m = re.match(r"(\d{1,2})/(\d{1,2})/(\d{4})", date_str)
    if m:
        try:
            return datetime(int(m.group(3)), int(m.group(1)), int(m.group(2)))
        except ValueError:
            pass

    raise ValueError(f"Cannot parse date: {date_str}")


def parse_natural_date_range(text: str):
    """
    Parse natural language date expressions into (date_from, date_to) as DD.MM.YYYY strings.
    Returns (None, None) if not recognized.
    Supports: 'last N months', 'last N years', 'this year', 'last year',
              'Q1/Q2/Q3/Q4 YYYY', 'since Month YYYY', 'since January', etc.
    """
    now = datetime.now()
    text = text.lower().strip()

    # last N months
    m = re.match(r"last\s+(\d+)\s+months?", text)
    if m:
        n = int(m.group(1))
        dt_from = now - timedelta(days=n * 30)
        return _fmt(dt_from), _fmt(now)

    # last N years
    m = re.match(r"last\s+(\d+)\s+years?", text)
    if m:
        n = int(m.group(1))
        dt_from = now - timedelta(days=n * 365)
        return _fmt(dt_from), _fmt(now)

    # this year
    if text in ("this year", "current year"):
        return f"01.01.{now.year}", f"31.12.{now.year}"

    # last year
    if text == "last year":
        y = now.year - 1
        return f"01.01.{y}", f"31.12.{y}"

    # Q1/Q2/Q3/Q4 YYYY
    m = re.match(r"q([1-4])\s+(\d{4})", text)
    if m:
        q, year = int(m.group(1)), int(m.group(2))
        starts = {1: "01.01", 2: "01.04", 3: "01.07", 4: "01.10"}
        ends = {1: "31.03", 2: "30.06", 3: "30.09", 4: "31.12"}
        return f"{starts[q]}.{year}", f"{ends[q]}.{year}"

    # since Month YYYY  or  since Month
    month_names = {
        "january": 1, "february": 2, "march": 3, "april": 4,
        "may": 5, "june": 6, "july": 7, "august": 8,
        "september": 9, "october": 10, "november": 11, "december": 12,
        "jan": 1, "feb": 2, "mar": 3, "apr": 4,
        "jun": 6, "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
    }
    m = re.match(r"since\s+(\w+)(?:\s+(\d{4}))?", text)
    if m:
        mon_str = m.group(1)
        year_str = m.group(2)
        if mon_str in month_names:
            month = month_names[mon_str]
            year = int(year_str) if year_str else now.year
            dt_from = datetime(year, month, 1)
            return _fmt(dt_from), _fmt(now)

    return None, None


def _fmt(dt: datetime) -> str:
    return dt.strftime("%d.%m.%Y")


def format_date(dt: datetime) -> str:
    """Format datetime to DD.MM.YYYY."""
    return dt.strftime("%d.%m.%Y")


def build_date_filter(date: str = None, date_from: str = None, date_to: str = None) -> dict:
    """Build a MongoDB query fragment for date filtering.

    Uses _parsed_date (ISODate) when available for efficient range queries,
    falls back to exact string match on TestParametersFlat.Date.
    """
    from db import is_mock

    filters = {}

    if date:
        filters["TestParametersFlat.Date"] = date
        return filters

    if is_mock():
        # Mock data uses string dates — can't range-query efficiently
        return filters

    # Real data: use _parsed_date for range queries
    if date_from or date_to:
        date_range = {}
        if date_from:
            try:
                date_range["$gte"] = parse_date(date_from)
            except ValueError:
                pass
        if date_to:
            try:
                date_range["$lte"] = parse_date(date_to)
            except ValueError:
                pass
        if date_range:
            filters["TestParametersFlat._parsed_date"] = date_range

    return filters


def filter_by_date_range(tests: list[dict], date_from: str = None, date_to: str = None) -> list[dict]:
    """Filter test documents by date range (inclusive). Python-side fallback."""
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


def fuzzy_match_name(query: str, candidates: list[str], cutoff: float = 0.6) -> str:
    """
    Return the best matching candidate for query using fuzzy string matching.
    Falls back to the original query if no match is found above cutoff.
    Case-insensitive.
    """
    if not query or not candidates:
        return query

    # Filter out None/empty candidates (real DB can have nulls)
    candidates = [c for c in candidates if c]

    if not candidates:
        return query

    query_lower = query.lower()
    candidates_lower = [c.lower() for c in candidates]

    # Exact match first
    for i, c in enumerate(candidates_lower):
        if c == query_lower:
            return candidates[i]

    # difflib close match
    matches = difflib.get_close_matches(query_lower, candidates_lower, n=1, cutoff=cutoff)
    if matches:
        idx = candidates_lower.index(matches[0])
        return candidates[idx]

    # Substring match as fallback
    for i, c in enumerate(candidates_lower):
        if query_lower in c or c in query_lower:
            return candidates[i]

    return query


def extract_property_values(tests: list[dict], prop: str) -> list[float]:
    """Extract numeric property values from test documents, checking both
    TestParametersFlat and computed_results (for enriched docs)."""
    values = []
    for t in tests:
        v = t.get("TestParametersFlat", {}).get(prop)
        # Also check computed_results (enriched collection)
        if v is None:
            v = t.get("computed_results", {}).get(prop)
        if v is not None:
            try:
                values.append(float(v))
            except (TypeError, ValueError):
                pass
    return values


def get_property_value(test: dict, prop: str):
    """Get a single property value from a test document, checking both sources."""
    v = test.get("TestParametersFlat", {}).get(prop)
    if v is None:
        v = test.get("computed_results", {}).get(prop)
    return v


PROPERTY_TEST_TYPE = {
    "tensile_strength_mpa": "tensile",
    "tensile_modulus_mpa": "tensile",
    "elongation_at_break_pct": "tensile",
    "impact_energy_j": "charpy",
    "max_force_n": None,  # appears in multiple test types
    "force_at_break_n": "tensile",
    "upper_yield_point_mpa": "tensile",
    "strain_at_max_force_pct": "tensile",
    "nominal_strain_at_break_pct": "tensile",
    "work_to_max_force_j": "tensile",
    "work_to_break_j": "tensile",
    "cross_section_mm2": None,
}


def infer_test_type_filter(property: str, standard: str | None = None) -> dict:
    """Return a MongoDB query fragment to filter by the test type that produces this property.

    If a standard is provided (e.g. "DIN EN ISO 527"), uses STANDARD_TO_TEST_TYPE to
    infer the test type. Otherwise falls back to property-based inference.
    """
    # Standard-based inference takes priority
    if standard:
        for pattern, tt in STANDARD_TO_TEST_TYPE.items():
            if pattern.lower() in standard.lower():
                return {"TestParametersFlat.TYPE_OF_TESTING_STR": tt}

    test_type = PROPERTY_TEST_TYPE.get(property)
    if test_type:
        return {"TestParametersFlat.TYPE_OF_TESTING_STR": test_type}
    return {}


def resolve_property_path(prop: str) -> str:
    """Return the dotted MongoDB field path for a property name."""
    from data_access import _property_field
    return _property_field(prop)


def test_to_summary(t: dict) -> dict:
    """Convert a test document to a flat summary dict for API responses."""
    p = t.get("TestParametersFlat", {})
    cr = t.get("computed_results", {})

    return {
        "id": str(t.get("_id", "")),
        "date": p.get("Date", ""),
        "customer": p.get("CUSTOMER", ""),
        "material": p.get("MATERIAL", ""),
        "test_type": p.get("TYPE_OF_TESTING_STR", ""),
        "standard": p.get("STANDARD", ""),
        "machine": p.get("MACHINE", ""),
        "site": p.get("SITE", ""),
        "tester": p.get("TESTER", ""),
        "tensile_strength_mpa": p.get("tensile_strength_mpa") or cr.get("tensile_strength_mpa"),
        "tensile_modulus_mpa": p.get("tensile_modulus_mpa") or cr.get("tensile_modulus_mpa"),
        "elongation_at_break_pct": p.get("elongation_at_break_pct") or cr.get("elongation_at_break_pct"),
        "impact_energy_j": p.get("impact_energy_j") or cr.get("impact_energy_j"),
        "max_force_n": p.get("max_force_n") or cr.get("max_force_n"),
    }
