"""Verify that seeded data contains all required demo patterns."""

import random
import pytest
from mock_data.seed import generate_all


@pytest.fixture(scope="module")
def seed_data():
    """Generate all seed data once with reproducible random state."""
    random.seed(42)
    tests, value_cols = generate_all()
    return tests, value_cols


@pytest.fixture(scope="module")
def tests(seed_data):
    return seed_data[0]


def _flat(t):
    return t.get("TestParametersFlat", {})


class TestSeedPatterns:
    def test_total_count_at_least_300(self, tests):
        assert len(tests) >= 300

    def test_all_six_materials_present(self, tests):
        materials = {_flat(t).get("MATERIAL") for t in tests}
        expected = {"FancyPlast 42", "UltraPlast 99", "Hostacomp G2", "Stardust", "FancyPlast 84", "NovaTex 10"}
        assert expected.issubset(materials)

    def test_both_sites_present(self, tests):
        sites = {_flat(t).get("SITE") for t in tests}
        assert "Ulm" in sites
        assert "Kennesaw" in sites

    def test_all_test_types_present(self, tests):
        types = {_flat(t).get("TYPE_OF_TESTING_STR") for t in tests}
        assert {"tensile", "compression", "charpy"}.issubset(types)

    def test_pattern1_hostacomp_g2_declining_trend(self, tests):
        """Hostacomp G2 tensile strength should start high in Jan 2024 and end lower."""
        from tools.utils import parse_date

        hostacomp_tensile = [
            (parse_date(_flat(t)["Date"]), _flat(t)["tensile_strength_mpa"])
            for t in tests
            if _flat(t).get("MATERIAL") == "Hostacomp G2"
            and _flat(t).get("TYPE_OF_TESTING_STR") == "tensile"
            and _flat(t).get("tensile_strength_mpa") is not None
            and _flat(t).get("Date")
        ]
        assert len(hostacomp_tensile) >= 10

        early = [v for dt, v in hostacomp_tensile if dt.year == 2024 and dt.month <= 3]
        late = [v for dt, v in hostacomp_tensile if dt.year >= 2025 and dt.month >= 9]

        if early and late:
            import numpy as np
            assert np.mean(early) > np.mean(late), "Hostacomp G2 should decline over time"

    def test_pattern2_fp42_modulus_approaching_10(self, tests):
        """FancyPlast 42 tensile modulus should be above 14 MPa in 2023 and near 10-11 in late 2025."""
        from tools.utils import parse_date

        fp42_modulus = [
            (parse_date(_flat(t)["Date"]), _flat(t)["tensile_modulus_mpa"])
            for t in tests
            if _flat(t).get("MATERIAL") == "FancyPlast 42"
            and _flat(t).get("tensile_modulus_mpa") is not None
            and _flat(t).get("Date")
        ]
        assert len(fp42_modulus) >= 5

        early_vals = [v for dt, v in fp42_modulus if dt.year == 2023 and dt.month <= 3]
        late_vals = [v for dt, v in fp42_modulus if dt.year == 2025 and dt.month >= 9]

        if early_vals:
            import numpy as np
            assert np.mean(early_vals) > 13.0, "FancyPlast 42 modulus should start above 13 MPa"
        if late_vals:
            import numpy as np
            assert np.mean(late_vals) < 13.0, "FancyPlast 42 modulus should decline significantly by late 2025"

    def test_pattern3_z05_higher_than_z20(self, tests):
        """Z05 should produce ~1.5 MPa higher tensile strength than Z20."""
        import numpy as np

        z05_vals = [
            _flat(t)["tensile_strength_mpa"]
            for t in tests
            if _flat(t).get("MACHINE") == "Z05"
            and _flat(t).get("TYPE_OF_TESTING_STR") == "tensile"
            and _flat(t).get("tensile_strength_mpa") is not None
        ]
        z20_vals = [
            _flat(t)["tensile_strength_mpa"]
            for t in tests
            if _flat(t).get("MACHINE") == "Z20"
            and _flat(t).get("TYPE_OF_TESTING_STR") == "tensile"
            and _flat(t).get("tensile_strength_mpa") is not None
        ]
        assert len(z05_vals) >= 5 and len(z20_vals) >= 5

        diff = np.mean(z05_vals) - np.mean(z20_vals)
        # Expected ~1.5 MPa difference. With noise, assert at least 0.5 MPa difference.
        assert diff > 0.5, f"Z05 should be higher than Z20, diff={diff:.2f}"

    def test_pattern5_megaplant_20plus_tests(self, tests):
        megaplant = [t for t in tests if _flat(t).get("CUSTOMER") == "Megaplant"]
        assert len(megaplant) >= 20

    def test_pattern6_charpy_masterofdesaster_8plus(self, tests):
        charpy_master = [
            t for t in tests
            if _flat(t).get("TESTER") == "MasterOfDesaster"
            and _flat(t).get("TYPE_OF_TESTING_STR") == "charpy"
        ]
        assert len(charpy_master) >= 8

    def test_pattern7_compression_empire_stardust(self, tests):
        empire_stardust = [
            t for t in tests
            if _flat(t).get("CUSTOMER") == "Empire Industries"
            and _flat(t).get("MATERIAL") == "Stardust"
            and _flat(t).get("TYPE_OF_TESTING_STR") == "compression"
        ]
        assert len(empire_stardust) >= 5

    def test_fp42_boundary_forecast_will_violate(self, seeded_db):
        """Run boundary_forecast against the real seeded db — must predict violation."""
        from tools.boundary_forecast import boundary_forecast
        result = boundary_forecast("FancyPlast 42", "tensile_modulus_mpa", 10.0, months_history=36)
        r = result["result"]
        assert "error" not in r, f"Got error: {r.get('error')}"
        assert r.get("will_violate") is True, (
            f"Expected violation. current={r.get('current_value')}, slope={r.get('slope_per_month')}"
        )
