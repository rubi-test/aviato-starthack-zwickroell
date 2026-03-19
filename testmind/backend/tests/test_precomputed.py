"""Tests for precomputed.py — keyword matching and response structure."""

import pytest
from precomputed import get_precomputed_response

REQUIRED_KEYS = ["answer", "tool_used", "tool_result", "steps", "chart_type", "chart_data"]


class TestKeywordMatching:
    def test_megaplant_match(self, seeded_db):
        r = get_precomputed_response("Show me all tests for Megaplant")
        assert r is not None
        assert r["chart_type"] == "table"

    def test_compare_fp42_up99_match(self, seeded_db):
        r = get_precomputed_response("Compare FancyPlast 42 and UltraPlast 99 tensile strength")
        assert r is not None
        assert r["chart_type"] == "stat_cards"

    def test_hostacomp_degrad_match(self, seeded_db):
        r = get_precomputed_response("Is Hostacomp G2 tensile strength degrading?")
        assert r is not None
        assert r["chart_type"] == "time_series"

    def test_hostacomp_trend_match(self, seeded_db):
        r = get_precomputed_response("Show Hostacomp G2 trend over time")
        assert r is not None
        assert r["chart_type"] == "time_series"

    def test_fp42_boundary_match(self, seeded_db):
        r = get_precomputed_response("Will FancyPlast 42 tensile modulus violate 10 MPa boundary?")
        assert r is not None
        assert r["chart_type"] == "forecast"

    def test_fp42_violate_match(self, seeded_db):
        r = get_precomputed_response("Will FancyPlast 42 violate the spec?")
        assert r is not None
        assert r["chart_type"] == "forecast"

    def test_charpy_master_match(self, seeded_db):
        r = get_precomputed_response("List Charpy tests by MasterOfDesaster")
        assert r is not None
        assert r["chart_type"] == "table"

    def test_z05_z20_match(self, seeded_db):
        r = get_precomputed_response("Compare Z05 and Z20 machine results")
        assert r is not None
        assert r["chart_type"] == "stat_cards"

    def test_summarize_fp42_match(self, seeded_db):
        r = get_precomputed_response("Summarize all properties for FancyPlast 42")
        assert r is not None
        assert r["chart_type"] == "table"

    def test_unknown_query_returns_none(self, seeded_db):
        r = get_precomputed_response("What is the meaning of life")
        assert r is None

    def test_empty_query_returns_none(self, seeded_db):
        r = get_precomputed_response("")
        assert r is None

    def test_case_insensitive_megaplant(self, seeded_db):
        r = get_precomputed_response("SHOW ALL TESTS FOR MEGAPLANT")
        assert r is not None

    def test_case_insensitive_hostacomp(self, seeded_db):
        r = get_precomputed_response("HOSTACOMP G2 DEGRAD")
        assert r is not None


class TestResponseStructure:
    def test_all_matchers_return_required_keys(self, seeded_db):
        queries = [
            "Show all tests for Megaplant",
            "Compare FancyPlast 42 and UltraPlast 99 tensile strength",
            "Is Hostacomp G2 tensile strength degrading?",
            "Will FancyPlast 42 tensile modulus violate 10 MPa boundary?",
            "List Charpy tests by MasterOfDesaster",
            "Compare Z05 and Z20 machine results",
            "Summarize all properties for FancyPlast 42",
        ]
        for q in queries:
            r = get_precomputed_response(q)
            assert r is not None, f"No match for: {q}"
            for key in REQUIRED_KEYS:
                assert key in r, f"Missing key '{key}' in response for: {q}"

    def test_megaplant_has_tests(self, seeded_db):
        r = get_precomputed_response("Show all tests for Megaplant")
        assert r["tool_result"]["count"] >= 20

    def test_charpy_master_all_charpy(self, seeded_db):
        r = get_precomputed_response("List Charpy tests by MasterOfDesaster")
        tests = r["tool_result"].get("tests", [])
        assert len(tests) >= 8
        assert all(t["test_type"] == "charpy" for t in tests)

    def test_fp42_boundary_will_violate(self, seeded_db):
        r = get_precomputed_response("Will FancyPlast 42 tensile modulus violate 10 MPa boundary?")
        assert r["tool_result"].get("will_violate") is True

    def test_hostacomp_trend_is_decreasing(self, seeded_db):
        r = get_precomputed_response("Is Hostacomp G2 tensile strength degrading?")
        assert r["tool_result"].get("trend_direction") == "decreasing"
