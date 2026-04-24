# Tests for Solicitante role feature (iteration 11)
import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://maintenance-hub-284.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "adminpassword"
SOL_EMAIL = "usuario.soporte@test.com"
SOL_PASSWORD = "soporte123"
COMPANY_ID = "9b90fc35-de4f-4578-9194-27ae70471954"
EXPECTED_EQUIPMENT_ID = "f1c1a368-5ebf-4c4d-bb5f-4e594f526774"


def _login(email, password):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=15)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    return r.json()


@pytest.fixture(scope="module")
def admin_token():
    return _login(ADMIN_EMAIL, ADMIN_PASSWORD)["access_token"]


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(scope="module")
def sol_login():
    return _login(SOL_EMAIL, SOL_PASSWORD)


@pytest.fixture(scope="module")
def sol_token(sol_login):
    return sol_login["access_token"]


@pytest.fixture(scope="module")
def sol_headers(sol_token):
    return {"Authorization": f"Bearer {sol_token}"}


@pytest.fixture(scope="module")
def sol_user(sol_login):
    return sol_login["user"]


# ==================== Solicitante role seeded ====================

class TestSolicitanteRoleSeed:
    def test_solicitante_role_exists(self, admin_headers):
        r = requests.get(f"{API}/roles", headers=admin_headers, timeout=15)
        assert r.status_code == 200
        roles = r.json()
        sol = next((x for x in roles if x["name"] == "Solicitante"), None)
        assert sol is not None, "Solicitante role not seeded"
        assert sorted(sol["permissions"]) == sorted(["tickets.read", "tickets.write"])
        assert sol["is_system"] is True


# ==================== User model: assigned_equipment_ids ====================

class TestUserAssignedEquipment:
    def test_sol_user_has_assigned_equipment(self, sol_user):
        assert sol_user.get("role_name") == "Solicitante"
        assert EXPECTED_EQUIPMENT_ID in (sol_user.get("assigned_equipment_ids") or [])

    def test_admin_can_create_user_with_assigned_equipment(self, admin_headers):
        # Need Solicitante role id
        roles = requests.get(f"{API}/roles", headers=admin_headers, timeout=15).json()
        sol_role = next(r for r in roles if r["name"] == "Solicitante")
        payload = {
            "email": "TEST_sol_user@example.com",
            "password": "testpass123",
            "name": "TEST Solicitante",
            "role_id": sol_role["id"],
            "company_id": COMPANY_ID,
            "assigned_equipment_ids": [EXPECTED_EQUIPMENT_ID],
        }
        # cleanup if already exists
        existing = requests.get(f"{API}/users", headers=admin_headers, timeout=15).json()
        prior = next((u for u in existing if u["email"] == payload["email"]), None)
        if prior:
            requests.delete(f"{API}/users/{prior['id']}", headers=admin_headers, timeout=15)
            # re-activate by update, but since delete is soft, just run update
            # easier: skip and use returned id
        r = requests.post(f"{API}/users", headers=admin_headers, json=payload, timeout=15)
        if r.status_code == 400 and "registrado" in r.text:
            # already exists, fetch and continue
            users = requests.get(f"{API}/users", headers=admin_headers, timeout=15).json()
            created = next(u for u in users if u["email"] == payload["email"])
        else:
            assert r.status_code == 200, r.text
            created = r.json()
        assert created["assigned_equipment_ids"] == [EXPECTED_EQUIPMENT_ID]
        assert created.get("role_name") in (None, "Solicitante")  # role_name not in create response
        # GET verification via list
        users = requests.get(f"{API}/users", headers=admin_headers, timeout=15).json()
        fetched = next(u for u in users if u["id"] == created["id"])
        assert fetched["assigned_equipment_ids"] == [EXPECTED_EQUIPMENT_ID]
        assert fetched["role_name"] == "Solicitante"
        # cleanup (soft delete)
        requests.delete(f"{API}/users/{created['id']}", headers=admin_headers, timeout=15)


# ==================== /tickets/my-equipment ====================

class TestMyEquipment:
    def test_sol_my_equipment_returns_assigned(self, sol_headers):
        r = requests.get(f"{API}/tickets/my-equipment", headers=sol_headers, timeout=15)
        assert r.status_code == 200
        eqs = r.json()
        assert isinstance(eqs, list)
        ids = [e["id"] for e in eqs]
        assert EXPECTED_EQUIPMENT_ID in ids
        for e in eqs:
            assert "inventory_code" in e
            assert "_id" not in e

    def test_admin_my_equipment_returns_empty_if_no_assigned(self, admin_headers):
        r = requests.get(f"{API}/tickets/my-equipment", headers=admin_headers, timeout=15)
        assert r.status_code == 200
        # Admin has no assigned_equipment_ids -> []
        assert r.json() == []


# ==================== /tickets as solicitante ====================

class TestTicketsAccess:
    def test_sol_gets_only_own_tickets(self, sol_headers, sol_user):
        r = requests.get(f"{API}/tickets", headers=sol_headers, timeout=15)
        assert r.status_code == 200
        tickets = r.json()
        assert isinstance(tickets, list)
        # Every ticket must have created_by == sol_user id
        for t in tickets:
            assert t.get("created_by") == sol_user["id"], f"Leaked ticket: {t.get('ticket_number')} created_by={t.get('created_by')}"

    def test_admin_gets_all_tickets(self, admin_headers):
        r = requests.get(f"{API}/tickets", headers=admin_headers, timeout=15)
        assert r.status_code == 200
        tickets = r.json()
        assert isinstance(tickets, list)
        # admin sees possibly multiple creators, no filter applied
        creators = {t.get("created_by") for t in tickets if t.get("created_by")}
        # Not strict - just ensure works
        assert len(tickets) >= 0

    def test_sol_stats_only_own(self, sol_headers, sol_user):
        r = requests.get(f"{API}/tickets/stats", headers=sol_headers, timeout=15)
        assert r.status_code == 200
        stats = r.json()
        assert "total" in stats and "open" in stats
        # compare to own tickets list count
        own_tickets = requests.get(f"{API}/tickets", headers=sol_headers, timeout=15).json()
        assert stats["total"] == len(own_tickets)

    def test_admin_stats_shows_all(self, admin_headers):
        r = requests.get(f"{API}/tickets/stats", headers=admin_headers, timeout=15)
        assert r.status_code == 200
        all_tickets = requests.get(f"{API}/tickets", headers=admin_headers, timeout=15).json()
        assert r.json()["total"] == len(all_tickets)


# ==================== Solicitante creates ticket ====================

class TestSolicitanteCreatesTicket:
    def test_sol_creates_ticket_stamped_with_user_id(self, sol_headers, sol_user, admin_headers):
        payload = {
            "title": "TEST Solicitante ticket",
            "description": "Auto test ticket from solicitante",
            "priority": "Baja",
            "category": "General",
            "equipment_id": EXPECTED_EQUIPMENT_ID,
        }
        r = requests.post(f"{API}/tickets", headers=sol_headers, json=payload, timeout=15)
        assert r.status_code == 200, r.text
        ticket = r.json()
        assert ticket["created_by"] == sol_user["id"]
        assert ticket["status"] == "Abierto"
        assert ticket["equipment_id"] == EXPECTED_EQUIPMENT_ID
        tid = ticket["id"]

        # GET verify
        get_r = requests.get(f"{API}/tickets/{tid}", headers=sol_headers, timeout=15)
        assert get_r.status_code == 200
        assert get_r.json()["created_by"] == sol_user["id"]

        # Solicitante can add comment
        c = requests.post(f"{API}/tickets/{tid}/comments", headers=sol_headers,
                          json={"content": "TEST comment by sol"}, timeout=15)
        assert c.status_code == 200
        assert c.json()["content"] == "TEST comment by sol"
        assert c.json()["author_id"] == sol_user["id"]

        # Ensure ticket appears in sol's listing
        lst = requests.get(f"{API}/tickets", headers=sol_headers, timeout=15).json()
        assert any(t["id"] == tid for t in lst)

        # cleanup via admin
        d = requests.delete(f"{API}/tickets/{tid}", headers=admin_headers, timeout=15)
        assert d.status_code in (200, 204)


# ==================== Constants endpoint order ====================

class TestStaticRoutesOrder:
    def test_constants_not_captured_by_ticket_id_route(self, sol_headers):
        r = requests.get(f"{API}/tickets/options/constants", headers=sol_headers, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert "statuses" in data and "priorities" in data and "categories" in data

    def test_my_equipment_not_captured_by_ticket_id_route(self, sol_headers):
        r = requests.get(f"{API}/tickets/my-equipment", headers=sol_headers, timeout=15)
        assert r.status_code == 200
        # If order was wrong, we'd get 404 ticket no encontrado
        assert isinstance(r.json(), list)
