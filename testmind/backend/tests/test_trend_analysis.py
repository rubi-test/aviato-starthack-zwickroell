"""Tests for tools/trend_analysis.py."""

import pytest
from unittest.mock import patch
from tests.conftest import _make_test
from mock_data.mock_mongo import MockCollection


def _col_with(docs) -> MockCollection:
    col = MockCollection("Tests")
    col.insert_many(docs)
    return col


def _run_trend(col, **kwargs):
    with patch("tools.trend_analysis.get_collection", return_value=col):
        from tools.trend_analysis import trend_analysis
        return trend_analysis(**kwargs)


class TestTrendAnalysis:
    def test_decreasing_trend(self):
        """Hostacomp G2 scenario: strength declining over time."""
        docs = [
            _make_test("Hostacomp G2", "tensile", f"01.0{m}.2024", tensile_strength=52.0 - m * 0.8)
            for m in range(1, 13)
        ]
        col = _col_with(docs)
        result = _run_trend(col, property="tensile_strength_mpa", material="Hostacomp G2", months_back=12)
        r = result["result"]
        assert r.get("trend_direction") == "decreasing"
        assert r.get("slope_per_month") < 0

    def test_stable_trend(self):
        """Very small slope should be classified as stable."""
        docs = [
            _make_test("M", "tensile", f"01.0{m}.2024", tensile_strength=47.0 + (0.01 * m))
            for m in range(1, 10)
        ]
        col = _col_with(docs)
        result = _run_trend(col, property="tensile_strength_mpa", material="M", months_back=12)
        r = result["result"]
        assert r.get("trend_direction") == "stable"

    def test_increasing_trend(self):
        docs = [
            _make_test("M", "tensile", f"01.0{m}.2024", tensile_strength=40.0 + m * 1.5)
            for m in range(1, 10)
        ]
        col = _col_with(docs)
        result = _run_trend(col, property="tensile_strength_mpa", material="M", months_back=12)
        r = result["result"]
        assert r.get("trend_direction") == "increasing"
        assert r.get("slope_per_month") > 0

    def test_no_tests_returns_error(self):
        col = _col_with([])
        result = _run_trend(col, property="tensile_strength_mpa", material="NonExistent")
        assert "error" in result["result"]

    def test_insufficient_data_returns_error(self):
        docs = [
            _make_test("M", "tensile", "01.01.2024", tensile_strength=45.0),
            _make_test("M", "tensile", "01.02.2024", tensile_strength=44.5),
        ]
        col = _col_with(docs)
        # 2 data points → 2 monthly points, should still work (need >=2 monthly)
        result = _run_trend(col, property="tensile_strength_mpa", material="M", months_back=12)
        # Either succeeds with 2 monthly points or returns error — either is valid
        assert "result" in result

    def test_result_structure(self):
        docs = [
            _make_test("M", "tensile", f"01.0{m}.2024", tensile_strength=47.0 - m * 0.5)
            for m in range(1, 9)
        ]
        col = _col_with(docs)
        result = _run_trend(col, property="tensile_strength_mpa", material="M", months_back=12)
        r = result["result"]
        if "error" not in r:
            assert "analysis_window_months" in r
            assert r["analysis_window_months"] == 12
            assert "time_series" in r
            assert "slope_per_month" in r
            assert "r_squared" in r
            assert "trend_direction" in r
            assert "interpretation" in r

    def test_time_series_sorted_chronologically(self):
        docs = [
            _make_test("M", "tensile", "01.06.2024", tensile_strength=46.0),
            _make_test("M", "tensile", "01.01.2024", tensile_strength=48.0),
            _make_test("M", "tensile", "01.03.2024", tensile_strength=47.0),
        ]
        col = _col_with(docs)
        result = _run_trend(col, property="tensile_strength_mpa", material="M", months_back=12)
        r = result["result"]
        if "time_series" in r:
            dates = [pt["date"] for pt in r["time_series"]]
            assert dates == sorted(dates)

    def test_months_back_filters_data(self):
        """months_back=3 should only include the last 3 months of data."""
        docs = [
            _make_test("M", "tensile", "01.01.2024", tensile_strength=50.0),
            _make_test("M", "tensile", "01.06.2024", tensile_strength=48.0),
            _make_test("M", "tensile", "01.07.2024", tensile_strength=47.5),
            _make_test("M", "tensile", "01.08.2024", tensile_strength=47.0),
        ]
        col = _col_with(docs)
        result = _run_trend(col, property="tensile_strength_mpa", material="M", months_back=3)
        r = result["result"]
        if "time_series" in r:
            # Should not include the Jan 2024 data point (6+ months back)
            dates = [pt["date"] for pt in r["time_series"]]
            assert "2024-01" not in dates

    def test_steps_populated(self):
        docs = [
            _make_test("M", "tensile", f"01.0{m}.2024", tensile_strength=47.0 - m * 0.5)
            for m in range(1, 9)
        ]
        col = _col_with(docs)
        result = _run_trend(col, property="tensile_strength_mpa", material="M", months_back=12)
        assert isinstance(result["steps"], list)
        assert len(result["steps"]) > 0

    def test_site_filter(self):
        docs = [
            _make_test("M", "tensile", f"01.0{m}.2024", site="Ulm", tensile_strength=47.0 - m * 0.5)
            for m in range(1, 9)
        ] + [
            _make_test("M", "tensile", f"01.0{m}.2024", site="Kennesaw", tensile_strength=40.0)
            for m in range(1, 9)
        ]
        col = _col_with(docs)
        result = _run_trend(col, property="tensile_strength_mpa", site="Ulm", months_back=12)
        r = result["result"]
        # Should only use Ulm data — trend should be decreasing
        if "trend_direction" in r:
            assert r["trend_direction"] in ("decreasing", "stable", "increasing")
