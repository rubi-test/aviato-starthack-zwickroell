"""Shared utilities for tool modules."""

import difflib
import re
from datetime import datetime, timedelta


def parse_date(date_str: str) -> datetime:
    """Parse date string to datetime. Supports DD.MM.YYYY and natural language."""
    if not date_str:
        raise ValueError("Empty date string")

    date_str = date_str.strip()

    # Standard format
    try:
        return datetime.strptime(date_str, "%d.%m.%Y")
    except ValueError:
        pass

    # ISO format YYYY-MM-DD
    try:
        return datetime.strptime(date_str, "%Y-%m-%d")
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
    """Build a MongoDB query fragment for date filtering on TestParametersFlat.Date."""
    filters = {}
    if date:
        filters["TestParametersFlat.Date"] = date
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


def fuzzy_match_name(query: str, candidates: list[str], cutoff: float = 0.6) -> str:
    """
    Return the best matching candidate for query using fuzzy string matching.
    Falls back to the original query if no match is found above cutoff.
    Case-insensitive.
    """
    if not query or not candidates:
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
