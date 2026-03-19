"""Tests for tools/filter_tests.py."""

import pytest
from unittest.mock import patch
from tests.conftest import _make_test
from mock_data.mock_mongo import MockCollection


def _col_with(docs) -> MockCollection:
    col = MockCollection("Tests")
    col.insert_many(docs)
    return col


class TestFilterTests:
    @pytest.fixture
    def col(self, sample_tests):
        return _col_with(sample_tests)

    def _run(self, col, **kwargs):
        with patch("tools.filter_tests.get_collection", return_value=col):
            from tools.filter_tests import filter_tests
            return filter_tests(**kwargs)

    def test_filter_by_material(self, col):
        result = self._run(col, material="FancyPlast 42")
        assert result["result"]["count"] == 3
        assert all(t["material"] == "FancyPlast 42" for t in result["result"]["tests"])

    def test_filter_by_test_type(self, col):
        result = self._run(col, test_type="charpy")
        tests = result["result"]["tests"]
        assert all(t["test_type"] == "charpy" for t in tests)

    def test_filter_by_customer(self, col):
        result = self._run(col, customer="Empire Industries")
        assert result["result"]["count"] >= 1

    def test_filter_by_tester(self, col):
        result = self._run(col, tester="MasterOfDesaster")
        tests = result["result"]["tests"]
        assert len(tests) >= 2
        assert all(t["tester"] == "MasterOfDesaster" for t in tests)

    def test_filter_by_machine(self, col):
        result = self._run(col, machine="Z20")
        tests = result["result"]["tests"]
        assert all(t["machine"] == "Z20" for t in tests)

    def test_filter_by_site(self, col):
        result = self._run(col, site="Ulm")
        tests = result["result"]["tests"]
        assert all(t["site"] == "Ulm" for t in tests)

    def test_filter_by_date_range(self, col):
        result = self._run(col, date_from="01.01.2024", date_to="28.02.2024")
        dates = [t["date"] for t in result["result"]["tests"]]
        # All returned dates should be in Jan or Feb 2024
        for d in dates:
            assert d in ("01.01.2024", "01.02.2024", "15.03.2024"[:0])  # none in March

    def test_filter_combined_material_and_type(self, col):
        result = self._run(col, material="Stardust", test_type="charpy")
        tests = result["result"]["tests"]
        assert all(t["material"] == "Stardust" and t["test_type"] == "charpy" for t in tests)

    def test_limit_respected(self, col):
        result = self._run(col, limit=2)
        assert len(result["result"]["tests"]) <= 2

    def test_no_match_returns_empty(self, col):
        result = self._run(col, material="NonExistentMaterial")
        assert result["result"]["count"] == 0
        assert result["result"]["tests"] == []

    def test_summary_by_material(self, col):
        result = self._run(col, test_type="tensile")
        by_mat = result["result"]["summary"]["by_material"]
        assert "FancyPlast 42" in by_mat
        assert "UltraPlast 99" in by_mat

    def test_steps_contain_filter_description(self, col):
        result = self._run(col, material="FancyPlast 42")
        steps = result["steps"]
        assert any("FancyPlast 42" in s for s in steps)

    def test_test_to_summary_fields_present(self, col):
        result = self._run(col, material="FancyPlast 42")
        t = result["result"]["tests"][0]
        required_fields = ["id", "date", "customer", "material", "test_type", "machine", "site", "tester"]
        for f in required_fields:
            assert f in t

    def test_date_range_filters_correctly(self):
        docs = [
            _make_test("M", "tensile", "01.01.2024", tensile_strength=45.0),
            _make_test("M", "tensile", "01.06.2024", tensile_strength=46.0),
            _make_test("M", "tensile", "01.12.2024", tensile_strength=47.0),
        ]
        col = _col_with(docs)
        result = self._run(col, date_from="01.05.2024", date_to="30.11.2024")
        assert result["result"]["count"] == 1
        assert result["result"]["tests"][0]["date"] == "01.06.2024"
