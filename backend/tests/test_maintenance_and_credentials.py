"""
Test suite for IT Inventory System - Maintenance and Credentials features
Tests the refactored maintenance module (formerly repairs) and equipment credentials
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuth:
    """Authentication tests"""
    
    def test_login_success(self):
        """Test admin login with correct credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@inventarioti.com",
            "password": "admin123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == "admin@inventarioti.com"
        assert data["user"]["role_name"] == "Administrador"
    
    def test_login_invalid_credentials(self):
        """Test login with wrong credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@email.com",
            "password": "wrongpass"
        })
        assert response.status_code == 401


class TestDashboard:
    """Dashboard tests - verify 'En Mantenimiento' terminology"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@inventarioti.com",
            "password": "admin123"
        })
        return response.json()["access_token"]
    
    def test_dashboard_stats(self, auth_token):
        """Test dashboard stats endpoint returns correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/stats",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify equipment stats structure
        assert "equipment" in data
        assert "total" in data["equipment"]
        assert "available" in data["equipment"]
        assert "assigned" in data["equipment"]
        assert "in_maintenance" in data["equipment"]  # Changed from in_repair
        assert "decommissioned" in data["equipment"]
        
        # Verify other stats
        assert "pending_maintenance" in data  # Changed from pending_repairs
        assert "companies" in data
        assert "employees" in data


class TestMaintenanceAPI:
    """Maintenance API tests (formerly Repairs)"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@inventarioti.com",
            "password": "admin123"
        })
        return response.json()["access_token"]
    
    @pytest.fixture
    def equipment_id(self, auth_token):
        """Get first available equipment ID"""
        response = requests.get(
            f"{BASE_URL}/api/equipment",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        equipment = response.json()
        if equipment:
            return equipment[0]["id"]
        return None
    
    def test_get_maintenance_logs(self, auth_token):
        """Test GET /api/maintenance returns list"""
        response = requests.get(
            f"{BASE_URL}/api/maintenance",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_create_maintenance_preventivo(self, auth_token, equipment_id):
        """Test creating maintenance log with type Preventivo"""
        if not equipment_id:
            pytest.skip("No equipment available")
        
        response = requests.post(
            f"{BASE_URL}/api/maintenance",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "equipment_id": equipment_id,
                "maintenance_type": "Preventivo",
                "description": "TEST_Mantenimiento preventivo programado",
                "technician": "TEST_Técnico"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["maintenance_type"] == "Preventivo"
        assert data["status"] == "Pendiente"
        assert "id" in data
        return data["id"]
    
    def test_create_maintenance_correctivo(self, auth_token, equipment_id):
        """Test creating maintenance log with type Correctivo"""
        if not equipment_id:
            pytest.skip("No equipment available")
        
        response = requests.post(
            f"{BASE_URL}/api/maintenance",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "equipment_id": equipment_id,
                "maintenance_type": "Correctivo",
                "description": "TEST_Mantenimiento correctivo - falla detectada"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["maintenance_type"] == "Correctivo"
    
    def test_create_maintenance_reparacion(self, auth_token, equipment_id):
        """Test creating maintenance log with type Reparacion"""
        if not equipment_id:
            pytest.skip("No equipment available")
        
        response = requests.post(
            f"{BASE_URL}/api/maintenance",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "equipment_id": equipment_id,
                "maintenance_type": "Reparacion",
                "description": "TEST_Reparación de componente"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["maintenance_type"] == "Reparacion"
    
    def test_create_maintenance_otro(self, auth_token, equipment_id):
        """Test creating maintenance log with type Otro"""
        if not equipment_id:
            pytest.skip("No equipment available")
        
        response = requests.post(
            f"{BASE_URL}/api/maintenance",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "equipment_id": equipment_id,
                "maintenance_type": "Otro",
                "description": "TEST_Otro tipo de mantenimiento"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["maintenance_type"] == "Otro"
    
    def test_maintenance_workflow_start_complete(self, auth_token, equipment_id):
        """Test full maintenance workflow: create -> start -> complete"""
        if not equipment_id:
            pytest.skip("No equipment available")
        
        # Create maintenance
        create_response = requests.post(
            f"{BASE_URL}/api/maintenance",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "equipment_id": equipment_id,
                "maintenance_type": "Preventivo",
                "description": "TEST_Workflow test maintenance"
            }
        )
        assert create_response.status_code == 200
        maintenance_id = create_response.json()["id"]
        
        # Start maintenance
        start_response = requests.put(
            f"{BASE_URL}/api/maintenance/{maintenance_id}/start",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert start_response.status_code == 200
        assert start_response.json()["message"] == "Mantenimiento iniciado"
        
        # Complete maintenance
        complete_response = requests.put(
            f"{BASE_URL}/api/maintenance/{maintenance_id}/complete",
            headers={"Authorization": f"Bearer {auth_token}"},
            params={"notes": "TEST_Completado exitosamente"}
        )
        assert complete_response.status_code == 200
        assert complete_response.json()["message"] == "Mantenimiento finalizado"
    
    def test_filter_maintenance_by_type(self, auth_token):
        """Test filtering maintenance logs by type"""
        response = requests.get(
            f"{BASE_URL}/api/maintenance",
            headers={"Authorization": f"Bearer {auth_token}"},
            params={"maintenance_type": "Preventivo"}
        )
        assert response.status_code == 200
        logs = response.json()
        for log in logs:
            assert log["maintenance_type"] == "Preventivo"
    
    def test_filter_maintenance_by_status(self, auth_token):
        """Test filtering maintenance logs by status"""
        response = requests.get(
            f"{BASE_URL}/api/maintenance",
            headers={"Authorization": f"Bearer {auth_token}"},
            params={"status": "Finalizado"}
        )
        assert response.status_code == 200
        logs = response.json()
        for log in logs:
            assert log["status"] == "Finalizado"


class TestEquipmentCredentials:
    """Equipment credentials tests"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@inventarioti.com",
            "password": "admin123"
        })
        return response.json()["access_token"]
    
    @pytest.fixture
    def company_id(self, auth_token):
        """Get first company ID"""
        response = requests.get(
            f"{BASE_URL}/api/companies",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        companies = response.json()
        if companies:
            return companies[0]["id"]
        return None
    
    def test_create_equipment_with_credentials(self, auth_token, company_id):
        """Test creating equipment with all credential fields"""
        if not company_id:
            pytest.skip("No company available")
        
        import uuid
        unique_code = f"TEST-CRED-{uuid.uuid4().hex[:6]}"
        
        response = requests.post(
            f"{BASE_URL}/api/equipment",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "company_id": company_id,
                "inventory_code": unique_code,
                "equipment_type": "Desktop",
                "brand": "Dell",
                "model": "OptiPlex 7090",
                "serial_number": f"SN-{unique_code}",
                "acquisition_type": "Propio",
                "windows_user": "TEST_admin_local",
                "windows_password": "TEST_WinPass123!",
                "email_account": "TEST_user@empresa.com",
                "email_password": "TEST_EmailPass456!",
                "cloud_user": "TEST_cloud_admin",
                "cloud_password": "TEST_CloudPass789!"
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify credential fields are saved
        assert data["windows_user"] == "TEST_admin_local"
        assert data["windows_password"] == "TEST_WinPass123!"
        assert data["email_account"] == "TEST_user@empresa.com"
        assert data["email_password"] == "TEST_EmailPass456!"
        assert data["cloud_user"] == "TEST_cloud_admin"
        assert data["cloud_password"] == "TEST_CloudPass789!"
        
        return data["id"]
    
    def test_get_equipment_with_credentials(self, auth_token, company_id):
        """Test retrieving equipment shows credential fields"""
        if not company_id:
            pytest.skip("No company available")
        
        # First create equipment with credentials
        import uuid
        unique_code = f"TEST-GET-{uuid.uuid4().hex[:6]}"
        
        create_response = requests.post(
            f"{BASE_URL}/api/equipment",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "company_id": company_id,
                "inventory_code": unique_code,
                "equipment_type": "Laptop",
                "brand": "HP",
                "model": "EliteBook",
                "serial_number": f"SN-{unique_code}",
                "acquisition_type": "Propio",
                "windows_user": "TEST_hp_user",
                "windows_password": "TEST_HpPass123"
            }
        )
        equipment_id = create_response.json()["id"]
        
        # Get equipment by ID
        get_response = requests.get(
            f"{BASE_URL}/api/equipment/{equipment_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert get_response.status_code == 200
        data = get_response.json()
        
        assert data["windows_user"] == "TEST_hp_user"
        assert data["windows_password"] == "TEST_HpPass123"
    
    def test_update_equipment_credentials(self, auth_token, company_id):
        """Test updating equipment credential fields"""
        if not company_id:
            pytest.skip("No company available")
        
        # First create equipment
        import uuid
        unique_code = f"TEST-UPD-{uuid.uuid4().hex[:6]}"
        
        create_response = requests.post(
            f"{BASE_URL}/api/equipment",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "company_id": company_id,
                "inventory_code": unique_code,
                "equipment_type": "Desktop",
                "brand": "Lenovo",
                "model": "ThinkCentre",
                "serial_number": f"SN-{unique_code}",
                "acquisition_type": "Propio",
                "windows_user": "old_user",
                "windows_password": "old_pass"
            }
        )
        equipment_id = create_response.json()["id"]
        
        # Update credentials
        update_response = requests.put(
            f"{BASE_URL}/api/equipment/{equipment_id}",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "company_id": company_id,
                "inventory_code": unique_code,
                "equipment_type": "Desktop",
                "brand": "Lenovo",
                "model": "ThinkCentre",
                "serial_number": f"SN-{unique_code}",
                "acquisition_type": "Propio",
                "windows_user": "TEST_new_user",
                "windows_password": "TEST_NewPass123!",
                "email_account": "TEST_new@email.com",
                "email_password": "TEST_NewEmail456!"
            }
        )
        assert update_response.status_code == 200
        data = update_response.json()
        
        assert data["windows_user"] == "TEST_new_user"
        assert data["windows_password"] == "TEST_NewPass123!"
        assert data["email_account"] == "TEST_new@email.com"
        assert data["email_password"] == "TEST_NewEmail456!"


class TestEquipmentAPI:
    """General equipment API tests"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@inventarioti.com",
            "password": "admin123"
        })
        return response.json()["access_token"]
    
    def test_get_equipment_list(self, auth_token):
        """Test GET /api/equipment returns list"""
        response = requests.get(
            f"{BASE_URL}/api/equipment",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_equipment_status_options(self, auth_token):
        """Verify equipment can have 'En Mantenimiento' status"""
        response = requests.get(
            f"{BASE_URL}/api/equipment",
            headers={"Authorization": f"Bearer {auth_token}"},
            params={"status": "En Mantenimiento"}
        )
        assert response.status_code == 200
        # Should not error even if no equipment in maintenance


class TestCleanup:
    """Cleanup test data"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@inventarioti.com",
            "password": "admin123"
        })
        return response.json()["access_token"]
    
    def test_cleanup_test_equipment(self, auth_token):
        """Clean up TEST_ prefixed equipment"""
        response = requests.get(
            f"{BASE_URL}/api/equipment",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        equipment_list = response.json()
        
        deleted_count = 0
        for eq in equipment_list:
            if eq["inventory_code"].startswith("TEST-"):
                delete_response = requests.delete(
                    f"{BASE_URL}/api/equipment/{eq['id']}",
                    headers={"Authorization": f"Bearer {auth_token}"}
                )
                if delete_response.status_code == 200:
                    deleted_count += 1
        
        print(f"Cleaned up {deleted_count} test equipment records")
        assert True  # Always pass cleanup


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
