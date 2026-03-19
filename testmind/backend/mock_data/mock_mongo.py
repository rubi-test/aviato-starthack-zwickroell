"""In-memory MongoDB mock — implements enough of the pymongo API for TestMind.

Supports query operators: $eq, $gte, $lte, $gt, $lt, $in, $regex, $ne, $exists.
Supports find(), find_one(), insert_many(), insert_one(), count_documents().
"""

import re
import copy
from typing import Any


def _match_value(spec: Any, value: Any) -> bool:
    """Check if a single value matches a query spec."""
    if isinstance(spec, dict):
        for op, operand in spec.items():
            if op == "$eq" and value != operand:
                return False
            if op == "$ne" and value == operand:
                return False
            if op == "$gt" and not (value is not None and value > operand):
                return False
            if op == "$gte" and not (value is not None and value >= operand):
                return False
            if op == "$lt" and not (value is not None and value < operand):
                return False
            if op == "$lte" and not (value is not None and value <= operand):
                return False
            if op == "$in" and value not in operand:
                return False
            if op == "$regex":
                flags = spec.get("$options", "")
                re_flags = re.IGNORECASE if "i" in flags else 0
                if not re.search(operand, str(value), re_flags):
                    return False
            if op == "$exists":
                if operand and value is None:
                    return False
                if not operand and value is not None:
                    return False
        return True
    return value == spec


def _resolve_dotted(doc: dict, key: str) -> Any:
    """Resolve a dotted key like 'TestParametersFlat.MATERIAL' from a nested dict."""
    parts = key.split(".")
    current = doc
    for part in parts:
        if isinstance(current, dict):
            current = current.get(part)
        else:
            return None
    return current


def _matches(doc: dict, query: dict) -> bool:
    """Check if a document matches a MongoDB-style query."""
    for key, spec in query.items():
        if key == "$and":
            return all(_matches(doc, sub) for sub in spec)
        if key == "$or":
            return any(_matches(doc, sub) for sub in spec)
        value = _resolve_dotted(doc, key)
        if not _match_value(spec, value):
            return False
    return True


class MockCursor:
    """Mimics pymongo Cursor with sort, limit, skip."""

    def __init__(self, docs: list[dict]):
        self._docs = docs
        self._sort_key = None
        self._sort_dir = 1
        self._limit_n = 0
        self._skip_n = 0

    def sort(self, key_or_list, direction=1):
        if isinstance(key_or_list, list):
            key_or_list, direction = key_or_list[0]
        self._sort_key = key_or_list
        self._sort_dir = direction
        return self

    def limit(self, n: int):
        self._limit_n = n
        return self

    def skip(self, n: int):
        self._skip_n = n
        return self

    def _resolve(self) -> list[dict]:
        docs = list(self._docs)
        if self._sort_key:
            docs.sort(
                key=lambda d: _resolve_dotted(d, self._sort_key) or "",
                reverse=(self._sort_dir == -1),
            )
        if self._skip_n:
            docs = docs[self._skip_n:]
        if self._limit_n:
            docs = docs[: self._limit_n]
        return docs

    def __iter__(self):
        return iter(self._resolve())

    def __len__(self):
        return len(self._resolve())

    def to_list(self):
        return self._resolve()


class MockCollection:
    """In-memory collection with basic pymongo-compatible API."""

    def __init__(self, name: str):
        self.name = name
        self._docs: list[dict] = []

    def insert_many(self, docs: list[dict]):
        self._docs.extend(copy.deepcopy(docs))

    def insert_one(self, doc: dict):
        self._docs.append(copy.deepcopy(doc))

    def find(self, query: dict | None = None, projection: dict | None = None) -> MockCursor:
        query = query or {}
        matched = [copy.deepcopy(d) for d in self._docs if _matches(d, query)]
        if projection:
            matched = [_apply_projection(d, projection) for d in matched]
        return MockCursor(matched)

    def find_one(self, query: dict | None = None) -> dict | None:
        query = query or {}
        for d in self._docs:
            if _matches(d, query):
                return copy.deepcopy(d)
        return None

    def count_documents(self, query: dict | None = None) -> int:
        query = query or {}
        return sum(1 for d in self._docs if _matches(d, query))

    def distinct(self, field: str, query: dict | None = None) -> list:
        query = query or {}
        values = set()
        for d in self._docs:
            if _matches(d, query):
                v = _resolve_dotted(d, field)
                if v is not None:
                    values.add(v)
        return sorted(values)


def _apply_projection(doc: dict, projection: dict) -> dict:
    """Simple field projection (inclusion only)."""
    if not projection:
        return doc
    include_keys = {k for k, v in projection.items() if v}
    if not include_keys:
        return doc
    include_keys.add("_id")
    result = {}
    for key in include_keys:
        val = _resolve_dotted(doc, key)
        if val is not None:
            result[key] = val
    return result


class MockDatabase:
    """In-memory database holding named collections."""

    def __init__(self, name: str = "testmind_mock"):
        self.name = name
        self._collections: dict[str, MockCollection] = {}

    def __getitem__(self, name: str) -> MockCollection:
        if name not in self._collections:
            self._collections[name] = MockCollection(name)
        return self._collections[name]

    def list_collection_names(self) -> list[str]:
        return list(self._collections.keys())


class MockClient:
    """In-memory MongoDB client."""

    def __init__(self, uri: str = "mock://localhost"):
        self._dbs: dict[str, MockDatabase] = {}

    def __getitem__(self, name: str) -> MockDatabase:
        if name not in self._dbs:
            self._dbs[name] = MockDatabase(name)
        return self._dbs[name]
