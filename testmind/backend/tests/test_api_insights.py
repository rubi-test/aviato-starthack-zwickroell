"""Integration tests for GET /api/insights."""

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_insights_returns_200(seeded_db):
    resp = client.get("/api/insights")
    assert resp.status_code == 200


def test_insights_include_analysis_window_and_explicit_action_wording(seeded_db):
    """Regression: proactive insight cards and click-through prompts must expose the time window."""
    resp = client.get("/api/insights")
    data = resp.json()

    assert "insights" in data
    assert isinstance(data["insights"], list)
    assert len(data["insights"]) > 0

    for insight in data["insights"]:
        assert "analysis_window_months" in insight
        assert isinstance(insight["analysis_window_months"], int)
        assert insight["analysis_window_months"] > 0
        assert "action" in insight
        assert "based on the last" in insight["action"].lower()


def test_trend_insights_use_18_month_window(seeded_db):
    resp = client.get("/api/insights")
    insights = resp.json().get("insights", [])
    trend_insights = [i for i in insights if i.get("type") == "trend"]

    # Dataset is seeded with known declining trends; if trend cards are present,
    # they must carry the same 18-month horizon used by the scanner.
    for insight in trend_insights:
        assert insight.get("analysis_window_months") == 18
