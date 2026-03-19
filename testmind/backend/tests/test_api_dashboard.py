"""Integration tests for GET /api/dashboard."""

import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


class TestDashboard:
    def test_returns_200(self, seeded_db):
        resp = client.get("/api/dashboard")
        assert resp.status_code == 200

    def test_response_has_all_keys(self, seeded_db):
        resp = client.get("/api/dashboard")
        data = resp.json()
        required = [
            "tests_last_7_days",
            "anomalies_flagged",
            "materials_in_db",
            "boundary_risks",
            "recent_tests",
            "anomalies",
            "boundary_risks_detail",
        ]
        for key in required:
            assert key in data, f"Missing key: {key}"

    def test_materials_count_is_six(self, seeded_db):
        resp = client.get("/api/dashboard")
        data = resp.json()
        assert data["materials_in_db"] == 6

    def test_recent_tests_at_most_eight(self, seeded_db):
        resp = client.get("/api/dashboard")
        data = resp.json()
        assert len(data["recent_tests"]) <= 8

    def test_recent_tests_have_required_fields(self, seeded_db):
        resp = client.get("/api/dashboard")
        data = resp.json()
        for t in data["recent_tests"]:
            for field in ["date", "material", "test_type", "machine", "site", "tester"]:
                assert field in t

    def test_anomalies_structure(self, seeded_db):
        resp = client.get("/api/dashboard")
        data = resp.json()
        for a in data["anomalies"]:
            assert "material" in a
            assert "issue" in a
            assert "severity" in a

    def test_boundary_risks_detail_structure(self, seeded_db):
        resp = client.get("/api/dashboard")
        data = resp.json()
        for r in data["boundary_risks_detail"]:
            assert "material" in r
            assert "property" in r
            assert "boundary" in r
            assert "current" in r
            assert "eta_months" in r

    def test_anomalies_flagged_matches_list_length(self, seeded_db):
        resp = client.get("/api/dashboard")
        data = resp.json()
        assert data["anomalies_flagged"] == len(data["anomalies"])

    def test_boundary_risks_count_matches_detail_length(self, seeded_db):
        resp = client.get("/api/dashboard")
        data = resp.json()
        assert data["boundary_risks"] == len(data["boundary_risks_detail"])

    def test_fp42_boundary_risk_detected(self, seeded_db):
        """FancyPlast 42 should be flagged as a boundary risk (modulus approaching 10 MPa)."""
        resp = client.get("/api/dashboard")
        data = resp.json()
        risk_materials = [r["material"] for r in data["boundary_risks_detail"]]
        assert "FancyPlast 42" in risk_materials
