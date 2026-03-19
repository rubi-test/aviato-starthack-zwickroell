#!/usr/bin/env python3
"""Migrate dates: parse DD.MM.YYYY strings to ISODate in _parsed_date field.

Idempotent — skips documents that already have _parsed_date.
Processes in batches of 1000.

Usage:
    python scripts/migrate_dates.py
"""

import os
import sys
from datetime import datetime

from pymongo import MongoClient, UpdateOne
from dotenv import load_dotenv

# Load env from backend/.env
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "txp_clean")
TESTS_COLLECTION = os.getenv("TESTS_COLLECTION", "_tests")
BATCH_SIZE = 1000


def parse_date(date_str: str) -> datetime | None:
    """Parse DD.MM.YYYY or YYYY-MM-DD to datetime."""
    if not date_str or not isinstance(date_str, str):
        return None
    date_str = date_str.strip()
    for fmt in ("%d.%m.%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            continue
    return None


def main():
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    db = client[DB_NAME]
    tests = db[TESTS_COLLECTION]

    # Count docs needing migration (no _parsed_date yet, but has Date)
    needs_migration = tests.count_documents({
        "TestParametersFlat.Date": {"$exists": True},
        "TestParametersFlat._parsed_date": {"$exists": False},
    })

    print(f"Documents needing date migration: {needs_migration:,}")
    if needs_migration == 0:
        print("Nothing to do — all dates already migrated.")
        return

    migrated = 0
    failed = 0
    cursor = tests.find(
        {
            "TestParametersFlat.Date": {"$exists": True},
            "TestParametersFlat._parsed_date": {"$exists": False},
        },
        {"_id": 1, "TestParametersFlat.Date": 1},
    )

    batch = []
    for doc in cursor:
        date_str = doc.get("TestParametersFlat", {}).get("Date", "")
        parsed = parse_date(date_str)

        if parsed:
            batch.append(UpdateOne(
                {"_id": doc["_id"]},
                {"$set": {"TestParametersFlat._parsed_date": parsed}},
            ))
        else:
            failed += 1

        if len(batch) >= BATCH_SIZE:
            result = tests.bulk_write(batch, ordered=False)
            migrated += result.modified_count
            print(f"  Migrated {migrated:,} / {needs_migration:,} ...", flush=True)
            batch = []

    # Flush remaining
    if batch:
        result = tests.bulk_write(batch, ordered=False)
        migrated += result.modified_count

    print(f"\nDone: {migrated:,} migrated, {failed:,} failed to parse.")


if __name__ == "__main__":
    main()
