#!/usr/bin/env python3
"""Build the tests_enriched collection by pre-joining tests with their result values.

For each test document, looks up result values from valuecolumns_migrated,
matches childId patterns to identify result types using schema_map,
and stores scalar values under computed_results.{property_name}.

Incremental: only processes tests not yet in the enriched collection.

Usage:
    python scripts/build_enriched.py              # process all
    python scripts/build_enriched.py --limit 20   # process first 20 unenriched tests
"""

import os
import sys
import math
import argparse
from datetime import datetime

from pymongo import MongoClient
from dotenv import load_dotenv

# Add parent dir to path so we can import schema_map
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from schema_map import (
    RESULT_UUID_TO_PROPERTY,
    PREFERRED_UNIT_TABLE,
    convert_to_display_unit,
    _RESULT_UUID_UPPER,
)

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "txp_clean")
TESTS_COLLECTION = os.getenv("TESTS_COLLECTION", "_tests")
VALUES_COLLECTION = os.getenv("VALUES_COLLECTION", "valuecolumns_migrated")
ENRICHED_COLLECTION = os.getenv("ENRICHED_COLLECTION", "tests_enriched")
BATCH_SIZE = 50


def parse_date(date_str: str) -> datetime | None:
    """Parse DD.MM.YYYY or YYYY-MM-DD to datetime."""
    if not date_str or not isinstance(date_str, str):
        return None
    for fmt in ("%d.%m.%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(date_str.strip(), fmt)
        except ValueError:
            continue
    return None


def build_value_childid(result_uuid: str, unit_table: str) -> str:
    """Build the childId used to look up a result value in valuecolumns_migrated.

    Format: {UUID}-UnitTable.{UUID}-UnitTable_Value
    Example: {9DB9C049-9B04-4bf1-BD29-A160E86DE691}-Zwick.Unittable.Force.{9DB9C049-...}-Zwick.Unittable.Force_Value
    """
    # result_uuid is uppercase; we need original case from the dict keys
    # Use the UUID with braces
    uuid_braced = "{" + result_uuid + "}"

    # Some results have simpler format: {UUID}_Value (no unit table in path)
    # But most use: {UUID}-UnitTable.{UUID}-UnitTable_Value
    return f"{uuid_braced}-{unit_table}.{uuid_braced}-{unit_table}_Value"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=0, help="Max tests to process (0=all)")
    args = parser.parse_args()

    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    db = client[DB_NAME]
    tests_col = db[TESTS_COLLECTION]
    values_col = db[VALUES_COLLECTION]
    enriched_col = db[ENRICHED_COLLECTION]

    # Find test IDs already enriched
    existing_ids = set()
    for doc in enriched_col.find({}, {"_id": 1}):
        existing_ids.add(doc["_id"])

    total_tests = tests_col.estimated_document_count()
    already_done = len(existing_ids)
    print(f"Total tests: {total_tests:,}, already enriched: {already_done:,}")

    # Build the set of (result_uuid_upper, property_name, preferred_unit_table) lookups
    lookups = []
    for uuid_upper, prop_name in _RESULT_UUID_UPPER.items():
        preferred_ut = PREFERRED_UNIT_TABLE.get(prop_name)
        if preferred_ut:
            lookups.append((uuid_upper, prop_name, preferred_ut))

    print(f"Looking up {len(lookups)} result properties per test")

    # Process un-enriched tests
    query = {"_id": {"$nin": list(existing_ids)}} if existing_ids else {}
    cursor = tests_col.find(query)
    if args.limit > 0:
        cursor = cursor.limit(args.limit)

    batch = []
    processed = 0
    enriched_count = 0
    values_found = 0

    for test_doc in cursor:
        test_id = test_doc["_id"]
        tpf = test_doc.get("TestParametersFlat", {})

        # Parse date
        parsed_date = tpf.get("_parsed_date")
        if not parsed_date:
            date_str = tpf.get("Date", "")
            parsed_date = parse_date(date_str)

        # Look up result values from valuecolumns_migrated
        computed_results = {}

        for uuid_upper, prop_name, unit_table in lookups:
            # Build the exact childId for this result + unit combination
            # Need original-case UUID for lookup (the DB stores mixed case)
            # Try to find the matching value doc
            child_id = build_value_childid(uuid_upper, unit_table)

            vdoc = values_col.find_one(
                {"metadata.refId": test_id, "metadata.childId": child_id},
                {"values": {"$slice": 1}},  # Only get first value (scalar results have 1)
            )

            if not vdoc:
                # Try case-insensitive match on the UUID part
                # The real data has mixed-case UUIDs like {9DB9C049-9B04-4bf1-BD29-...}
                # Our uppercase may not match. Try finding via the original keys.
                for orig_uuid in RESULT_UUID_TO_PROPERTY:
                    if orig_uuid.upper() == uuid_upper:
                        child_id = build_value_childid(orig_uuid, unit_table)
                        vdoc = values_col.find_one(
                            {"metadata.refId": test_id, "metadata.childId": child_id},
                            {"values": {"$slice": 1}},
                        )
                        if vdoc:
                            break

            if vdoc:
                raw_values = vdoc.get("values", [])
                if raw_values and not math.isnan(raw_values[0]):
                    raw_val = raw_values[0]
                    display_val = convert_to_display_unit(prop_name, raw_val)
                    computed_results[prop_name] = round(display_val, 4)
                    values_found += 1

        # Build enriched document
        enriched_doc = {
            "_id": test_id,
            "TestParametersFlat": {**tpf, "_parsed_date": parsed_date},
            "_parsed_date": parsed_date,
            "computed_results": computed_results,
        }

        batch.append(enriched_doc)
        processed += 1

        if len(batch) >= BATCH_SIZE:
            try:
                enriched_col.insert_many(batch, ordered=False)
            except Exception as e:
                # Skip duplicate key errors (idempotent)
                if "duplicate key" not in str(e).lower():
                    raise
            enriched_count += len(batch)
            props_per_test = values_found / max(enriched_count, 1)
            print(f"  Enriched {enriched_count:,} tests, ~{props_per_test:.1f} props/test ...", flush=True)
            batch = []

    # Flush remaining
    if batch:
        try:
            enriched_col.insert_many(batch, ordered=False)
        except Exception as e:
            if "duplicate key" not in str(e).lower():
                raise
        enriched_count += len(batch)

    print(f"\nDone: {enriched_count:,} documents enriched, {values_found:,} total values found.")

    # Spot check
    print("\n=== Spot check (5 enriched docs) ===")
    for doc in enriched_col.find().limit(5):
        mat = doc.get("TestParametersFlat", {}).get("MATERIAL", "?")
        cr = doc.get("computed_results", {})
        date = doc.get("_parsed_date", "?")
        print(f"  {mat} | date={date} | results: {cr}")


if __name__ == "__main__":
    main()
