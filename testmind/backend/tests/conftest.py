"""Shared test fixtures for TestMind backend tests."""

import sys
import os
import pytest

# Ensure backend/ is on the path so all modules resolve correctly
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from mock_data.mock_mongo import MockCollection, MockDatabase, MockClient


def _make_test(
    material: str,
    test_type: str,
    date: str,
    machine: str = "Z05",
    site: str = "Ulm",
    tester: str = "Tester_1",
    customer: str = "Company_1",
    tensile_strength: float = None,
    tensile_modulus: float = None,
    elongation: float = None,
    impact_energy: float = None,
) -> dict:
    """Build a minimal test document matching the ZwickRoell schema."""
    flat = {
        "TYPE_OF_TESTING_STR": test_type,
        "MATERIAL": material,
        "Date": date,
        "MACHINE": machine,
        "SITE": site,
        "TESTER": tester,
        "CUSTOMER": customer,
        "MACHINE_TYPE_STR": "Static",
        "STANDARD": "DIN EN ISO 527",
        "JOB_NO": "JOB-001",
        "SPECIMEN_TYPE": "IPS",
        "SPECIMEN_THICKNESS": 0.002,
        "SPECIMEN_WIDTH": 0.015,
        "TEST_SPEED": 0.0000333,
    }
    if tensile_strength is not None:
        flat["tensile_strength_mpa"] = tensile_strength
    if tensile_modulus is not None:
        flat["tensile_modulus_mpa"] = tensile_modulus
    if elongation is not None:
        flat["elongation_at_break_pct"] = elongation
    if impact_energy is not None:
        flat["impact_energy_j"] = impact_energy
    return {
        "_id": f"{material}-{date}-{test_type}",
        "state": "finishedOK",
        "TestParametersFlat": flat,
    }


@pytest.fixture
def sample_tests() -> list[dict]:
    """A small set of varied test documents for unit tests."""
    return [
        _make_test("FancyPlast 42", "tensile", "01.01.2024", tensile_strength=47.0, tensile_modulus=2100.0, elongation=12.0),
        _make_test("FancyPlast 42", "tensile", "01.02.2024", tensile_strength=46.5, tensile_modulus=2050.0, elongation=11.5),
        _make_test("FancyPlast 42", "tensile", "01.03.2024", tensile_strength=46.0, tensile_modulus=2000.0, elongation=11.0),
        _make_test("UltraPlast 99", "tensile", "01.01.2024", machine="Z20", tensile_strength=44.0, tensile_modulus=1950.0),
        _make_test("UltraPlast 99", "tensile", "01.02.2024", machine="Z20", tensile_strength=43.5, tensile_modulus=1900.0),
        _make_test("UltraPlast 99", "tensile", "01.03.2024", machine="Z20", tensile_strength=43.0, tensile_modulus=1850.0),
        _make_test("Hostacomp G2", "tensile", "01.01.2024", tensile_strength=52.0),
        _make_test("Hostacomp G2", "tensile", "01.06.2024", tensile_strength=48.0),
        _make_test("Hostacomp G2", "tensile", "01.12.2024", tensile_strength=44.0),
        _make_test("Stardust", "charpy", "15.03.2024", tester="MasterOfDesaster", impact_energy=12.5),
        _make_test("Stardust", "charpy", "16.03.2024", tester="MasterOfDesaster", impact_energy=11.8),
        _make_test("Stardust", "compression", "10.04.2024", customer="Empire Industries"),
    ]


@pytest.fixture
def mock_collection(sample_tests) -> MockCollection:
    """A MockCollection pre-loaded with sample test documents."""
    col = MockCollection("Tests")
    col.insert_many(sample_tests)
    return col


@pytest.fixture
def mock_db(sample_tests) -> MockDatabase:
    """A MockDatabase with Tests collection pre-loaded."""
    db = MockDatabase("testmind_test")
    db["Tests"].insert_many(sample_tests)
    return db


# ─── Integration test fixtures ────────────────────────────────────────────────

@pytest.fixture(scope="session")
def seeded_db_instance():
    """Session-scoped fully-seeded MockDatabase (~300 tests). Created once per test run."""
    import random
    from mock_data.mock_mongo import MockClient
    from mock_data.seed import seed_database

    random.seed(42)
    client = MockClient()
    mock_db = client["testmind_integration"]
    seed_database(mock_db)
    return mock_db


@pytest.fixture
def seeded_db(seeded_db_instance):
    """Inject the seeded DB into the db module for one test, then restore."""
    import db as db_module

    old_db = db_module._db
    old_use_mock = db_module._use_mock

    db_module._db = seeded_db_instance
    db_module._use_mock = True

    yield seeded_db_instance

    db_module._db = old_db
    db_module._use_mock = old_use_mock
