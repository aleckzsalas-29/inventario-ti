"""Tests for dashboard stats + advanced-stats endpoints (iteration 8)."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://maintenance-hub-284.preview.emergentagent.com").rstrip("/")


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": "admin@example.com", "password": "adminpassword"},
                      timeout=15)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    return r.json()["access_token"] if "access_token" in r.json() else r.json().get("token")


@pytest.fixture(scope="module")
def auth_headers(token):
    assert token, "no token received"
    return {"Authorization": f"Bearer {token}"}


# --- Regression: /dashboard/stats still returns expected shape ---
def test_dashboard_stats_regression(auth_headers):
    r = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=auth_headers, timeout=20)
    assert r.status_code == 200, r.text
    data = r.json()
    for k in ["equipment", "companies", "employees", "pending_maintenance",
              "pending_quotations", "pending_invoices", "equipment_by_type", "recent_activity"]:
        assert k in data, f"missing key {k}"
    assert isinstance(data["equipment"], dict)
    for k in ["total", "available", "assigned", "in_maintenance", "decommissioned"]:
        assert k in data["equipment"], f"missing equipment.{k}"
        assert isinstance(data["equipment"][k], int)
    assert isinstance(data["recent_activity"], list)


# --- New: /dashboard/advanced-stats returns all expected fields ---
def test_advanced_stats_shape(auth_headers):
    r = requests.get(f"{BASE_URL}/api/dashboard/advanced-stats", headers=auth_headers, timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    expected = [
        "maintenance_by_month", "maintenance_by_status", "avg_resolution_hours",
        "total_completed", "top_equipment_incidents", "equipment_by_status",
        "equipment_by_month", "expiring_services_30d",
    ]
    for k in expected:
        assert k in data, f"missing key {k}"
    assert isinstance(data["maintenance_by_month"], list)
    assert isinstance(data["maintenance_by_status"], list)
    assert isinstance(data["top_equipment_incidents"], list)
    assert isinstance(data["equipment_by_status"], list)
    assert isinstance(data["equipment_by_month"], list)
    assert isinstance(data["avg_resolution_hours"], (int, float))
    assert isinstance(data["total_completed"], int)
    assert isinstance(data["expiring_services_30d"], int)


def test_advanced_stats_maintenance_by_month_entries(auth_headers):
    r = requests.get(f"{BASE_URL}/api/dashboard/advanced-stats", headers=auth_headers, timeout=30)
    assert r.status_code == 200
    data = r.json()
    for entry in data["maintenance_by_month"]:
        for k in ["month", "Preventivo", "Correctivo", "Reparacion", "Otro", "total"]:
            assert k in entry, f"missing {k} in {entry}"
        assert isinstance(entry["total"], int)


def test_advanced_stats_equipment_by_status_entries(auth_headers):
    r = requests.get(f"{BASE_URL}/api/dashboard/advanced-stats", headers=auth_headers, timeout=30)
    data = r.json()
    for entry in data["equipment_by_status"]:
        assert "status" in entry
        assert "count" in entry
        assert isinstance(entry["count"], int)


def test_advanced_stats_top_equipment_entries(auth_headers):
    r = requests.get(f"{BASE_URL}/api/dashboard/advanced-stats", headers=auth_headers, timeout=30)
    data = r.json()
    # DB has 5 equipment + 24 maintenance logs => should be at least 1 entry
    for entry in data["top_equipment_incidents"]:
        for k in ["equipment_id", "code", "type", "brand_model", "count"]:
            assert k in entry
        assert isinstance(entry["count"], int) and entry["count"] > 0


def test_advanced_stats_unauthorized():
    r = requests.get(f"{BASE_URL}/api/dashboard/advanced-stats", timeout=10)
    assert r.status_code in (401, 403)
