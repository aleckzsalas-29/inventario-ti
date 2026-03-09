"""
Test file for notification features after major refactoring:
- Email notifications with APScheduler
- Configurable scheduled daily notifications
- Notification settings, history, scheduler status
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuth:
    """Test authentication endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_login_with_admin_credentials(self):
        """Test login with admin@example.com / adminpassword"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@example.com",
            "password": "adminpassword"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == "admin@example.com"
        print(f"✓ Login successful for admin@example.com")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials returns 401"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@example.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401


class TestDashboard:
    """Test dashboard endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        # Login
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@example.com",
            "password": "adminpassword"
        })
        if response.status_code == 200:
            token = response.json()["access_token"]
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip("Login failed")
    
    def test_dashboard_stats(self):
        """Test dashboard stats endpoint"""
        response = self.session.get(f"{BASE_URL}/api/dashboard/stats")
        assert response.status_code == 200, f"Dashboard stats failed: {response.text}"
        data = response.json()
        # Should return stats object
        assert isinstance(data, dict)
        print(f"✓ Dashboard stats loaded successfully")


class TestNotificationSettings:
    """Test notification settings endpoints - new feature"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        # Login
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@example.com",
            "password": "adminpassword"
        })
        if response.status_code == 200:
            token = response.json()["access_token"]
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip("Login failed")
    
    def test_get_notification_settings(self):
        """GET /api/notifications/settings returns default settings"""
        response = self.session.get(f"{BASE_URL}/api/notifications/settings")
        assert response.status_code == 200, f"Get settings failed: {response.text}"
        data = response.json()
        
        # Validate response structure
        assert "type" in data and data["type"] == "notifications"
        assert "enabled" in data
        assert "auto_send_enabled" in data
        assert "send_time" in data
        assert "service_renewal_enabled" in data
        assert "maintenance_pending_enabled" in data
        assert "recipient_type" in data
        print(f"✓ Notification settings GET successful - auto_send_enabled={data['auto_send_enabled']}")
    
    def test_update_notification_settings(self):
        """PUT /api/notifications/settings saves and enables scheduler"""
        settings_data = {
            "enabled": True,
            "auto_send_enabled": True,
            "send_time": "09:30",
            "service_renewal_enabled": True,
            "service_renewal_days": 15,
            "maintenance_pending_enabled": True,
            "new_equipment_enabled": True,
            "recipient_type": "all_users",
            "custom_recipients": []
        }
        
        response = self.session.put(f"{BASE_URL}/api/notifications/settings", json=settings_data)
        assert response.status_code == 200, f"Update settings failed: {response.text}"
        data = response.json()
        
        # Verify settings were saved
        assert data["auto_send_enabled"] == True
        assert data["send_time"] == "09:30"
        assert data["service_renewal_days"] == 15
        print(f"✓ Notification settings updated successfully")
        
        # Verify by GET
        get_response = self.session.get(f"{BASE_URL}/api/notifications/settings")
        assert get_response.status_code == 200
        get_data = get_response.json()
        assert get_data["send_time"] == "09:30"


class TestNotificationScheduler:
    """Test notification scheduler status"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@example.com",
            "password": "adminpassword"
        })
        if response.status_code == 200:
            token = response.json()["access_token"]
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip("Login failed")
    
    def test_get_scheduler_status(self):
        """GET /api/notifications/scheduler/status returns scheduler info"""
        response = self.session.get(f"{BASE_URL}/api/notifications/scheduler/status")
        assert response.status_code == 200, f"Get scheduler status failed: {response.text}"
        data = response.json()
        
        # Validate response structure
        assert "scheduler_running" in data
        assert "job_active" in data
        # next_run can be None if not scheduled
        assert "next_run" in data
        print(f"✓ Scheduler status: running={data['scheduler_running']}, job_active={data['job_active']}")


class TestNotificationCheck:
    """Test notification check endpoint for pending items"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@example.com",
            "password": "adminpassword"
        })
        if response.status_code == 200:
            token = response.json()["access_token"]
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip("Login failed")
    
    def test_check_notifications(self):
        """GET /api/notifications/check returns pending items"""
        response = self.session.get(f"{BASE_URL}/api/notifications/check")
        assert response.status_code == 200, f"Check notifications failed: {response.text}"
        data = response.json()
        
        # Validate response structure
        assert "pending_maintenance" in data
        assert "expiring_services" in data
        assert "total_alerts" in data
        assert isinstance(data["pending_maintenance"], list)
        assert isinstance(data["expiring_services"], list)
        print(f"✓ Notification check: {data['total_alerts']} alerts (maintenance={len(data['pending_maintenance'])}, services={len(data['expiring_services'])})")


class TestNotificationHistory:
    """Test notification history endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@example.com",
            "password": "adminpassword"
        })
        if response.status_code == 200:
            token = response.json()["access_token"]
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip("Login failed")
    
    def test_get_notification_history(self):
        """GET /api/notifications/history returns history array"""
        response = self.session.get(f"{BASE_URL}/api/notifications/history")
        assert response.status_code == 200, f"Get history failed: {response.text}"
        data = response.json()
        
        # Should return array (empty initially is OK)
        assert isinstance(data, list)
        print(f"✓ Notification history: {len(data)} records")


class TestTriggerNotifications:
    """Test manual notification trigger"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@example.com",
            "password": "adminpassword"
        })
        if response.status_code == 200:
            token = response.json()["access_token"]
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip("Login failed")
    
    def test_trigger_auto_notifications(self):
        """POST /api/notifications/send-now triggers auto notifications"""
        response = self.session.post(f"{BASE_URL}/api/notifications/send-now")
        assert response.status_code == 200, f"Trigger notifications failed: {response.text}"
        data = response.json()
        
        assert "message" in data
        print(f"✓ Auto notifications triggered: {data['message']}")


class TestPageAPIs:
    """Test page loading APIs for main pages"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@example.com",
            "password": "adminpassword"
        })
        if response.status_code == 200:
            token = response.json()["access_token"]
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip("Login failed")
    
    def test_equipment_list(self):
        """Test equipment list endpoint"""
        response = self.session.get(f"{BASE_URL}/api/equipment")
        assert response.status_code == 200, f"Equipment list failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Equipment list: {len(data)} items")
    
    def test_companies_list(self):
        """Test companies list endpoint"""
        response = self.session.get(f"{BASE_URL}/api/companies")
        assert response.status_code == 200, f"Companies list failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Companies list: {len(data)} items")
    
    def test_employees_list(self):
        """Test employees list endpoint"""
        response = self.session.get(f"{BASE_URL}/api/employees")
        assert response.status_code == 200, f"Employees list failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Employees list: {len(data)} items")
    
    def test_maintenance_logs(self):
        """Test maintenance logs endpoint"""
        response = self.session.get(f"{BASE_URL}/api/maintenance")
        assert response.status_code == 200, f"Maintenance logs failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Maintenance logs: {len(data)} items")
    
    def test_external_services(self):
        """Test external services endpoint"""
        response = self.session.get(f"{BASE_URL}/api/external-services")
        assert response.status_code == 200, f"External services failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ External services: {len(data)} items")
    
    def test_settings(self):
        """Test settings endpoint"""
        response = self.session.get(f"{BASE_URL}/api/settings")
        assert response.status_code == 200, f"Settings failed: {response.text}"
        print(f"✓ Settings loaded successfully")
    
    def test_quotations_list(self):
        """Test quotations list endpoint"""
        response = self.session.get(f"{BASE_URL}/api/quotations")
        assert response.status_code == 200, f"Quotations list failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Quotations list: {len(data)} items")
    
    def test_invoices_list(self):
        """Test invoices list endpoint"""
        response = self.session.get(f"{BASE_URL}/api/invoices")
        assert response.status_code == 200, f"Invoices list failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Invoices list: {len(data)} items")
    
    def test_assignments_list(self):
        """Test assignments list endpoint"""
        response = self.session.get(f"{BASE_URL}/api/assignments")
        assert response.status_code == 200, f"Assignments list failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Assignments list: {len(data)} items")


class TestReportsPDF:
    """Test PDF report download"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@example.com",
            "password": "adminpassword"
        })
        if response.status_code == 200:
            token = response.json()["access_token"]
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip("Login failed")
    
    def test_equipment_pdf_report(self):
        """Test equipment PDF report download"""
        response = self.session.get(f"{BASE_URL}/api/reports/equipment/pdf")
        assert response.status_code == 200, f"Equipment PDF failed: {response.status_code} - {response.text[:200] if response.text else 'No content'}"
        assert response.headers.get("content-type", "").startswith("application/pdf") or len(response.content) > 0
        print(f"✓ Equipment PDF report downloaded ({len(response.content)} bytes)")
