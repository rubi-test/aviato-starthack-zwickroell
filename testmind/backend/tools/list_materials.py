"""Tool: list_materials — List all distinct materials in the database."""

from data_access import get_distinct_values


def list_materials() -> dict:
    """Return all distinct material names tracked in the database."""
    materials = sorted([m for m in get_distinct_values("TestParametersFlat.MATERIAL") if m])

    return {
        "result": {
            "materials": materials,
            "count": len(materials),
        },
        "steps": [
            f"Queried distinct MATERIAL values from database",
            f"Found {len(materials)} materials (empty names excluded)",
        ],
    }
