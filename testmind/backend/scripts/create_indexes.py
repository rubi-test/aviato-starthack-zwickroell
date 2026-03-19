#!/usr/bin/env python3
"""Create MongoDB indexes for efficient querying on 100GB dataset.

Idempotent — MongoDB skips indexes that already exist.

Usage:
    python scripts/create_indexes.py
"""

import os
from pymongo import MongoClient, ASCENDING, DESCENDING
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "txp_clean")
TESTS_COLLECTION = os.getenv("TESTS_COLLECTION", "_tests")
VALUES_COLLECTION = os.getenv("VALUES_COLLECTION", "valuecolumns_migrated")
ENRICHED_COLLECTION = os.getenv("ENRICHED_COLLECTION", "tests_enriched")


def main():
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    db = client[DB_NAME]

    tests = db[TESTS_COLLECTION]
    values = db[VALUES_COLLECTION]
    enriched = db[ENRICHED_COLLECTION]

    print("Creating indexes on Tests collection...")
    tests.create_index("TestParametersFlat.MATERIAL", background=True)
    tests.create_index("TestParametersFlat.TYPE_OF_TESTING_STR", background=True)
    tests.create_index("TestParametersFlat.STANDARD", background=True)
    tests.create_index("TestParametersFlat.CUSTOMER", background=True)
    tests.create_index("TestParametersFlat._parsed_date", background=True)
    tests.create_index(
        [
            ("TestParametersFlat.MATERIAL", ASCENDING),
            ("TestParametersFlat.TYPE_OF_TESTING_STR", ASCENDING),
            ("TestParametersFlat._parsed_date", DESCENDING),
        ],
        background=True,
        name="material_type_date",
    )
    print("  Tests indexes created.")

    print("Creating indexes on Values collection...")
    values.create_index("metadata.refId", background=True)
    values.create_index(
        [("metadata.refId", ASCENDING), ("metadata.childId", ASCENDING)],
        background=True,
        name="ref_child",
    )
    print("  Values indexes created.")

    print("Creating indexes on enriched collection...")
    enriched.create_index("TestParametersFlat.MATERIAL", background=True)
    enriched.create_index("TestParametersFlat.TYPE_OF_TESTING_STR", background=True)
    enriched.create_index("TestParametersFlat.STANDARD", background=True)
    enriched.create_index("TestParametersFlat.CUSTOMER", background=True)
    enriched.create_index("TestParametersFlat._parsed_date", background=True)
    enriched.create_index(
        [
            ("TestParametersFlat.MATERIAL", ASCENDING),
            ("TestParametersFlat.TYPE_OF_TESTING_STR", ASCENDING),
            ("TestParametersFlat._parsed_date", DESCENDING),
        ],
        background=True,
        name="material_type_date",
    )
    print("  Enriched indexes created.")

    # List all indexes for verification
    for col_name, col in [("Tests", tests), ("Values", values), ("enriched", enriched)]:
        print(f"\n{col_name} indexes:")
        for idx in col.list_indexes():
            print(f"  {idx['name']}: {idx['key']}")

    print("\nDone.")


if __name__ == "__main__":
    main()
