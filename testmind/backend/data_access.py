"""Data access layer — queries _tests directly (all 31K docs) and does live
lookups to valuecolumns_migrated for result values when needed.

No enrichment step required. The compound index on (metadata.refId, metadata.childId)
makes each value lookup ~1ms, so fetching results for 200 tests = ~200ms.

Usage:
    from data_access import get_tests_with_results, get_monthly_aggregation, ...
"""

import math
from datetime import datetime, timedelta

from db import get_tests_collection, get_values_collection, is_mock


def _date_field() -> str:
    """Return the field path used for date operations."""
    if is_mock():
        return "TestParametersFlat.Date"
    return "TestParametersFlat._parsed_date"


# ---------------------------------------------------------------------------
# Live value lookups from valuecolumns_migrated
# ---------------------------------------------------------------------------


def _build_child_id(result_uuid: str, unit_table: str) -> str:
    """Build the childId to look up a result value.

    Format: {UUID}-UnitTable.{UUID}-UnitTable_Value
    """
    return f"{{{result_uuid}}}-{unit_table}.{{{result_uuid}}}-{unit_table}_Value"


def _lookup_result_values(tests: list[dict], properties: list[str]) -> list[dict]:
    """Look up result values from valuecolumns_migrated for each test, live.

    Attaches computed_results dict to each test document.
    Uses the compound index (metadata.refId, metadata.childId) for fast lookups.
    """
    from schema_map import (
        PROPERTY_TO_RESULT_UUID,
        PREFERRED_UNIT_TABLE,
        RESULT_UUID_TO_PROPERTY,
        convert_to_display_unit,
    )

    vals_col = get_values_collection()

    # Pre-compute the (prop, childId) pairs we need to look up
    prop_lookups: list[tuple[str, str]] = []
    for prop in properties:
        uuid = PROPERTY_TO_RESULT_UUID.get(prop)
        ut = PREFERRED_UNIT_TABLE.get(prop)
        if uuid and ut:
            # Try original case first
            prop_lookups.append((prop, _build_child_id(uuid, ut)))

    if not prop_lookups:
        return tests

    for test in tests:
        test_id = test["_id"]
        computed = {}

        for prop_name, child_id in prop_lookups:
            vdoc = vals_col.find_one(
                {"metadata.refId": test_id, "metadata.childId": child_id},
                {"values": {"$slice": 1}},
            )
            if vdoc:
                raw = vdoc.get("values", [])
                if raw and not math.isnan(raw[0]):
                    computed[prop_name] = round(
                        convert_to_display_unit(prop_name, raw[0]), 4
                    )

        test["computed_results"] = computed

    return tests


def _lookup_single_property(test_ids: list[str], prop: str) -> dict[str, float]:
    """Batch lookup a single property for many tests. Returns {test_id: value}."""
    from schema_map import (
        PROPERTY_TO_RESULT_UUID,
        PREFERRED_UNIT_TABLE,
        convert_to_display_unit,
    )

    uuid = PROPERTY_TO_RESULT_UUID.get(prop)
    ut = PREFERRED_UNIT_TABLE.get(prop)
    if not uuid or not ut:
        return {}

    child_id = _build_child_id(uuid, ut)
    vals_col = get_values_collection()

    results = {}
    for tid in test_ids:
        vdoc = vals_col.find_one(
            {"metadata.refId": tid, "metadata.childId": child_id},
            {"values": {"$slice": 1}},
        )
        if vdoc:
            raw = vdoc.get("values", [])
            if raw and not math.isnan(raw[0]):
                results[tid] = round(convert_to_display_unit(prop, raw[0]), 4)

    return results


# ---------------------------------------------------------------------------
# Core query functions
# ---------------------------------------------------------------------------


def get_tests_with_results(
    query: dict,
    properties: list[str] | None = None,
    limit: int = 1000,
    sort_by_date: bool = False,
) -> list[dict]:
    """Fetch tests matching query, with live value lookups for result properties.

    Queries _tests directly (all 31K docs), then does on-the-fly lookups to
    valuecolumns_migrated for any requested result properties.
    """
    col = get_tests_collection()

    sort_spec = None
    if sort_by_date:
        sort_spec = [(_date_field(), -1)]

    cursor = col.find(query)
    if sort_spec:
        cursor = cursor.sort(sort_spec)
    cursor = cursor.limit(limit)

    tests = list(cursor)

    # Live lookup result values if needed and not mock
    if properties and not is_mock():
        tests = _lookup_result_values(tests, properties)

    return tests


def get_monthly_aggregation(
    query: dict,
    prop: str,
    months_back: int = 12,
) -> list[dict]:
    """Monthly mean/std/min/max — queries _tests, then live-lookups values.

    Returns list of dicts: [{"date": "2024-01", "mean_value": ..., ...}]
    """
    col = get_tests_collection()

    if is_mock():
        return _monthly_aggregation_python(col, query, prop, months_back)

    date_fld = _date_field()
    cutoff = datetime.now() - timedelta(days=months_back * 30)

    # Step 1: Get matching test IDs + dates from _tests
    match_query = {**query, date_fld: {"$gte": cutoff}}
    tests = list(col.find(match_query, {"_id": 1, "TestParametersFlat._parsed_date": 1}).limit(10000))

    if not tests:
        return []

    # Step 2: Batch lookup the property values
    test_ids = [t["_id"] for t in tests]
    value_map = _lookup_single_property(test_ids, prop)

    if not value_map:
        return []

    # Step 3: Group by month in Python
    monthly: dict[str, list[float]] = {}
    for t in tests:
        tid = t["_id"]
        val = value_map.get(tid)
        if val is None:
            continue
        pd = t.get("TestParametersFlat", {}).get("_parsed_date")
        if not isinstance(pd, datetime):
            continue
        key = f"{pd.year}-{pd.month:02d}"
        monthly.setdefault(key, []).append(val)

    results = []
    for key in sorted(monthly.keys()):
        vals = monthly[key]
        results.append({
            "date": key,
            "mean_value": round(sum(vals) / len(vals), 1),
            "std_value": round(_compute_std(vals), 2),
            "min_value": round(min(vals), 1),
            "max_value": round(max(vals), 1),
            "n": len(vals),
        })

    return results


def get_stats_aggregation(query: dict, prop: str) -> dict:
    """Compute mean/std/min/max/n — queries _tests, then live-lookups values.

    Returns: {"mean": ..., "std": ..., "min": ..., "max": ..., "n": ...}
    """
    col = get_tests_collection()

    if is_mock():
        return _stats_aggregation_python(col, query, prop)

    # Step 1: Get matching test IDs
    test_ids = [d["_id"] for d in col.find(query, {"_id": 1}).limit(50000)]

    if not test_ids:
        return {"mean": 0, "std": 0, "min": 0, "max": 0, "n": 0}

    # Step 2: Batch lookup the property
    value_map = _lookup_single_property(test_ids, prop)

    vals = list(value_map.values())
    if not vals:
        return {"mean": 0, "std": 0, "min": 0, "max": 0, "n": 0}

    mean = sum(vals) / len(vals)
    return {
        "mean": round(mean, 1),
        "std": round(_compute_std(vals), 2),
        "min": round(min(vals), 1),
        "max": round(max(vals), 1),
        "n": len(vals),
    }


def get_test_count(query: dict) -> int:
    """Count documents matching query. Queries _tests directly (all 31K docs)."""
    col = get_tests_collection()
    return col.count_documents(query)


def get_distinct_values(field: str, query: dict | None = None) -> list:
    """Get distinct values for a field. Queries _tests directly (all 31K docs)."""
    col = get_tests_collection()
    if query:
        return col.distinct(field, query)
    return col.distinct(field)


def get_recent_tests(limit: int = 8) -> list[dict]:
    """Get the most recent tests sorted by parsed date. Queries _tests directly."""
    col = get_tests_collection()
    date_fld = _date_field()

    if is_mock():
        all_tests = list(col.find().limit(200))
        from tools.utils import parse_date
        def _sort_key(t):
            try:
                return parse_date(t.get("TestParametersFlat", {}).get("Date", ""))
            except (ValueError, TypeError):
                return datetime.min
        all_tests.sort(key=_sort_key, reverse=True)
        return all_tests[:limit]

    return list(
        col.find()
        .sort([(date_fld, -1)])
        .limit(limit)
    )


def get_daily_counts(days_back: int = 14, reference_date: datetime | None = None) -> list[int]:
    """Get daily test counts for sparkline display. Queries _tests directly."""
    col = get_tests_collection()
    date_fld = _date_field()

    if is_mock():
        return _daily_counts_python(col, days_back, reference_date)

    ref = reference_date or datetime.now()
    start = ref - timedelta(days=days_back)

    pipeline = [
        {"$match": {date_fld: {"$gte": start, "$lte": ref}}},
        {"$addFields": {
            "_day": {"$dateToString": {"format": "%Y-%m-%d", "date": f"${date_fld}"}},
        }},
        {"$group": {"_id": "$_day", "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}},
    ]

    day_counts = {}
    for doc in col.aggregate(pipeline):
        day_counts[doc["_id"]] = doc["count"]

    result = []
    for i in range(days_back):
        day = start + timedelta(days=i)
        key = day.strftime("%Y-%m-%d")
        result.append(day_counts.get(key, 0))

    return result


def get_grouped_counts(group_field: str, query: dict | None = None) -> list[dict]:
    """Group by a field and count documents. Queries _tests directly (all 31K docs)."""
    col = get_tests_collection()

    if is_mock():
        return _grouped_counts_python(col, group_field, query)

    match_stage = {"$match": query} if query else {"$match": {}}

    pipeline = [
        match_stage,
        {"$group": {"_id": f"${group_field}", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]

    return [
        {"name": doc["_id"] or "unknown", "count": doc["count"]}
        for doc in col.aggregate(pipeline)
    ]


# ---------------------------------------------------------------------------
# Python-side fallbacks for mock data
# ---------------------------------------------------------------------------


def _grouped_counts_python(col, group_field: str, query: dict | None) -> list[dict]:
    """Python-side grouping for mock data."""
    from collections import Counter

    docs = list(col.find(query or {}))
    parts = group_field.split(".")
    counter: Counter = Counter()
    for doc in docs:
        val = doc
        for part in parts:
            val = val.get(part, {}) if isinstance(val, dict) else None
            if val is None:
                break
        if val:
            counter[val] += 1

    return sorted(
        [{"name": name, "count": count} for name, count in counter.items()],
        key=lambda x: -x["count"],
    )


def _monthly_aggregation_python(col, query: dict, prop: str, months_back: int) -> list:
    """Python-side monthly aggregation for mock data with string dates."""
    import numpy as np
    from tools.utils import parse_date

    all_tests = list(col.find(query))
    latest = datetime.min
    dated_values = []

    for t in all_tests:
        p = t.get("TestParametersFlat", {})
        date_str = p.get("Date", "")
        val = p.get(prop)
        if date_str and val is not None:
            try:
                dt = parse_date(date_str)
                dated_values.append((dt, float(val)))
                if dt > latest:
                    latest = dt
            except (ValueError, TypeError):
                pass

    if not dated_values:
        return []

    cutoff = latest - timedelta(days=months_back * 30)
    dated_values = [(dt, v) for dt, v in dated_values if dt >= cutoff]

    monthly: dict[str, list[float]] = {}
    for dt, val in dated_values:
        key = f"{dt.year}-{dt.month:02d}"
        monthly.setdefault(key, []).append(val)

    results = []
    for key in sorted(monthly.keys()):
        vals = monthly[key]
        arr = np.array(vals)
        results.append({
            "date": key,
            "mean_value": round(float(np.mean(arr)), 1),
            "std_value": round(float(np.std(arr, ddof=1)) if len(arr) > 1 else 0.0, 2),
            "min_value": round(float(np.min(arr)), 1),
            "max_value": round(float(np.max(arr)), 1),
            "n": len(vals),
        })

    return results


def _stats_aggregation_python(col, query: dict, prop: str) -> dict:
    """Python-side stats for mock data."""
    import numpy as np

    all_tests = list(col.find(query))
    vals = []
    for t in all_tests:
        v = t.get("TestParametersFlat", {}).get(prop)
        if v is not None:
            try:
                vals.append(float(v))
            except (TypeError, ValueError):
                pass

    if not vals:
        return {"mean": 0, "std": 0, "min": 0, "max": 0, "n": 0}

    arr = np.array(vals)
    return {
        "mean": round(float(np.mean(arr)), 1),
        "std": round(float(np.std(arr, ddof=1)) if len(arr) > 1 else 0.0, 2),
        "min": round(float(np.min(arr)), 1),
        "max": round(float(np.max(arr)), 1),
        "n": len(vals),
    }


def _daily_counts_python(col, days_back: int, reference_date: datetime | None) -> list[int]:
    """Python-side daily counts for mock data."""
    from tools.utils import parse_date

    all_tests = list(col.find())

    dates = []
    for t in all_tests:
        d = t.get("TestParametersFlat", {}).get("Date", "")
        if d:
            try:
                dates.append(parse_date(d))
            except (ValueError, TypeError):
                pass

    ref = reference_date or (max(dates) if dates else datetime.now())
    start = ref - timedelta(days=days_back)

    result = []
    for i in range(days_back):
        day = start + timedelta(days=i)
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        count = 0
        for t in all_tests:
            d = t.get("TestParametersFlat", {}).get("Date", "")
            if d:
                try:
                    dt = parse_date(d)
                    if day_start <= dt < day_end:
                        count += 1
                except (ValueError, TypeError):
                    pass
        result.append(count)

    return result


def _compute_std(vals: list[float]) -> float:
    """Compute sample standard deviation from a list of values."""
    if len(vals) < 2:
        return 0.0
    n = len(vals)
    mean = sum(vals) / n
    variance = sum((v - mean) ** 2 for v in vals) / (n - 1)
    return variance ** 0.5
