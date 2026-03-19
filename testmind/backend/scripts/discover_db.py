#!/usr/bin/env python3
"""Discovery script — explore the real MongoDB to identify DB name, collections, and document shapes.

Run once to understand the data before migrating:
    python scripts/discover_db.py
"""

from pymongo import MongoClient

MONGO_URI = "mongodb://localhost:27017"


def main():
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)

    # 1. List all databases
    db_names = client.list_database_names()
    print("=== DATABASES ===")
    for name in db_names:
        print(f"  {name}")

    # 2. For each non-system DB, list collections and doc counts
    for db_name in db_names:
        if db_name in ("admin", "config", "local"):
            continue

        db = client[db_name]
        collections = db.list_collection_names()
        if not collections:
            continue

        print(f"\n=== DATABASE: {db_name} ===")
        for col_name in sorted(collections):
            col = db[col_name]
            count = col.estimated_document_count()
            print(f"  Collection: {col_name} — ~{count:,} documents")

            # Sample 2 docs, print top-level keys
            samples = list(col.find().limit(2))
            for i, doc in enumerate(samples):
                keys = list(doc.keys())
                print(f"    Sample {i+1} top-level keys: {keys}")

                # If it has TestParametersFlat, show its keys
                tpf = doc.get("TestParametersFlat")
                if tpf and isinstance(tpf, dict):
                    tpf_keys = sorted(tpf.keys())
                    print(f"    TestParametersFlat keys ({len(tpf_keys)}): {tpf_keys[:20]}...")
                    # Show specific fields we care about
                    for field in ["MATERIAL", "STANDARD", "CUSTOMER", "TYPE_OF_TESTING_STR",
                                  "Date", "TESTER", "MACHINE_TYPE_STR", "SITE"]:
                        val = tpf.get(field)
                        if val is not None:
                            print(f"      {field}: {repr(val)[:100]}")

                # If it has metadata (values collection pattern), show it
                meta = doc.get("metadata")
                if meta and isinstance(meta, dict):
                    print(f"    metadata keys: {list(meta.keys())}")
                    for field in ["refId", "childId", "parentId"]:
                        val = meta.get(field)
                        if val is not None:
                            print(f"      {field}: {repr(val)[:150]}")

                # Show if doc has 'values' or 'data' array
                for arr_field in ["values", "data"]:
                    arr = doc.get(arr_field)
                    if arr and isinstance(arr, list):
                        print(f"    {arr_field}: list of {len(arr)} items, first item keys: {list(arr[0].keys()) if arr and isinstance(arr[0], dict) else type(arr[0])}")

    # 3. Deeper inspection: find the tests collection and values collection
    print("\n=== DEEPER INSPECTION ===")
    for db_name in db_names:
        if db_name in ("admin", "config", "local"):
            continue
        db = client[db_name]
        for col_name in db.list_collection_names():
            col = db[col_name]
            sample = col.find_one()
            if not sample:
                continue

            # Tests collection: has TestParametersFlat
            if "TestParametersFlat" in sample:
                print(f"\n  TESTS COLLECTION: {db_name}.{col_name}")
                # Check distinct MATERIAL values
                materials = col.distinct("TestParametersFlat.MATERIAL")
                print(f"    Distinct MATERIALs ({len(materials)}): {materials[:10]}")
                # Check distinct STANDARD values
                standards = col.distinct("TestParametersFlat.STANDARD")
                print(f"    Distinct STANDARDs ({len(standards)}): {standards[:10]}")
                # Check distinct TYPE_OF_TESTING_STR
                test_types = col.distinct("TestParametersFlat.TYPE_OF_TESTING_STR")
                print(f"    Distinct TYPE_OF_TESTING_STR ({len(test_types)}): {test_types[:10]}")
                # Check Date format
                for doc in col.find({"TestParametersFlat.Date": {"$exists": True}}).limit(3):
                    print(f"    Date sample: {doc['TestParametersFlat'].get('Date')}")

            # Values collection: has metadata.childId or metadata.refId
            if "metadata" in sample and isinstance(sample.get("metadata"), dict):
                meta = sample["metadata"]
                if "childId" in meta or "refId" in meta:
                    print(f"\n  VALUES COLLECTION: {db_name}.{col_name}")
                    # Sample childId patterns
                    for doc in col.find({"metadata.childId": {"$exists": True}}).limit(5):
                        child_id = doc["metadata"]["childId"]
                        ref_id = doc["metadata"].get("refId")
                        print(f"    childId: {child_id}")
                        print(f"    refId: {ref_id}")
                        # Show value shape
                        vals = doc.get("values")
                        if vals and isinstance(vals, list):
                            print(f"    values: {len(vals)} entries, first: {vals[0] if vals else 'empty'}")
                        break

    print("\n=== DONE ===")


if __name__ == "__main__":
    main()
