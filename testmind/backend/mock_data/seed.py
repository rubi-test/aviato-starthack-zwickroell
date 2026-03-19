"""Generate and insert mock test data matching ZwickRoell testXpert III schema.

Run: python -m mock_data.seed
"""

import random
import uuid
from datetime import datetime, timedelta

random.seed(42)

MATERIALS = ["FancyPlast 42", "UltraPlast 99", "Hostacomp G2", "Stardust", "FancyPlast 84", "NovaTex 10"]
CUSTOMERS = ["Empire Industries", "Megaplant", "Company_1", "AlphaGroup"]
TESTERS = ["Tester_1", "Tester_2", "MasterOfDesaster"]
MACHINES = ["Z05", "Z20", "Z100"]
SITES = ["Ulm", "Kennesaw"]
TEST_TYPES = ["tensile", "compression", "charpy"]
STANDARDS = {
    "tensile": "DIN EN ISO 527",
    "compression": "DIN EN ISO 604",
    "charpy": "DIN EN ISO 179",
}

START_DATE = datetime(2023, 1, 1)
END_DATE = datetime(2025, 12, 31)
TOTAL_DAYS = (END_DATE - START_DATE).days


def _uid() -> str:
    return str(uuid.uuid4())


def _random_date() -> datetime:
    return START_DATE + timedelta(days=random.randint(0, TOTAL_DAYS))


def _date_str(dt: datetime) -> str:
    return dt.strftime("%d.%m.%Y")


def _time_str(dt: datetime) -> str:
    return dt.strftime("%H:%M:%S")


def _iso(dt: datetime) -> str:
    return dt.isoformat() + "Z"


def _tensile_strength(material: str, machine: str, dt: datetime) -> float:
    """Generate tensile strength with seeded patterns."""
    base = {
        "FancyPlast 42": 47.0,
        "UltraPlast 99": 44.5,
        "Hostacomp G2": 52.0,
        "Stardust": 38.0,
        "FancyPlast 84": 50.0,
        "NovaTex 10": 41.0,
    }[material]

    # Pattern 1: Hostacomp G2 declining trend over 2024-2025 (52 -> 44 MPa)
    if material == "Hostacomp G2" and dt.year >= 2024:
        months_since_2024 = (dt.year - 2024) * 12 + dt.month - 1
        base = 52.0 - (months_since_2024 * 0.35)

    # Pattern 3: Z05 produces ~1.5 MPa higher than Z20
    if machine == "Z05":
        base += 0.75
    elif machine == "Z20":
        base -= 0.75

    return round(base + random.gauss(0, 1.5), 1)


def _tensile_modulus(material: str, dt: datetime) -> float:
    """Generate tensile modulus with seeded patterns."""
    base = {
        "FancyPlast 42": 15.0,
        "UltraPlast 99": 2100.0,
        "Hostacomp G2": 2400.0,
        "Stardust": 1800.0,
        "FancyPlast 84": 2200.0,
        "NovaTex 10": 1900.0,
    }[material]

    # Pattern 2: FancyPlast 42 declining modulus approaching 10 MPa
    if material == "FancyPlast 42":
        months_since_start = (dt.year - 2023) * 12 + dt.month - 1
        base = 15.0 - (months_since_start * 0.12)
        return round(base + random.gauss(0, 0.3), 1)

    return round(base + random.gauss(0, base * 0.03), 1)


def _elongation(material: str) -> float:
    base = {"FancyPlast 42": 12.0, "UltraPlast 99": 8.5, "Hostacomp G2": 6.0,
            "Stardust": 15.0, "FancyPlast 84": 10.0, "NovaTex 10": 9.0}[material]
    return round(base + random.gauss(0, 1.0), 1)


def _max_force(material: str) -> float:
    base = {"FancyPlast 42": 850.0, "UltraPlast 99": 780.0, "Hostacomp G2": 920.0,
            "Stardust": 650.0, "FancyPlast 84": 890.0, "NovaTex 10": 710.0}[material]
    return round(base + random.gauss(0, 30.0), 1)


def _impact_energy() -> float:
    return round(random.uniform(3.0, 25.0), 1)


def _make_test(
    test_type: str, material: str, customer: str, tester: str,
    machine: str, site: str, dt: datetime,
) -> tuple[dict, dict]:
    """Create a (test_doc, value_column_doc) pair."""
    test_id = _uid()
    value_table_id = _uid()
    value_col_key = f"{value_table_id}-Zwick.Unittable.Stress_Key"

    params = {
        "TYPE_OF_TESTING_STR": test_type,
        "MACHINE_TYPE_STR": "Static" if test_type != "charpy" else "Pendulum",
        "STANDARD": STANDARDS[test_type],
        "TESTER": tester,
        "Date": _date_str(dt),
        "Clock time": _time_str(dt),
        "CUSTOMER": customer,
        "MATERIAL": material,
        "JOB_NO": f"JOB-{random.randint(1000, 9999)}",
        "SPECIMEN_TYPE": "IPS",
        "MACHINE": machine,
        "SITE": site,
        "SPECIMEN_THICKNESS": 0.002,
        "SPECIMEN_WIDTH": 0.015,
        "TEST_SPEED": 0.0000333,
        "max_force_n": _max_force(material),
    }

    if test_type == "tensile":
        params["tensile_strength_mpa"] = _tensile_strength(material, machine, dt)
        params["tensile_modulus_mpa"] = _tensile_modulus(material, dt)
        params["elongation_at_break_pct"] = _elongation(material)
    elif test_type == "compression":
        params["tensile_strength_mpa"] = round(random.uniform(30, 60), 1)
        params["tensile_modulus_mpa"] = round(random.uniform(1500, 3000), 1)
    elif test_type == "charpy":
        params["impact_energy_j"] = _impact_energy()

    col_name = {
        "tensile": "Tensile Strength",
        "compression": "Compressive Strength",
        "charpy": "Impact Energy",
    }[test_type]

    test_doc = {
        "_id": test_id,
        "clientAppType": "testXpert III",
        "state": "finishedOK",
        "tags": [_uid()],
        "version": "2.1772195387.0",
        "valueColumns": [{
            "unitTableId": "Zwick.Unittable.Stress",
            "valueTableId": f"{value_table_id}-Zwick.Unittable.Stress",
            "_id": value_col_key,
            "name": col_name,
        }],
        "hasMachineConfigurationInfo": False,
        "testProgramId": "TestProgram_1",
        "testProgramVersion": "2.1772195387.0",
        "name": f"{random.randint(1, 99):02d}",
        "modifiedOn": {"$date": _iso(dt)},
        "TestParametersFlat": params,
    }

    # Value column: measurement series (1000 floats)
    values = [round(random.gauss(params.get("tensile_strength_mpa", 40), 5), 2)
              for _ in range(1000)]

    value_doc = {
        "_id": _uid(),
        "timestamp": {"$date": _iso(dt)},
        "metadata": {
            "refId": test_id,
            "childId": f"{value_table_id}-Zwick.Unittable.Stress",
            "fileId": _uid(),
            "filename": f"test_{test_id[:8]}.dat",
            "length": 1000,
        },
        "uploadDate": {"$date": _iso(dt)},
        "values": values,
    }

    return test_doc, value_doc


def generate_all() -> tuple[list[dict], list[dict]]:
    """Generate all test and value column documents."""
    tests = []
    value_cols = []

    def add(test_type, material, customer, tester, machine, site, dt):
        t, v = _make_test(test_type, material, customer, tester, machine, site, dt)
        tests.append(t)
        value_cols.append(v)

    # --- Pattern 5: 20+ tests for Megaplant across materials ---
    for _ in range(25):
        add("tensile", random.choice(MATERIALS), "Megaplant",
            random.choice(TESTERS), random.choice(MACHINES),
            random.choice(SITES), _random_date())

    # --- Pattern 6: 8+ Charpy tests by MasterOfDesaster ---
    for _ in range(10):
        add("charpy", random.choice(MATERIALS), random.choice(CUSTOMERS),
            "MasterOfDesaster", random.choice(MACHINES),
            random.choice(SITES), _random_date())

    # --- Pattern 7: Compression tests for Empire Industries / Stardust ---
    for _ in range(8):
        dt = datetime(2023, 5, 4) + timedelta(days=random.randint(0, 30))
        add("compression", "Stardust", "Empire Industries",
            random.choice(TESTERS), random.choice(MACHINES),
            random.choice(SITES), dt)

    # --- Pattern 1: Hostacomp G2 monthly tensile tests across 2024-2025 ---
    for month in range(1, 25):  # 24 months
        year = 2024 + (month - 1) // 12
        m = ((month - 1) % 12) + 1
        for _ in range(random.randint(3, 5)):
            dt = datetime(year, m, random.randint(1, 28))
            add("tensile", "Hostacomp G2", random.choice(CUSTOMERS),
                random.choice(TESTERS), random.choice(MACHINES),
                random.choice(SITES), dt)

    # --- Pattern 2: FancyPlast 42 monthly tensile tests across 2023-2025 ---
    for month in range(1, 37):  # 36 months
        year = 2023 + (month - 1) // 12
        m = ((month - 1) % 12) + 1
        for _ in range(random.randint(1, 3)):
            dt = datetime(year, m, random.randint(1, 28))
            add("tensile", "FancyPlast 42", random.choice(CUSTOMERS),
                random.choice(TESTERS), random.choice(["Z05", "Z20", "Z100"]),
                random.choice(SITES), dt)

    # --- Pattern 3: Z05 vs Z20 explicit tests ---
    for machine in ["Z05", "Z20"]:
        for _ in range(15):
            add("tensile", random.choice(["FancyPlast 42", "UltraPlast 99"]),
                random.choice(CUSTOMERS), random.choice(TESTERS),
                machine, random.choice(SITES), _random_date())

    # --- Pattern 4: Ulm and Kennesaw similar results ---
    for site in ["Ulm", "Kennesaw"]:
        for _ in range(15):
            add("tensile", "UltraPlast 99", random.choice(CUSTOMERS),
                random.choice(TESTERS), random.choice(MACHINES),
                site, _random_date())

    # --- Fill remaining with mixed data to reach ~300 ---
    while len(tests) < 300:
        add(
            random.choice(TEST_TYPES),
            random.choice(MATERIALS),
            random.choice(CUSTOMERS),
            random.choice(TESTERS),
            random.choice(MACHINES),
            random.choice(SITES),
            _random_date(),
        )

    return tests, value_cols


def seed_database(db):
    """Insert generated data into the given database."""
    tests, value_cols = generate_all()
    db["Tests"].insert_many(tests)
    db["ValueColumns"].insert_many(value_cols)
    print(f"Seeded {len(tests)} tests, {len(value_cols)} value columns")
    return len(tests), len(value_cols)


if __name__ == "__main__":
    from mock_data.mock_mongo import MockClient
    client = MockClient()
    db = client["testmind_mock"]
    seed_database(db)
