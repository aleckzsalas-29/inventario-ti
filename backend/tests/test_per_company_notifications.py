"""Per-company notification settings tests (iteration 10)."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://maintenance-hub-284.preview.emergentagent.com").rstrip("/")
COMPANY_ID = "9b90fc35-de4f-4578-9194-27ae70471954"


@pytest.fixture(scope="module")
def token():
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "admin@example.com", "password": "adminpassword"},
        timeout=20,
    )
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ============ GET settings ============

def test_get_settings_legacy_global(headers):
    r = requests.get(f"{BASE_URL}/api/notifications/settings", headers=headers, timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert "send_time" in data
    assert data.get("type") in ("notifications", "company_notifications", None) or isinstance(data, dict)


def test_get_settings_for_company(headers):
    r = requests.get(
        f"{BASE_URL}/api/notifications/settings?company_id={COMPANY_ID}",
        headers=headers, timeout=15,
    )
    assert r.status_code == 200
    data = r.json()
    assert data.get("company_id") == COMPANY_ID or data.get("type") == "company_notifications"
    # sensible defaults present
    for k in ("enabled", "auto_send_enabled", "send_time",
              "service_renewal_enabled", "maintenance_pending_enabled",
              "maintenance_completed_enabled", "recipient_type"):
        assert k in data, f"missing key {k} in company settings"


# ============ PUT settings ============

def test_put_and_persist_company_settings(headers):
    payload = {
        "enabled": True,
        "auto_send_enabled": True,
        "send_time": "09:30",
        "service_renewal_enabled": True,
        "service_renewal_days": 15,
        "maintenance_pending_enabled": True,
        "maintenance_completed_enabled": False,
        "recipient_type": "custom",
        "custom_recipients": ["TEST_notify@example.com"],
    }
    r = requests.put(
        f"{BASE_URL}/api/notifications/settings?company_id={COMPANY_ID}",
        headers=headers, json=payload, timeout=15,
    )
    assert r.status_code == 200, r.text
    saved = r.json()
    assert saved.get("send_time") == "09:30"
    assert saved.get("service_renewal_days") == 15
    assert saved.get("maintenance_completed_enabled") is False
    assert saved.get("recipient_type") == "custom"
    assert saved.get("company_id") == COMPANY_ID

    # Verify persistence via GET
    r2 = requests.get(
        f"{BASE_URL}/api/notifications/settings?company_id={COMPANY_ID}",
        headers=headers, timeout=15,
    )
    assert r2.status_code == 200
    fetched = r2.json()
    assert fetched.get("send_time") == "09:30"
    assert fetched.get("custom_recipients") == ["TEST_notify@example.com"]
    assert fetched.get("auto_send_enabled") is True
    assert fetched.get("type") == "company_notifications"


def test_put_global_legacy_settings(headers):
    payload = {
        "enabled": True, "auto_send_enabled": False, "send_time": "08:00",
        "service_renewal_enabled": True, "service_renewal_days": 30,
        "maintenance_pending_enabled": True, "maintenance_completed_enabled": True,
        "recipient_type": "all_users", "custom_recipients": [],
    }
    r = requests.put(f"{BASE_URL}/api/notifications/settings",
                     headers=headers, json=payload, timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get("type") == "notifications"
    assert data.get("send_time") == "08:00"


# ============ all-companies overview ============

def test_get_all_companies_overview(headers):
    r = requests.get(f"{BASE_URL}/api/notifications/settings/all-companies",
                     headers=headers, timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    match = [c for c in data if c.get("company_id") == COMPANY_ID]
    assert match, "Test company not found in overview"
    c = match[0]
    for k in ("company_id", "company_name", "configured", "enabled", "auto_send_enabled"):
        assert k in c
    # After previous PUT it should be configured + auto_send enabled
    assert c["configured"] is True
    assert c["auto_send_enabled"] is True


# ============ send-now ============

def test_send_now_for_company(headers):
    r = requests.post(
        f"{BASE_URL}/api/notifications/send-now?company_id={COMPANY_ID}",
        headers=headers, timeout=60,
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert "message" in data


def test_send_now_global(headers):
    r = requests.post(f"{BASE_URL}/api/notifications/send-now",
                      headers=headers, timeout=60)
    assert r.status_code == 200
    assert "message" in r.json()


# ============ email/send ============

def test_send_manual_email_for_company(headers):
    payload = {"notification_type": "maintenance_pending", "recipient_emails": []}
    r = requests.post(
        f"{BASE_URL}/api/notifications/email/send?company_id={COMPANY_ID}",
        headers=headers, json=payload, timeout=60,
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert "sent" in data or "message" in data


def test_send_manual_email_invalid_company(headers):
    payload = {"notification_type": "maintenance_pending", "recipient_emails": []}
    r = requests.post(
        f"{BASE_URL}/api/notifications/email/send?company_id=non-existent-id",
        headers=headers, json=payload, timeout=30,
    )
    assert r.status_code == 404


def test_send_now_invalid_company(headers):
    r = requests.post(
        f"{BASE_URL}/api/notifications/send-now?company_id=non-existent-id",
        headers=headers, timeout=30,
    )
    assert r.status_code == 404


# ============ auth ============

def test_endpoints_require_auth():
    r = requests.get(f"{BASE_URL}/api/notifications/settings/all-companies", timeout=15)
    assert r.status_code in (401, 403)
