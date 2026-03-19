"""Unit tests for mock_data/mock_mongo.py — the in-memory MongoDB substitute."""

import pytest
from mock_data.mock_mongo import (
    _match_value,
    _resolve_dotted,
    _matches,
    MockCollection,
    MockDatabase,
    MockClient,
)


# ─── _resolve_dotted ─────────────────────────────────────────────────────────

class TestResolveDotted:
    def test_simple_key(self):
        assert _resolve_dotted({"a": 1}, "a") == 1

    def test_nested_key(self):
        assert _resolve_dotted({"a": {"b": 42}}, "a.b") == 42

    def test_deeply_nested(self):
        doc = {"TestParametersFlat": {"MATERIAL": "FancyPlast 42"}}
        assert _resolve_dotted(doc, "TestParametersFlat.MATERIAL") == "FancyPlast 42"

    def test_missing_key_returns_none(self):
        assert _resolve_dotted({"a": 1}, "b") is None

    def test_missing_nested_key_returns_none(self):
        assert _resolve_dotted({"a": {}}, "a.b") is None

    def test_intermediate_non_dict_returns_none(self):
        assert _resolve_dotted({"a": 42}, "a.b") is None


# ─── _match_value ─────────────────────────────────────────────────────────────

class TestMatchValue:
    def test_equality(self):
        assert _match_value("tensile", "tensile")
        assert not _match_value("tensile", "compression")

    def test_eq_operator(self):
        assert _match_value({"$eq": 42}, 42)
        assert not _match_value({"$eq": 42}, 43)

    def test_ne_operator(self):
        assert _match_value({"$ne": 42}, 43)
        assert not _match_value({"$ne": 42}, 42)

    def test_gt_operator(self):
        assert _match_value({"$gt": 10}, 11)
        assert not _match_value({"$gt": 10}, 10)

    def test_gte_operator(self):
        assert _match_value({"$gte": 10}, 10)
        assert not _match_value({"$gte": 10}, 9)

    def test_lt_operator(self):
        assert _match_value({"$lt": 10}, 9)
        assert not _match_value({"$lt": 10}, 10)

    def test_lte_operator(self):
        assert _match_value({"$lte": 10}, 10)
        assert not _match_value({"$lte": 10}, 11)

    def test_in_operator(self):
        assert _match_value({"$in": ["a", "b"]}, "a")
        assert not _match_value({"$in": ["a", "b"]}, "c")

    def test_regex_operator(self):
        # Case-sensitive: match "Plast" (capital P) in "FancyPlast 42"
        assert _match_value({"$regex": "Plast"}, "FancyPlast 42")
        assert not _match_value({"$regex": "^xyz"}, "FancyPlast 42")

    def test_regex_case_insensitive(self):
        assert _match_value({"$regex": "fancyplast", "$options": "i"}, "FancyPlast 42")

    def test_exists_true(self):
        assert _match_value({"$exists": True}, "something")
        assert not _match_value({"$exists": True}, None)

    def test_exists_false(self):
        assert _match_value({"$exists": False}, None)
        assert not _match_value({"$exists": False}, "something")

    def test_gt_with_none_value(self):
        assert not _match_value({"$gt": 10}, None)


# ─── _matches ────────────────────────────────────────────────────────────────

class TestMatches:
    def test_empty_query_matches_all(self):
        assert _matches({"a": 1}, {})

    def test_simple_equality(self):
        doc = {"TestParametersFlat": {"MATERIAL": "FancyPlast 42"}}
        assert _matches(doc, {"TestParametersFlat.MATERIAL": "FancyPlast 42"})
        assert not _matches(doc, {"TestParametersFlat.MATERIAL": "UltraPlast 99"})

    def test_multiple_fields_all_must_match(self):
        doc = {"TestParametersFlat": {"MATERIAL": "X", "SITE": "Ulm"}}
        assert _matches(doc, {"TestParametersFlat.MATERIAL": "X", "TestParametersFlat.SITE": "Ulm"})
        assert not _matches(doc, {"TestParametersFlat.MATERIAL": "X", "TestParametersFlat.SITE": "Berlin"})

    def test_and_operator(self):
        doc = {"a": 1, "b": 2}
        assert _matches(doc, {"$and": [{"a": 1}, {"b": 2}]})
        assert not _matches(doc, {"$and": [{"a": 1}, {"b": 3}]})

    def test_or_operator(self):
        doc = {"a": 1}
        assert _matches(doc, {"$or": [{"a": 1}, {"a": 2}]})
        assert not _matches(doc, {"$or": [{"a": 2}, {"a": 3}]})


# ─── MockCollection ───────────────────────────────────────────────────────────

class TestMockCollection:
    @pytest.fixture
    def col(self) -> MockCollection:
        c = MockCollection("Tests")
        c.insert_many([
            {"_id": "1", "TestParametersFlat": {"MATERIAL": "A", "TYPE_OF_TESTING_STR": "tensile"}},
            {"_id": "2", "TestParametersFlat": {"MATERIAL": "B", "TYPE_OF_TESTING_STR": "tensile"}},
            {"_id": "3", "TestParametersFlat": {"MATERIAL": "A", "TYPE_OF_TESTING_STR": "charpy"}},
        ])
        return c

    def test_find_no_query_returns_all(self, col):
        results = list(col.find())
        assert len(results) == 3

    def test_find_with_exact_match(self, col):
        results = list(col.find({"TestParametersFlat.MATERIAL": "A"}))
        assert len(results) == 2

    def test_find_multiple_conditions(self, col):
        results = list(col.find({
            "TestParametersFlat.MATERIAL": "A",
            "TestParametersFlat.TYPE_OF_TESTING_STR": "tensile",
        }))
        assert len(results) == 1
        assert results[0]["_id"] == "1"

    def test_find_one_returns_first_match(self, col):
        doc = col.find_one({"TestParametersFlat.MATERIAL": "B"})
        assert doc is not None
        assert doc["_id"] == "2"

    def test_find_one_no_match_returns_none(self, col):
        assert col.find_one({"TestParametersFlat.MATERIAL": "Z"}) is None

    def test_count_documents(self, col):
        assert col.count_documents({"TestParametersFlat.MATERIAL": "A"}) == 2
        assert col.count_documents({}) == 3

    def test_insert_one_increases_count(self, col):
        col.insert_one({"_id": "4", "TestParametersFlat": {"MATERIAL": "C"}})
        assert col.count_documents({}) == 4

    def test_find_returns_deep_copies(self, col):
        """Mutations to returned docs must not affect stored docs."""
        results = list(col.find({"_id": "1"}))
        results[0]["_id"] = "mutated"
        original = col.find_one({"_id": "1"})
        assert original is not None

    def test_distinct(self, col):
        values = col.distinct("TestParametersFlat.MATERIAL")
        assert set(values) == {"A", "B"}

    def test_cursor_limit(self, col):
        results = list(col.find().limit(2))
        assert len(results) == 2

    def test_cursor_sort(self, col):
        results = list(col.find().sort("_id", 1))
        ids = [r["_id"] for r in results]
        assert ids == ["1", "2", "3"]

    def test_cursor_sort_descending(self, col):
        results = list(col.find().sort("_id", -1))
        ids = [r["_id"] for r in results]
        assert ids == ["3", "2", "1"]


# ─── MockDatabase & MockClient ────────────────────────────────────────────────

class TestMockDatabase:
    def test_get_collection_by_name(self):
        db = MockDatabase("test_db")
        col = db["Tests"]
        assert isinstance(col, MockCollection)
        assert col.name == "Tests"

    def test_same_name_returns_same_collection(self):
        db = MockDatabase("test_db")
        assert db["Tests"] is db["Tests"]

    def test_list_collection_names(self):
        db = MockDatabase("test_db")
        _ = db["Tests"]
        _ = db["ValueColumns"]
        names = db.list_collection_names()
        assert "Tests" in names
        assert "ValueColumns" in names


class TestMockClient:
    def test_get_db(self):
        client = MockClient()
        db = client["mydb"]
        assert isinstance(db, MockDatabase)

    def test_same_db_name_returns_same_object(self):
        client = MockClient()
        assert client["mydb"] is client["mydb"]
