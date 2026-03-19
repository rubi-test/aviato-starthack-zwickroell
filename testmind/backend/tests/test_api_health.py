"""Tests for GET / health endpoint."""

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_health_returns_200():
    resp = client.get("/")
    assert resp.status_code == 200


def test_health_response_shape():
    resp = client.get("/")
    data = resp.json()
    assert data["status"] == "ok"
    assert data["service"] == "testmind"
