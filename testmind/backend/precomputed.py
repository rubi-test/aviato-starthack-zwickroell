"""Precomputed responses — disabled for real database mode.

These were demo fallbacks for mock data materials (FancyPlast, Hostacomp, etc.)
that don't exist in the real database. All queries now go through the LLM + tools.
"""


def get_precomputed_response(query: str) -> dict | None:
    """Disabled — always returns None so queries go through the real LLM pipeline."""
    return None
