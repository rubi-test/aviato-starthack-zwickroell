"""Precomputed responses for demo stability.

Provides fallback responses when the LLM is unavailable.
Uses keyword matching to find the best precomputed response.
"""


def get_precomputed_response(query: str) -> dict | None:
    """Try to match a query against precomputed demo responses."""
    q = query.lower().strip()

    for keywords, response_fn in _MATCHERS:
        if all(kw in q for kw in keywords):
            return response_fn()

    return None


def _megaplant_response() -> dict:
    from tools.filter_tests import filter_tests
    result = filter_tests(customer="Megaplant")
    return {
        "answer": (
            f"I found {result['result']['count']} tests for Megaplant across multiple materials. "
            f"Materials tested include: {', '.join(result['result']['summary']['by_material'].keys())}."
        ),
        "tool_used": "filter_tests",
        "tool_result": result["result"],
        "steps": result["steps"],
        "chart_type": "table",
        "chart_data": result["result"],
    }


def _compare_fp42_up99() -> dict:
    from tools.compare_groups import compare_groups
    result = compare_groups("material", "FancyPlast 42", "UltraPlast 99", "tensile_strength_mpa")
    r = result["result"]
    return {
        "answer": r.get("interpretation", "Comparison complete."),
        "tool_used": "compare_groups",
        "tool_result": r,
        "steps": result["steps"],
        "chart_type": "stat_cards",
        "chart_data": r,
    }


def _hostacomp_trend() -> dict:
    from tools.trend_analysis import trend_analysis
    result = trend_analysis("tensile_strength_mpa", material="Hostacomp G2", months_back=24)
    r = result["result"]
    return {
        "answer": r.get("interpretation", "Trend analysis complete."),
        "tool_used": "trend_analysis",
        "tool_result": r,
        "steps": result["steps"],
        "chart_type": "time_series",
        "chart_data": r,
    }


def _fp42_boundary() -> dict:
    from tools.boundary_forecast import boundary_forecast
    result = boundary_forecast("FancyPlast 42", "tensile_modulus_mpa", 10.0, months_history=36)
    r = result["result"]
    return {
        "answer": r.get("interpretation", "Boundary forecast complete."),
        "tool_used": "boundary_forecast",
        "tool_result": r,
        "steps": result["steps"],
        "chart_type": "forecast",
        "chart_data": r,
    }


def _charpy_master() -> dict:
    from tools.filter_tests import filter_tests
    result = filter_tests(test_type="charpy", tester="MasterOfDesaster")
    return {
        "answer": (
            f"Found {result['result']['count']} Charpy impact tests performed by MasterOfDesaster."
        ),
        "tool_used": "filter_tests",
        "tool_result": result["result"],
        "steps": result["steps"],
        "chart_type": "table",
        "chart_data": result["result"],
    }


def _summarize_material(material: str) -> dict:
    from tools.summarize_material import summarize_material_properties
    result = summarize_material_properties(material)
    r = result["result"]
    return {
        "answer": r.get("summary_text", "Summary complete."),
        "tool_used": "summarize_material_properties",
        "tool_result": r,
        "steps": result["steps"],
        "chart_type": "table",
        "chart_data": r,
    }


def _summarize_fp42() -> dict:
    return _summarize_material("FancyPlast 42")


def _summarize_ultraplast99() -> dict:
    return _summarize_material("UltraPlast 99")


def _summarize_hostacomp_g2() -> dict:
    return _summarize_material("Hostacomp G2")


def _summarize_stardust() -> dict:
    return _summarize_material("Stardust")


def _summarize_fancyplast84() -> dict:
    return _summarize_material("FancyPlast 84")


def _summarize_novatex10() -> dict:
    return _summarize_material("NovaTex 10")


def _compare_z05_z20() -> dict:
    from tools.compare_groups import compare_groups
    result = compare_groups("machine", "Z05", "Z20", "tensile_strength_mpa")
    r = result["result"]
    return {
        "answer": r.get("interpretation", "Comparison complete."),
        "tool_used": "compare_groups",
        "tool_result": r,
        "steps": result["steps"],
        "chart_type": "stat_cards",
        "chart_data": r,
    }


_MATCHERS = [
    (["megaplant"], _megaplant_response),
    (["fancyplast 42", "ultraplast 99", "tensile strength"], _compare_fp42_up99),
    (["fancyplast 42", "ultraplast 99"], _compare_fp42_up99),
    (["hostacomp", "degrad"], _hostacomp_trend),
    (["hostacomp", "trend"], _hostacomp_trend),
    (["hostacomp", "tensile strength"], _hostacomp_trend),
    (["fancyplast 42", "modulus", "10"], _fp42_boundary),
    (["fancyplast 42", "violate"], _fp42_boundary),
    (["fancyplast 42", "boundary"], _fp42_boundary),
    (["charpy", "masterofdesaster"], _charpy_master),
    (["charpy", "master"], _charpy_master),
    # Material summaries
    (["summarize", "fancyplast 42"], _summarize_fp42),
    (["properties", "fancyplast 42"], _summarize_fp42),
    (["summarize", "ultraplast 99"], _summarize_ultraplast99),
    (["properties", "ultraplast 99"], _summarize_ultraplast99),
    (["summarize", "hostacomp"], _summarize_hostacomp_g2),
    (["properties", "hostacomp"], _summarize_hostacomp_g2),
    (["summarize", "stardust"], _summarize_stardust),
    (["properties", "stardust"], _summarize_stardust),
    (["summarize", "fancyplast 84"], _summarize_fancyplast84),
    (["properties", "fancyplast 84"], _summarize_fancyplast84),
    (["summarize", "novatex"], _summarize_novatex10),
    (["summarize", "novatex 10"], _summarize_novatex10),
    (["properties", "novatex"], _summarize_novatex10),
    (["z05", "z20"], _compare_z05_z20),
]
