"""Backend tests for Tickets module (iteration 9).

Covers:
- POST /api/tickets (ticket_number auto-increment)
- GET /api/tickets (list + filters)
- GET /api/tickets/{id} (enriched fields)
- PUT /api/tickets/{id} (update + status transitions)
- DELETE /api/tickets/{id} (cascades comments)
- GET /api/tickets/stats (counts by status/priority/category)
- POST /api/tickets/{id}/comments
- GET /api/tickets/{id}/comments
- GET /api/tickets/options/constants (route-conflict check with /tickets/{id})
- PWA manifest at /manifest.json (public)
"""

import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://maintenance-hub-284.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "adminpassword"


@pytest.fixture(scope="module")
def token():
    resp = requests.post(f"{API}/auth/login",
                         json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
                         timeout=15)
    assert resp.status_code == 200, f"login failed {resp.status_code} {resp.text[:300]}"
    data = resp.json()
    tok = data.get("access_token") or data.get("token")
    assert tok, f"no token in {data}"
    return tok


@pytest.fixture(scope="module")
def headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def created_ticket(headers):
    payload = {
        "title": "TEST_Pytest ticket",
        "description": "TEST_Pytest description with details",
        "priority": "Alta",
        "category": "Hardware",
        "equipment_id": None,
        "assigned_to": None,
    }
    r = requests.post(f"{API}/tickets", headers=headers, json=payload, timeout=15)
    assert r.status_code in (200, 201), f"create failed {r.status_code} {r.text[:300]}"
    t = r.json()
    yield t
    # teardown
    requests.delete(f"{API}/tickets/{t['id']}", headers=headers, timeout=15)


# ---------------- PWA ----------------

def test_pwa_manifest_public():
    r = requests.get(f"{BASE_URL}/manifest.json", timeout=15)
    assert r.status_code == 200, f"manifest status {r.status_code}"
    data = r.json()
    assert data.get("name"), "missing name"
    icons = data.get("icons") or []
    assert len(icons) >= 2, f"expected >=2 icons, got {len(icons)}"
    assert any(i.get("sizes") == "192x192" for i in icons)
    assert any(i.get("sizes") == "512x512" for i in icons)


# ---------------- CONSTANTS ----------------

def test_ticket_constants(headers):
    r = requests.get(f"{API}/tickets/options/constants", headers=headers, timeout=15)
    assert r.status_code == 200, f"constants failed {r.status_code} {r.text[:200]}"
    d = r.json()
    assert "statuses" in d and "priorities" in d and "categories" in d
    assert "Abierto" in d["statuses"]
    assert "Alta" in d["priorities"]
    assert "Hardware" in d["categories"]


# ---------------- CREATE ----------------

def test_create_ticket_assigns_ticket_number(created_ticket):
    tn = created_ticket.get("ticket_number")
    assert tn and tn.startswith("TK-"), f"bad ticket_number {tn}"
    assert len(tn) == 7, f"expected TK-XXXX format, got {tn}"
    assert created_ticket["status"] == "Abierto"
    assert created_ticket["priority"] == "Alta"
    assert created_ticket["category"] == "Hardware"
    assert created_ticket["title"] == "TEST_Pytest ticket"
    assert "id" in created_ticket


def test_create_ticket_auto_increments(headers, created_ticket):
    # create a second ticket and verify number increments
    payload = {
        "title": "TEST_Second ticket",
        "description": "TEST second",
        "priority": "Baja",
        "category": "Software",
    }
    r = requests.post(f"{API}/tickets", headers=headers, json=payload, timeout=15)
    assert r.status_code in (200, 201)
    t2 = r.json()
    try:
        n1 = int(created_ticket["ticket_number"].replace("TK-", ""))
        n2 = int(t2["ticket_number"].replace("TK-", ""))
        assert n2 > n1, f"expected increment: {n1} -> {n2}"
    finally:
        requests.delete(f"{API}/tickets/{t2['id']}", headers=headers, timeout=15)


# ---------------- LIST / FILTERS ----------------

def test_list_tickets(headers, created_ticket):
    r = requests.get(f"{API}/tickets", headers=headers, timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    ids = [t["id"] for t in data]
    assert created_ticket["id"] in ids


def test_list_tickets_filter_priority(headers, created_ticket):
    r = requests.get(f"{API}/tickets", headers=headers, params={"priority": "Alta"}, timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert all(t["priority"] == "Alta" for t in data)
    assert created_ticket["id"] in [t["id"] for t in data]


def test_list_tickets_filter_status(headers, created_ticket):
    r = requests.get(f"{API}/tickets", headers=headers, params={"status": "Abierto"}, timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert all(t["status"] == "Abierto" for t in data)


def test_list_tickets_filter_category(headers, created_ticket):
    r = requests.get(f"{API}/tickets", headers=headers, params={"category": "Hardware"}, timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert all(t["category"] == "Hardware" for t in data)


# ---------------- GET BY ID ----------------

def test_get_ticket_by_id_enriched(headers, created_ticket):
    r = requests.get(f"{API}/tickets/{created_ticket['id']}", headers=headers, timeout=15)
    assert r.status_code == 200, r.text[:300]
    t = r.json()
    assert t["id"] == created_ticket["id"]
    # enriched fields should be present keys (may be None if not linked)
    for k in ("equipment_code", "assigned_to_name", "created_by_name"):
        assert k in t, f"missing enriched field {k}"
    # creator name expected to be populated for admin
    assert t.get("created_by_name"), "expected created_by_name for admin creator"


def test_get_ticket_not_found(headers):
    r = requests.get(f"{API}/tickets/nonexistent-id-xyz", headers=headers, timeout=15)
    assert r.status_code == 404


# ---------------- STATS ----------------

def test_ticket_stats(headers, created_ticket):
    r = requests.get(f"{API}/tickets/stats", headers=headers, timeout=15)
    assert r.status_code == 200, r.text[:300]
    s = r.json()
    for k in ("total", "open", "in_progress", "resolved", "closed", "by_priority", "by_category"):
        assert k in s, f"missing {k}"
    assert isinstance(s["by_priority"], dict)
    assert "Alta" in s["by_priority"]
    assert s["open"] >= 1  # at least our created ticket


# ---------------- UPDATE / STATUS TRANSITIONS ----------------

def test_update_ticket_status_flow(headers):
    # create fresh ticket for transition testing
    payload = {"title": "TEST_flow", "description": "flow test", "priority": "Media", "category": "General"}
    r = requests.post(f"{API}/tickets", headers=headers, json=payload, timeout=15)
    t = r.json()
    tid = t["id"]
    try:
        # Abierto -> En Proceso
        r2 = requests.put(f"{API}/tickets/{tid}", headers=headers, json={"status": "En Proceso"}, timeout=15)
        assert r2.status_code == 200, r2.text[:300]
        assert r2.json()["status"] == "En Proceso"

        # -> Resuelto (should set closed_at)
        r3 = requests.put(f"{API}/tickets/{tid}", headers=headers, json={"status": "Resuelto", "resolution_notes": "done"}, timeout=15)
        assert r3.status_code == 200
        d3 = r3.json()
        assert d3["status"] == "Resuelto"
        assert d3.get("closed_at"), "expected closed_at on Resuelto"
        assert d3.get("resolution_notes") == "done"

        # -> Cerrado
        r4 = requests.put(f"{API}/tickets/{tid}", headers=headers, json={"status": "Cerrado"}, timeout=15)
        assert r4.status_code == 200
        assert r4.json()["status"] == "Cerrado"

        # GET verifies persistence
        g = requests.get(f"{API}/tickets/{tid}", headers=headers, timeout=15)
        assert g.json()["status"] == "Cerrado"
    finally:
        requests.delete(f"{API}/tickets/{tid}", headers=headers, timeout=15)


# ---------------- COMMENTS ----------------

def test_add_and_list_comments(headers, created_ticket):
    tid = created_ticket["id"]
    r = requests.post(f"{API}/tickets/{tid}/comments", headers=headers,
                      json={"content": "TEST_comment one"}, timeout=15)
    assert r.status_code in (200, 201), r.text[:300]
    c = r.json()
    assert c["content"] == "TEST_comment one"
    assert c.get("author_name")
    assert c["ticket_id"] == tid

    # second comment for sort
    requests.post(f"{API}/tickets/{tid}/comments", headers=headers,
                  json={"content": "TEST_comment two"}, timeout=15)

    lr = requests.get(f"{API}/tickets/{tid}/comments", headers=headers, timeout=15)
    assert lr.status_code == 200
    comments = lr.json()
    assert len(comments) >= 2
    # ascending created_at
    assert comments[0]["content"] == "TEST_comment one"
    assert comments[1]["content"] == "TEST_comment two"


def test_add_comment_ticket_not_found(headers):
    r = requests.post(f"{API}/tickets/does-not-exist/comments", headers=headers,
                      json={"content": "x"}, timeout=15)
    assert r.status_code == 404


# ---------------- DELETE CASCADE ----------------

def test_delete_ticket_cascades_comments(headers):
    payload = {"title": "TEST_del", "description": "to delete", "priority": "Baja", "category": "General"}
    t = requests.post(f"{API}/tickets", headers=headers, json=payload, timeout=15).json()
    tid = t["id"]
    requests.post(f"{API}/tickets/{tid}/comments", headers=headers, json={"content": "TEST_c"}, timeout=15)

    d = requests.delete(f"{API}/tickets/{tid}", headers=headers, timeout=15)
    assert d.status_code == 200

    g = requests.get(f"{API}/tickets/{tid}", headers=headers, timeout=15)
    assert g.status_code == 404

    # comments endpoint still returns 200 with [] (no ticket existence check there)
    c = requests.get(f"{API}/tickets/{tid}/comments", headers=headers, timeout=15)
    assert c.status_code == 200
    assert c.json() == []


# ---------------- AUTH ----------------

def test_tickets_require_auth():
    r = requests.get(f"{API}/tickets", timeout=15)
    assert r.status_code in (401, 403)
