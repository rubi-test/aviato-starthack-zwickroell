<!-- Generated: 2026-03-19 | Files scanned: 3 | Token estimate: ~500 -->

# Data Model Codemap

## Collections

### Tests (300 documents)

```
{
  _id: UUID string,
  clientAppType: "testXpert III",
  state: "finishedOK",
  modifiedOn: { $date: ISO timestamp },
  TestParametersFlat: {
    TYPE_OF_TESTING_STR: "tensile" | "compression" | "charpy",
    MATERIAL: string,        CUSTOMER: string,
    TESTER: string,          MACHINE: "Z05" | "Z20" | "Z100",
    SITE: "Ulm" | "Kennesaw", Date: "DD.MM.YYYY",
    STANDARD: string,        JOB_NO: string,
    // Computed results (type-dependent):
    tensile_strength_mpa: float,   tensile_modulus_mpa: float,
    elongation_at_break_pct: float, impact_energy_j: float,
    max_force_n: float,
  }
}
```

### ValueColumns (300 documents)

```
{
  _id: UUID,
  metadata: { refId: test._id, childId: string, length: 1000 },
  values: float[1000]   // raw measurement series
}
```

## Seeded Data Patterns

| # | Pattern | Data |
|---|---------|------|
| 1 | Hostacomp G2 tensile degradation | 52→44 MPa over 2024-2025 |
| 2 | FancyPlast 42 modulus decline | 15→10.7 MPa, violates 10 MPa ~2026-06 |
| 3 | Z05 vs Z20 machine bias | Z05 +1.5 MPa tensile strength |
| 4 | Ulm ≈ Kennesaw (no significant diff) | Same base values |
| 5 | Megaplant volume | 86 tests across all materials |
| 6 | MasterOfDesaster Charpy | 13 impact tests |
| 7 | Empire Industries compression | 8 Stardust tests ~May 2023 |

## Materials: FancyPlast 42, UltraPlast 99, Hostacomp G2, Stardust, FancyPlast 84, NovaTex 10
## Seed: random.seed(42) — fully reproducible
