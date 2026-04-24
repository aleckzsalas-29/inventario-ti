"""
Tests for:
 - Office fields (office_version, office_license) on Equipment CRUD
 - Equipment PDF report (Software section includes Office fields)
 - Maintenance PDF report header includes assigned employee name
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://maintenance-hub-284.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "adminpassword"
COMPANY_ID = "9b90fc35-de4f-4578-9194-27ae70471954"


@pytest.fixture(scope="session")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
                      timeout=30)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def auth_headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


@pytest.fixture(scope="session")
def employee_id(auth_headers):
    # Reuse existing employee or create a new one
    r = requests.get(f"{BASE_URL}/api/employees", headers=auth_headers, timeout=30)
    assert r.status_code == 200
    emps = [e for e in r.json() if e.get("company_id") == COMPANY_ID]
    if emps:
        return emps[0]["id"]
    payload = {
        "company_id": COMPANY_ID,
        "first_name": "TEST",
        "last_name": "OfficePDF",
        "dni": f"TST-{uuid.uuid4().hex[:8]}",
    }
    r = requests.post(f"{BASE_URL}/api/employees", json=payload, headers=auth_headers, timeout=30)
    assert r.status_code in (200, 201), r.text
    return r.json()["id"]


# --------- Equipment: office_version / office_license fields ---------

class TestEquipmentOfficeFields:
    """CRUD + field persistence"""

    created_ids: list = []

    def test_create_equipment_with_office_fields(self, auth_headers):
        suffix = uuid.uuid4().hex[:8].upper()
        payload = {
            "company_id": COMPANY_ID,
            "inventory_code": f"TEST-OFF-{suffix}",
            "equipment_type": "Desktop",
            "brand": "Dell",
            "model": "OptiPlex 7090",
            "serial_number": f"SN-OFF-{suffix}",
            "status": "Disponible",
            "office_version": "Office 365",
            "office_license": "OFF-LIC-12345",
        }
        r = requests.post(f"{BASE_URL}/api/equipment", json=payload, headers=auth_headers, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["office_version"] == "Office 365"
        assert data["office_license"] == "OFF-LIC-12345"
        assert "id" in data
        TestEquipmentOfficeFields.created_ids.append(data["id"])

    def test_get_equipment_returns_office_fields(self, auth_headers):
        assert TestEquipmentOfficeFields.created_ids, "Create test must run first"
        eq_id = TestEquipmentOfficeFields.created_ids[0]
        r = requests.get(f"{BASE_URL}/api/equipment/{eq_id}", headers=auth_headers, timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert data["office_version"] == "Office 365"
        assert data["office_license"] == "OFF-LIC-12345"

    def test_get_equipment_list_returns_office_fields(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/equipment?company_id={COMPANY_ID}",
                         headers=auth_headers, timeout=30)
        assert r.status_code == 200
        items = r.json()
        # Ensure field key is present in the response schema
        assert len(items) > 0
        for eq in items:
            assert "office_version" in eq
            assert "office_license" in eq

    def test_update_equipment_office_fields(self, auth_headers):
        assert TestEquipmentOfficeFields.created_ids
        eq_id = TestEquipmentOfficeFields.created_ids[0]
        r = requests.get(f"{BASE_URL}/api/equipment/{eq_id}", headers=auth_headers, timeout=30)
        current = r.json()
        update_payload = {
            "company_id": current["company_id"],
            "branch_id": current.get("branch_id"),
            "inventory_code": current["inventory_code"],
            "equipment_type": current["equipment_type"],
            "brand": current["brand"],
            "model": current["model"],
            "serial_number": current["serial_number"],
            "status": current.get("status", "Disponible"),
            "office_version": "Office 2021 Pro",
            "office_license": "OFF-LIC-UPDATED",
        }
        r = requests.put(f"{BASE_URL}/api/equipment/{eq_id}",
                         json=update_payload, headers=auth_headers, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["office_version"] == "Office 2021 Pro"
        assert data["office_license"] == "OFF-LIC-UPDATED"

        # Verify via GET
        r = requests.get(f"{BASE_URL}/api/equipment/{eq_id}", headers=auth_headers, timeout=30)
        fetched = r.json()
        assert fetched["office_version"] == "Office 2021 Pro"
        assert fetched["office_license"] == "OFF-LIC-UPDATED"


# --------- PDF reports ---------

class TestEquipmentPDFReport:

    def test_equipment_pdf_is_generated(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/reports/equipment/pdf",
                         headers=auth_headers, timeout=60)
        assert r.status_code == 200, r.text[:500]
        ctype = r.headers.get("content-type", "")
        assert "application/pdf" in ctype, f"Unexpected content-type: {ctype}"
        assert r.content[:4] == b"%PDF", "Response is not a valid PDF"
        assert len(r.content) > 1000


class TestMaintenancePDFReport:

    def test_maintenance_pdf_with_assigned_employee(self, auth_headers, employee_id):
        # 1. Create an equipment & assign it to an employee
        suffix = uuid.uuid4().hex[:8].upper()
        eq_payload = {
            "company_id": COMPANY_ID,
            "inventory_code": f"TEST-MPDF-{suffix}",
            "equipment_type": "Desktop",
            "brand": "Dell",
            "model": "OptiPlex",
            "serial_number": f"SN-MPDF-{suffix}",
            "status": "Disponible",
            "office_version": "Office 365",
        }
        r = requests.post(f"{BASE_URL}/api/equipment", json=eq_payload, headers=auth_headers, timeout=30)
        assert r.status_code == 200, r.text
        eq_id = r.json()["id"]

        # assign
        assign_payload = {
            "equipment_id": eq_id,
            "employee_id": employee_id,
            "delivery_date": "2026-01-01",
            "observations": "test assign",
        }
        r = requests.post(f"{BASE_URL}/api/assignments", json=assign_payload, headers=auth_headers, timeout=30)
        assert r.status_code == 200, r.text

        # 2. Create maintenance log
        maint_payload = {
            "equipment_id": eq_id,
            "maintenance_type": "Preventivo",
            "description": "TEST maintenance for PDF header",
            "technician": "Tester",
            "performed_date": "2026-01-15",
        }
        r = requests.post(f"{BASE_URL}/api/maintenance", json=maint_payload, headers=auth_headers, timeout=30)
        assert r.status_code == 200, r.text

        # 3. Download maintenance PDF
        r = requests.get(f"{BASE_URL}/api/reports/maintenance/pdf",
                         headers=auth_headers, timeout=60)
        assert r.status_code == 200, r.text[:500]
        ctype = r.headers.get("content-type", "")
        assert "application/pdf" in ctype, f"Unexpected content-type: {ctype}"
        assert r.content[:4] == b"%PDF", "Response is not a valid PDF"
        assert len(r.content) > 1000
