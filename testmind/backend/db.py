"""Database connection — encapsulates all MongoDB access.

Usage:
    from db import get_db, get_collection, get_tests_collection, get_values_collection

    db = get_db()
    tests = get_tests_collection()
    values = get_values_collection()
    enriched = get_enriched_collection()

No other module should import pymongo or mock_mongo directly.
"""

import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "testmind_mock")
TESTS_COLLECTION = os.getenv("TESTS_COLLECTION", "Tests")
VALUES_COLLECTION = os.getenv("VALUES_COLLECTION", "Values")
ENRICHED_COLLECTION = os.getenv("ENRICHED_COLLECTION", "tests_enriched")
USE_MOCK = os.getenv("USE_MOCK", "true").lower() in ("true", "1", "yes")

_db = None
_use_mock = None


def _init_db():
    """Initialize the database connection (real or mock). Auto-seeds mock on first use."""
    global _db, _use_mock

    if _db is not None:
        return

    if USE_MOCK:
        # Explicit mock mode — always use in-memory mock
        from mock_data.mock_mongo import MockClient
        from mock_data.seed import seed_database

        client = MockClient()
        _db = client[DB_NAME]
        _use_mock = True
        seed_database(_db)
        print("[db] Using in-memory mock database (seeded)")
        return

    # Real mode — fail loudly if DB unreachable
    from pymongo import MongoClient
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    try:
        client.server_info()  # Force connection test
    except Exception as exc:
        raise ConnectionError(
            f"USE_MOCK=false but MongoDB at {MONGO_URI} is unreachable: {exc}"
        ) from exc
    _db = client[DB_NAME]
    _use_mock = False
    print(f"[db] Connected to MongoDB (database: {DB_NAME})")


def get_db():
    """Return the database instance (real or mock)."""
    _init_db()
    return _db


def get_collection(name: str):
    """Return a collection by name."""
    return get_db()[name]


def get_tests_collection():
    """Return the tests collection."""
    return get_collection(TESTS_COLLECTION)


def get_values_collection():
    """Return the values collection (contains measurement results linked by UUID)."""
    return get_collection(VALUES_COLLECTION)


def get_enriched_collection():
    """Return the enriched collection (tests pre-joined with computed results)."""
    return get_collection(ENRICHED_COLLECTION)


def is_mock() -> bool:
    """Check if we're using the mock database."""
    _init_db()
    return _use_mock
