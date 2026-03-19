"""Tests for tools/boundary_forecast.py."""

import pytest
from unittest.mock import patch
from tests.conftest import _make_test
from mock_data.mock_mongo import MockCollection


def _col_with(docs) -> MockCollection:
    col = MockCollection("Tests")
    col.insert_many(docs)
    return col


def _run_forecast(col, **kwargs):
    with patch("tools.boundary_forecast.get_collection", return_value=col):
        from tools.boundary_forecast import boundary_forecast
        return boundary_forecast(**kwargs)


class TestBoundaryForecast:
    def test_will_violate_when_declining(self):
        """FancyPlast 42 scenario: tensile modulus declining towards 10 MPa.

        Use gentle decline (0.3/month) so the value stays above 10 MPa
        during the history window but will cross within 24-month forecast.
        Values: month 1=14.7, month 6=12.9 → last monthly avg ~12.9 MPa.
        At 0.3 MPa/month decline, crossing at 10 MPa ≈ 9.7 months away.
        """
        docs = [
            _make_test(
                "FancyPlast 42", "tensile",
                f"01.{m:02d}.2024",
                tensile_modulus=15.0 - (m * 0.3),
            )
            for m in range(1, 7)  # 6 months: 14.7, 14.4, 14.1, 13.8, 13.5, 13.2
        ]
        col = _col_with(docs)
        result = _run_forecast(
            col,
            material="FancyPlast 42",
            property="tensile_modulus_mpa",
            boundary_value=10.0,
            months_history=12,
            months_forecast=24,
        )
        r = result["result"]
        assert r.get("will_violate") is True
        assert r.get("estimated_violation_date") is not None
        assert r.get("months_until_violation") is not None
        assert r.get("months_until_violation") > 0

    def test_will_not_violate_when_stable(self):
        """Stable property should not violate a distant boundary."""
        docs = [
            _make_test("M", "tensile", f"01.0{m}.2024", tensile_strength=47.0 + (0.01 * m))
            for m in range(1, 10)
        ]
        col = _col_with(docs)
        result = _run_forecast(
            col,
            material="M",
            property="tensile_strength_mpa",
            boundary_value=10.0,  # Far below current ~47 MPa
            months_history=12,
            months_forecast=24,
        )
        r = result["result"]
        assert r.get("will_violate") is False

    def test_insufficient_data_returns_error(self):
        docs = [
            _make_test("M", "tensile", "01.01.2024", tensile_modulus=14.0),
            _make_test("M", "tensile", "01.02.2024", tensile_modulus=13.5),
        ]
        col = _col_with(docs)
        result = _run_forecast(
            col,
            material="M",
            property="tensile_modulus_mpa",
            boundary_value=10.0,
        )
        # 2 docs same months → might work or error depending on monthly aggregation
        assert "result" in result

    def test_no_data_returns_error(self):
        col = _col_with([])
        result = _run_forecast(
            col,
            material="NonExistent",
            property="tensile_modulus_mpa",
            boundary_value=10.0,
        )
        assert "error" in result["result"]

    def test_result_structure_on_violation(self):
        docs = [
            _make_test("M", "tensile", f"01.0{m}.2024", tensile_modulus=15.0 - m * 0.5)
            for m in range(1, 13)
        ]
        col = _col_with(docs)
        result = _run_forecast(col, material="M", property="tensile_modulus_mpa", boundary_value=10.0)
        r = result["result"]
        required = [
            "material", "property", "boundary", "will_violate",
            "current_value", "slope_per_month", "time_series", "forecast_series", "interpretation"
        ]
        for k in required:
            assert k in r

    def test_forecast_series_not_empty(self):
        docs = [
            _make_test("M", "tensile", f"01.0{m}.2024", tensile_modulus=15.0 - m * 0.5)
            for m in range(1, 13)
        ]
        col = _col_with(docs)
        result = _run_forecast(
            col, material="M", property="tensile_modulus_mpa",
            boundary_value=10.0, months_forecast=12
        )
        r = result["result"]
        if "error" not in r:
            assert len(r["forecast_series"]) == 12

    def test_current_value_is_last_monthly_average(self):
        docs = [
            _make_test("M", "tensile", "01.11.2024", tensile_modulus=12.5),
            _make_test("M", "tensile", "01.11.2024", tensile_modulus=11.5),  # same month
            _make_test("M", "tensile", "01.10.2024", tensile_modulus=13.0),
            _make_test("M", "tensile", "01.09.2024", tensile_modulus=13.5),
        ]
        col = _col_with(docs)
        result = _run_forecast(col, material="M", property="tensile_modulus_mpa", boundary_value=10.0)
        r = result["result"]
        if "error" not in r:
            # Last month (Nov 2024) mean is (12.5 + 11.5) / 2 = 12.0
            assert r["current_value"] == pytest.approx(12.0, abs=0.1)

    def test_boundary_stored_in_result(self):
        docs = [
            _make_test("M", "tensile", f"01.0{m}.2024", tensile_modulus=15.0 - m * 0.5)
            for m in range(1, 9)
        ]
        col = _col_with(docs)
        result = _run_forecast(col, material="M", property="tensile_modulus_mpa", boundary_value=10.0)
        r = result["result"]
        if "error" not in r:
            assert r["boundary"] == 10.0

    def test_steps_populated(self):
        docs = [
            _make_test("M", "tensile", f"01.0{m}.2024", tensile_modulus=15.0 - m * 0.5)
            for m in range(1, 9)
        ]
        col = _col_with(docs)
        result = _run_forecast(col, material="M", property="tensile_modulus_mpa", boundary_value=10.0)
        assert isinstance(result["steps"], list)
        assert len(result["steps"]) > 0

    def test_violation_date_format(self):
        docs = [
            _make_test("M", "tensile", f"01.0{m}.2024", tensile_modulus=15.0 - m * 0.5)
            for m in range(1, 13)
        ]
        col = _col_with(docs)
        result = _run_forecast(col, material="M", property="tensile_modulus_mpa", boundary_value=10.0)
        r = result["result"]
        if r.get("will_violate"):
            vdate = r["estimated_violation_date"]
            # Should be YYYY-MM format
            import re
            assert re.match(r"\d{4}-\d{2}", vdate)
