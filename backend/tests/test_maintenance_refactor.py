"""Backend tests for Maintenance CRUD after MaintenancePage.js refactor."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://maintenance-hub-284.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"
ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "adminpassword"


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=20)
    assert r.status_code == 200, f"Login failed {r.status_code}: {r.text}"
    data = r.json()
    t = data.get("access_token") or data.get("token")
    assert t, f"No token in response: {data}"
    return t


@pytest.fixture(scope="module")
def headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def equipment_id(headers):
    r = requests.get(f"{API}/equipment", headers=headers, timeout=20)
    assert r.status_code == 200, r.text
    items = r.json()
    assert len(items) > 0, "No equipment available for test"
    return items[0]["id"]


# ---------- GET /api/maintenance ----------
def test_get_maintenance_list(headers):
    r = requests.get(f"{API}/maintenance", headers=headers, timeout=20)
    assert r.status_code == 200, r.text
    data = r.json()
    assert isinstance(data, list)
    if data:
        log = data[0]
        for key in ["id", "equipment_id", "maintenance_type", "description", "status"]:
            assert key in log, f"missing {key} in {log}"


def test_get_maintenance_filter_status(headers):
    r = requests.get(f"{API}/maintenance", params={"status": "Pendiente"}, headers=headers, timeout=20)
    assert r.status_code == 200
    for log in r.json():
        assert log["status"] == "Pendiente"


def test_get_maintenance_filter_type(headers):
    r = requests.get(f"{API}/maintenance", params={"maintenance_type": "Preventivo"}, headers=headers, timeout=20)
    assert r.status_code == 200
    for log in r.json():
        assert log["maintenance_type"] == "Preventivo"


# ---------- POST /api/maintenance (Preventivo) ----------
def test_create_preventivo_maintenance(headers, equipment_id):
    payload = {
        "equipment_id": equipment_id,
        "maintenance_type": "Preventivo",
        "description": f"TEST_REFACTOR_PREV_{uuid.uuid4().hex[:6]}",
        "technician": "Tester Bot",
        "performed_date": "2026-01-15",
        "next_maintenance_date": "2026-04-15",
        "maintenance_frequency": "Trimestral",
        "parts_used": "Filtro, aceite",
    }
    r = requests.post(f"{API}/maintenance", json=payload, headers=headers, timeout=20)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["equipment_id"] == equipment_id
    assert data["maintenance_type"] == "Preventivo"
    assert data["description"] == payload["description"]
    assert data["status"] == "Pendiente"
    assert data["maintenance_frequency"] == "Trimestral"
    assert "id" in data

    # Verify persistence
    r2 = requests.get(f"{API}/maintenance", params={"equipment_id": equipment_id}, headers=headers, timeout=20)
    assert r2.status_code == 200
    ids = [x["id"] for x in r2.json()]
    assert data["id"] in ids


# ---------- POST /api/maintenance (Correctivo) ----------
def test_create_correctivo_maintenance(headers, equipment_id):
    payload = {
        "equipment_id": equipment_id,
        "maintenance_type": "Correctivo",
        "description": f"TEST_REFACTOR_CORR_{uuid.uuid4().hex[:6]}",
        "technician": "Tester Bot",
        "performed_date": "2026-01-15",
        "problem_diagnosis": "Equipment not booting",
        "solution_applied": "Replaced PSU",
        "repair_time_hours": 1.5,
    }
    r = requests.post(f"{API}/maintenance", json=payload, headers=headers, timeout=20)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["maintenance_type"] == "Correctivo"
    assert data["problem_diagnosis"] == "Equipment not booting"
    assert data["solution_applied"] == "Replaced PSU"
    assert data["repair_time_hours"] == 1.5
    assert data["status"] == "Pendiente"


# ---------- PUT /api/maintenance/{id}/start ----------
def test_start_maintenance_changes_status(headers, equipment_id):
    payload = {
        "equipment_id": equipment_id,
        "maintenance_type": "Preventivo",
        "description": f"TEST_REFACTOR_START_{uuid.uuid4().hex[:6]}",
    }
    r = requests.post(f"{API}/maintenance", json=payload, headers=headers, timeout=20)
    assert r.status_code == 200, r.text
    log_id = r.json()["id"]

    r2 = requests.put(f"{API}/maintenance/{log_id}/start", headers=headers, timeout=20)
    assert r2.status_code == 200, r2.text

    r3 = requests.get(f"{API}/maintenance", params={"equipment_id": equipment_id}, headers=headers, timeout=20)
    match = [x for x in r3.json() if x["id"] == log_id]
    assert match and match[0]["status"] == "En Proceso"


# ---------- PUT /api/maintenance/{id}/complete ----------
def test_complete_maintenance_changes_status(headers, equipment_id):
    payload = {
        "equipment_id": equipment_id,
        "maintenance_type": "Correctivo",
        "description": f"TEST_REFACTOR_COMP_{uuid.uuid4().hex[:6]}",
    }
    r = requests.post(f"{API}/maintenance", json=payload, headers=headers, timeout=20)
    log_id = r.json()["id"]

    r2 = requests.put(
        f"{API}/maintenance/{log_id}/complete",
        params={"notes": "done", "solution": "fixed", "repair_time": 2.5},
        headers=headers,
        timeout=20,
    )
    assert r2.status_code == 200, r2.text

    r3 = requests.get(f"{API}/maintenance", params={"equipment_id": equipment_id}, headers=headers, timeout=20)
    match = [x for x in r3.json() if x["id"] == log_id]
    assert match and match[0]["status"] == "Finalizado"
    assert match[0].get("solution_applied") == "fixed"
    assert match[0].get("repair_time_hours") == 2.5


# ---------- Reports PDF endpoints ----------
def test_maintenance_period_report_pdf(headers):
    for period in ["day", "week", "month"]:
        r = requests.get(f"{API}/reports/maintenance/pdf", params={"period": period}, headers=headers, timeout=30)
        assert r.status_code == 200, f"period={period} -> {r.status_code} {r.text[:200]}"
        assert r.content[:4] == b"%PDF", f"Not a PDF for period={period}"


def test_maintenance_history_pdf(headers, equipment_id):
    r = requests.get(f"{API}/reports/maintenance/{equipment_id}/pdf", headers=headers, timeout=30)
    assert r.status_code == 200, r.text[:200]
    assert r.content[:4] == b"%PDF"
