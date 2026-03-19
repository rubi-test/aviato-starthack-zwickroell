"""Database connection — encapsulates all MongoDB access.

Usage:
    from db import get_db, get_collection

    db = get_db()
    tests = get_collection("Tests")
    results = list(tests.find({"TestParametersFlat.MATERIAL": "FancyPlast 42"}))

No other module should import pymongo or mock_mongo directly.
"""

import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "testmind_mock")

_db = None
_use_mock = None


def _init_db():
    """Initialize the database connection (real or mock). Auto-seeds mock on first use."""
    global _db, _use_mock

    if _db is not None:
        return

    # Try real MongoDB first
    try:
        from pymongo import MongoClient
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=2000)
        client.server_info()  # Force connection test
        _db = client[DB_NAME]
        _use_mock = False
        print(f"[db] Connected to MongoDB (database: {DB_NAME})")
    except Exception:
        # Fall back to in-memory mock
        from mock_data.mock_mongo import MockClient
        from mock_data.seed import seed_database

        client = MockClient()
        _db = client[DB_NAME]
        _use_mock = True
        seed_database(_db)
        print(f"[db] Using in-memory mock database (seeded)")


def get_db():
    """Return the database instance (real or mock)."""
    _init_db()
    return _db


def get_collection(name: str):
    """Return a collection by name."""
    return get_db()[name]


def is_mock() -> bool:
    """Check if we're using the mock database."""
    _init_db()
    return _use_mock
