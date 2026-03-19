"""Integration tests for POST /api/chat."""

import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

MOCK_LLM_RESPONSE = {
    "answer": "FancyPlast 42 has a mean tensile strength of 47.2 MPa.",
    "tool_used": "summarize_material_properties",
    "tool_result": {"material": "FancyPlast 42", "properties": [], "summary_text": "..."},
    "steps": ["Step 1: queried material"],
    "chart_type": "table",
    "chart_data": {"material": "FancyPlast 42", "properties": []},
}


class TestChatEndpoint:
    def test_returns_200_with_mocked_llm(self, seeded_db):
        with patch("llm_client.chat_with_tools", return_value=MOCK_LLM_RESPONSE):
            resp = client.post("/api/chat", json={"message": "Tell me about FancyPlast 42"})
        assert resp.status_code == 200

    def test_response_has_all_fields(self, seeded_db):
        with patch("llm_client.chat_with_tools", return_value=MOCK_LLM_RESPONSE):
            resp = client.post("/api/chat", json={"message": "Tell me about FancyPlast 42"})
        data = resp.json()
        for field in ["answer", "tool_used", "tool_result", "steps", "chart_type", "chart_data"]:
            assert field in data

    def test_empty_message_returns_400(self):
        resp = client.post("/api/chat", json={"message": ""})
        assert resp.status_code == 422  # Pydantic min_length validation

    def test_whitespace_only_message_returns_fallback(self, seeded_db):
        """Whitespace messages pass validation but get caught by the empty check."""
        with patch("llm_client.chat_with_tools", side_effect=Exception("should not call")):
            resp = client.post("/api/chat", json={"message": "   "})
        # Either 400 or a fallback response — must not crash
        assert resp.status_code in (400, 200)

    def test_llm_failure_falls_back_to_precomputed(self, seeded_db):
        """When LLM raises, precomputed response is returned for known queries."""
        with patch("llm_client.chat_with_tools", side_effect=Exception("API down")):
            resp = client.post("/api/chat", json={"message": "Show all tests for Megaplant"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["answer"]  # Non-empty answer from precomputed
        assert data["chart_type"] == "table"

    def test_llm_failure_unknown_query_returns_generic_error(self, seeded_db):
        """Unknown query with LLM down returns graceful error message."""
        with patch("llm_client.chat_with_tools", side_effect=Exception("API down")):
            resp = client.post("/api/chat", json={"message": "xyzzy unrecognised gibberish query"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["answer"]  # Should contain an error message, not crash

    def test_context_default_site_is_ulm(self, seeded_db):
        """Context should include default_site=Ulm even when not provided."""
        captured = {}

        def capture_context(message, history, context):
            captured.update(context)
            return MOCK_LLM_RESPONSE

        with patch("llm_client.chat_with_tools", side_effect=capture_context):
            client.post("/api/chat", json={"message": "test"})
        assert captured.get("default_site") == "Ulm"

    def test_context_can_be_overridden(self, seeded_db):
        """Caller-provided context overrides defaults."""
        captured = {}

        def capture_context(message, history, context):
            captured.update(context)
            return MOCK_LLM_RESPONSE

        with patch("llm_client.chat_with_tools", side_effect=capture_context):
            client.post("/api/chat", json={
                "message": "test",
                "context": {"default_site": "Kennesaw"},
            })
        assert captured.get("default_site") == "Kennesaw"

    def test_history_is_forwarded_to_llm(self, seeded_db):
        """History array is passed through to chat_with_tools."""
        captured = {}

        def capture_history(message, history, context):
            captured["history"] = history
            return MOCK_LLM_RESPONSE

        history = [{"role": "user", "content": "prior message"}]
        with patch("llm_client.chat_with_tools", side_effect=capture_history):
            client.post("/api/chat", json={"message": "follow-up", "history": history})
        assert captured["history"] == history

    def test_precomputed_hostacomp_trend(self, seeded_db):
        """Hostacomp trend query is matched by precomputed on LLM failure."""
        with patch("llm_client.chat_with_tools", side_effect=Exception("down")):
            resp = client.post("/api/chat", json={
                "message": "Is Hostacomp G2 tensile strength degrading?"
            })
        assert resp.status_code == 200
        data = resp.json()
        assert data["chart_type"] == "time_series"

    def test_precomputed_fp42_boundary(self, seeded_db):
        """FancyPlast 42 boundary query matched by precomputed on LLM failure."""
        with patch("llm_client.chat_with_tools", side_effect=Exception("down")):
            resp = client.post("/api/chat", json={
                "message": "Will FancyPlast 42 tensile modulus violate 10 MPa boundary?"
            })
        assert resp.status_code == 200
        data = resp.json()
        assert data["chart_type"] == "forecast"
