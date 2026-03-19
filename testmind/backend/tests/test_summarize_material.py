"""Tests for tools/summarize_material.py."""

import pytest
from unittest.mock import patch
from tests.conftest import _make_test
from mock_data.mock_mongo import MockCollection


def _col_with(docs) -> MockCollection:
    col = MockCollection("Tests")
    col.insert_many(docs)
    return col


def _run_summarize(col, material: str):
    with patch("tools.summarize_material.get_collection", return_value=col):
        from tools.summarize_material import summarize_material_properties
        return summarize_material_properties(material)


class TestSummarizeMaterialProperties:
    @pytest.fixture
    def col(self, sample_tests):
        return _col_with(sample_tests)

    def test_returns_stats_for_known_material(self, col):
        result = _run_summarize(col, "FancyPlast 42")
        r = result["result"]
        assert r["material"] == "FancyPlast 42"
        props = {p["name"]: p for p in r["properties"]}
        assert "tensile_strength_mpa" in props
        ts = props["tensile_strength_mpa"]
        assert ts["n"] == 3
        assert ts["mean"] == pytest.approx(46.5, abs=0.2)

    def test_no_tests_returns_empty_properties(self, col):
        result = _run_summarize(col, "NonExistentMaterial")
        r = result["result"]
        assert r["material"] == "NonExistentMaterial"
        assert r["properties"] == []
        assert "No tests found" in r["summary_text"]

    def test_property_stats_structure(self, col):
        result = _run_summarize(col, "FancyPlast 42")
        for prop in result["result"]["properties"]:
            assert "name" in prop
            assert "unit" in prop
            assert "n" in prop
            assert "mean" in prop
            assert "std" in prop
            assert "min" in prop
            assert "max" in prop

    def test_min_less_than_or_equal_mean_less_than_max(self, col):
        result = _run_summarize(col, "FancyPlast 42")
        for prop in result["result"]["properties"]:
            assert prop["min"] <= prop["mean"] <= prop["max"]

    def test_skips_properties_with_no_values(self, col):
        """impact_energy_j has no values for FancyPlast 42 — should be omitted."""
        result = _run_summarize(col, "FancyPlast 42")
        prop_names = [p["name"] for p in result["result"]["properties"]]
        assert "impact_energy_j" not in prop_names

    def test_charpy_material_includes_impact_energy(self, col):
        """Stardust has charpy tests with impact_energy_j values."""
        result = _run_summarize(col, "Stardust")
        prop_names = [p["name"] for p in result["result"]["properties"]]
        assert "impact_energy_j" in prop_names

    def test_summary_text_mentions_material(self, col):
        result = _run_summarize(col, "FancyPlast 42")
        assert "FancyPlast 42" in result["result"]["summary_text"]

    def test_steps_populated(self, col):
        result = _run_summarize(col, "FancyPlast 42")
        assert isinstance(result["steps"], list)
        assert len(result["steps"]) == 3

    def test_single_test_std_is_zero(self):
        """With only one test, std should be 0."""
        docs = [_make_test("M", "tensile", "01.01.2024", tensile_strength=45.0)]
        col = _col_with(docs)
        result = _run_summarize(col, "M")
        props = {p["name"]: p for p in result["result"]["properties"]}
        assert props["tensile_strength_mpa"]["std"] == 0.0
        assert props["tensile_strength_mpa"]["min"] == props["tensile_strength_mpa"]["max"]

    def test_modulus_stats_correct(self, col):
        result = _run_summarize(col, "FancyPlast 42")
        props = {p["name"]: p for p in result["result"]["properties"]}
        assert "tensile_modulus_mpa" in props
        mod = props["tensile_modulus_mpa"]
        assert mod["min"] == pytest.approx(2000.0, abs=1.0)
        assert mod["max"] == pytest.approx(2100.0, abs=1.0)
