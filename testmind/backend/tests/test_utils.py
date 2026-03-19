"""Unit tests for tools/utils.py — pure functions, no I/O."""

import pytest
from datetime import datetime
from tools.utils import (
    parse_date,
    format_date,
    filter_by_date_range,
    extract_property_values,
    infer_test_type_filter,
    test_to_summary as to_summary,  # alias avoids pytest collecting as a test function
)


# ─── parse_date ──────────────────────────────────────────────────────────────

class TestParseDate:
    def test_valid_date(self):
        dt = parse_date("15.03.2024")
        assert dt == datetime(2024, 3, 15)

    def test_start_of_year(self):
        dt = parse_date("01.01.2023")
        assert dt == datetime(2023, 1, 1)

    def test_end_of_year(self):
        dt = parse_date("31.12.2025")
        assert dt == datetime(2025, 12, 31)

    def test_invalid_format_raises(self):
        with pytest.raises(ValueError):
            parse_date("2024-03-15")

    def test_empty_string_raises(self):
        with pytest.raises(ValueError):
            parse_date("")


# ─── format_date ─────────────────────────────────────────────────────────────

class TestFormatDate:
    def test_roundtrip(self):
        original = "15.03.2024"
        assert format_date(parse_date(original)) == original

    def test_zero_padded_day_and_month(self):
        dt = datetime(2024, 1, 5)
        assert format_date(dt) == "05.01.2024"


# ─── filter_by_date_range ────────────────────────────────────────────────────

def _make_dated(date_str: str) -> dict:
    return {"TestParametersFlat": {"Date": date_str}}


class TestFilterByDateRange:
    def test_no_filter_returns_all(self):
        docs = [_make_dated("01.01.2024"), _make_dated("15.06.2024")]
        assert filter_by_date_range(docs) == docs

    def test_date_from_excludes_earlier(self):
        docs = [_make_dated("01.01.2024"), _make_dated("01.07.2024"), _make_dated("31.12.2024")]
        result = filter_by_date_range(docs, date_from="01.06.2024")
        assert len(result) == 2
        assert _make_dated("01.01.2024") not in result

    def test_date_to_excludes_later(self):
        docs = [_make_dated("01.01.2024"), _make_dated("01.07.2024"), _make_dated("31.12.2024")]
        # date_to="30.06.2024" → only 01.01.2024 qualifies (01.07 and 31.12 are after)
        result = filter_by_date_range(docs, date_to="30.06.2024")
        assert len(result) == 1
        assert result[0]["TestParametersFlat"]["Date"] == "01.01.2024"

    def test_date_range_inclusive_both_ends(self):
        docs = [
            _make_dated("01.01.2024"),
            _make_dated("15.06.2024"),
            _make_dated("31.12.2024"),
        ]
        result = filter_by_date_range(docs, date_from="01.01.2024", date_to="31.12.2024")
        assert len(result) == 3

    def test_narrow_range_single_result(self):
        docs = [_make_dated("01.01.2024"), _make_dated("15.06.2024"), _make_dated("31.12.2024")]
        result = filter_by_date_range(docs, date_from="01.06.2024", date_to="30.06.2024")
        assert len(result) == 1
        assert result[0]["TestParametersFlat"]["Date"] == "15.06.2024"

    def test_missing_date_field_is_excluded(self):
        docs = [{"TestParametersFlat": {}}, _make_dated("01.01.2024")]
        result = filter_by_date_range(docs, date_from="01.01.2024")
        assert len(result) == 1

    def test_malformed_date_is_excluded(self):
        docs = [{"TestParametersFlat": {"Date": "not-a-date"}}, _make_dated("01.01.2024")]
        result = filter_by_date_range(docs, date_from="01.01.2024")
        assert len(result) == 1

    def test_empty_list(self):
        assert filter_by_date_range([], date_from="01.01.2024") == []


# ─── extract_property_values ─────────────────────────────────────────────────

def _test_with_props(**props) -> dict:
    return {"TestParametersFlat": props}


class TestExtractPropertyValues:
    def test_extracts_floats(self):
        docs = [_test_with_props(tensile_strength_mpa=45.2), _test_with_props(tensile_strength_mpa=47.0)]
        result = extract_property_values(docs, "tensile_strength_mpa")
        assert result == [45.2, 47.0]

    def test_skips_missing_property(self):
        docs = [_test_with_props(tensile_strength_mpa=45.2), _test_with_props(other=1.0)]
        result = extract_property_values(docs, "tensile_strength_mpa")
        assert result == [45.2]

    def test_skips_none_values(self):
        docs = [_test_with_props(tensile_strength_mpa=None), _test_with_props(tensile_strength_mpa=45.0)]
        result = extract_property_values(docs, "tensile_strength_mpa")
        assert result == [45.0]

    def test_coerces_int_to_float(self):
        docs = [_test_with_props(tensile_strength_mpa=45)]
        result = extract_property_values(docs, "tensile_strength_mpa")
        assert result == [45.0]
        assert all(isinstance(v, float) for v in result)

    def test_skips_non_numeric_string(self):
        docs = [_test_with_props(tensile_strength_mpa="not-a-number")]
        result = extract_property_values(docs, "tensile_strength_mpa")
        assert result == []

    def test_empty_list(self):
        assert extract_property_values([], "tensile_strength_mpa") == []


# ─── infer_test_type_filter ───────────────────────────────────────────────────

class TestInferTestTypeFilter:
    def test_tensile_property(self):
        f = infer_test_type_filter("tensile_strength_mpa")
        assert f == {"TestParametersFlat.TYPE_OF_TESTING_STR": "tensile"}

    def test_tensile_modulus(self):
        f = infer_test_type_filter("tensile_modulus_mpa")
        assert f == {"TestParametersFlat.TYPE_OF_TESTING_STR": "tensile"}

    def test_impact_energy_charpy(self):
        f = infer_test_type_filter("impact_energy_j")
        assert f == {"TestParametersFlat.TYPE_OF_TESTING_STR": "charpy"}

    def test_unknown_property_returns_empty(self):
        f = infer_test_type_filter("max_force_n")
        assert f == {}


# ─── test_to_summary ─────────────────────────────────────────────────────────

class TestTestToSummary:
    def test_full_document(self):
        doc = {
            "_id": "abc-123",
            "TestParametersFlat": {
                "Date": "01.03.2024",
                "CUSTOMER": "Empire Industries",
                "MATERIAL": "FancyPlast 42",
                "TYPE_OF_TESTING_STR": "tensile",
                "MACHINE": "Z05",
                "SITE": "Ulm",
                "TESTER": "Tester_1",
                "tensile_strength_mpa": 47.2,
                "tensile_modulus_mpa": 2100.0,
                "elongation_at_break_pct": 12.4,
                "impact_energy_j": None,
                "max_force_n": 1000.0,
            },
        }
        summary = to_summary(doc)
        assert summary["id"] == "abc-123"
        assert summary["material"] == "FancyPlast 42"
        assert summary["tensile_strength_mpa"] == 47.2
        assert summary["test_type"] == "tensile"

    def test_missing_flat_fields_return_empty_or_none(self):
        doc = {"_id": "x", "TestParametersFlat": {}}
        summary = to_summary(doc)
        assert summary["material"] == ""
        assert summary["tensile_strength_mpa"] is None

    def test_missing_test_parameters_flat(self):
        doc = {"_id": "y"}
        summary = to_summary(doc)
        assert summary["id"] == "y"
        assert summary["date"] == ""
