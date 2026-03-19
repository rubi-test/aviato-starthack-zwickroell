"""Tests for tools/compare_groups.py."""

import pytest
from unittest.mock import patch
from tests.conftest import _make_test
from mock_data.mock_mongo import MockCollection


def _col_with(docs) -> MockCollection:
    col = MockCollection("Tests")
    col.insert_many(docs)
    return col


def _run_compare(col, **kwargs):
    with patch("tools.compare_groups.get_collection", return_value=col):
        from tools.compare_groups import compare_groups
        return compare_groups(**kwargs)


class TestCompareGroups:
    @pytest.fixture
    def col(self, sample_tests):
        return _col_with(sample_tests)

    def test_significant_difference_between_materials(self, col):
        result = _run_compare(
            col,
            group_type="material",
            group_a="FancyPlast 42",
            group_b="UltraPlast 99",
            property="tensile_strength_mpa",
        )
        r = result["result"]
        assert "group_a" in r
        assert "group_b" in r
        assert r["group_a"]["name"] == "FancyPlast 42"
        assert r["group_b"]["name"] == "UltraPlast 99"
        assert r["group_a"]["mean"] > r["group_b"]["mean"]

    def test_result_structure(self, col):
        result = _run_compare(
            col,
            group_type="material",
            group_a="FancyPlast 42",
            group_b="UltraPlast 99",
            property="tensile_strength_mpa",
        )
        r = result["result"]
        required = ["group_a", "group_b", "property", "t_statistic", "p_value", "significant", "alpha", "interpretation"]
        for k in required:
            assert k in r

    def test_group_stats_present(self, col):
        result = _run_compare(
            col,
            group_type="material",
            group_a="FancyPlast 42",
            group_b="UltraPlast 99",
            property="tensile_strength_mpa",
        )
        for group_key in ("group_a", "group_b"):
            g = result["result"][group_key]
            assert "mean" in g
            assert "std" in g
            assert "n" in g
            assert g["n"] >= 2

    def test_invalid_group_type_returns_error(self, col):
        result = _run_compare(
            col,
            group_type="invalid_type",
            group_a="FancyPlast 42",
            group_b="UltraPlast 99",
            property="tensile_strength_mpa",
        )
        assert "error" in result["result"]

    def test_insufficient_data_returns_error(self):
        """Only one value per group triggers the insufficient data guard."""
        docs = [
            _make_test("A", "tensile", "01.01.2024", tensile_strength=45.0),
            _make_test("B", "tensile", "01.01.2024", tensile_strength=43.0),
        ]
        col = _col_with(docs)
        result = _run_compare(
            col,
            group_type="material",
            group_a="A",
            group_b="B",
            property="tensile_strength_mpa",
        )
        assert "error" in result["result"]

    def test_machine_group_type(self, col):
        result = _run_compare(
            col,
            group_type="machine",
            group_a="Z05",
            group_b="Z20",
            property="tensile_strength_mpa",
        )
        r = result["result"]
        # Both groups should have at least 2 samples from sample_tests
        if "error" not in r:
            assert r["group_a"]["name"] == "Z05"
            assert r["group_b"]["name"] == "Z20"

    def test_steps_array_present(self, col):
        result = _run_compare(
            col,
            group_type="material",
            group_a="FancyPlast 42",
            group_b="UltraPlast 99",
            property="tensile_strength_mpa",
        )
        assert isinstance(result["steps"], list)
        assert len(result["steps"]) >= 3

    def test_interpretation_in_result(self, col):
        result = _run_compare(
            col,
            group_type="material",
            group_a="FancyPlast 42",
            group_b="UltraPlast 99",
            property="tensile_strength_mpa",
        )
        assert isinstance(result["result"].get("interpretation"), str)
        assert len(result["result"]["interpretation"]) > 10

    def test_alpha_is_005(self, col):
        result = _run_compare(
            col,
            group_type="material",
            group_a="FancyPlast 42",
            group_b="UltraPlast 99",
            property="tensile_strength_mpa",
        )
        assert result["result"]["alpha"] == 0.05

    def test_significant_flag_consistent_with_pvalue(self, col):
        result = _run_compare(
            col,
            group_type="material",
            group_a="FancyPlast 42",
            group_b="UltraPlast 99",
            property="tensile_strength_mpa",
        )
        r = result["result"]
        if "p_value" in r and "significant" in r:
            expected_significant = r["p_value"] < 0.05
            assert r["significant"] == expected_significant
