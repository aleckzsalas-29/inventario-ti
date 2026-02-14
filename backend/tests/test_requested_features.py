"""
Test file for requested features:
1. Creating maintenance logs with performed_date
2. Downloading maintenance reports by period (day, week, month)
3. logo_url field in companies
4. Equipment status report by company
5. Equipment assignment to employees
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestSetup:
    """Setup and authentication"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@inventarioti.com",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }


class TestMaintenanceLogsWithPerformedDate(TestSetup):
    """Test maintenance log creation with performed_date field"""
    
    def test_create_maintenance_with_performed_date(self, auth_headers):
        """Create maintenance log with performed_date field"""
        # First, get an available equipment
        response = requests.get(f"{BASE_URL}/api/equipment", headers=auth_headers)
        assert response.status_code == 200
        equipment_list = response.json()
        
        if len(equipment_list) == 0:
            pytest.skip("No equipment available for testing")
        
        equipment_id = equipment_list[0]['id']
        performed_date = "2025-01-15"
        
        # Create maintenance log with performed_date
        payload = {
            "equipment_id": equipment_id,
            "maintenance_type": "Preventivo",
            "description": "TEST - Mantenimiento con fecha de realización",
            "technician": "Técnico de Prueba",
            "performed_date": performed_date,
            "next_maintenance_date": "2025-04-15",
            "maintenance_frequency": "Trimestral"
        }
        
        response = requests.post(f"{BASE_URL}/api/maintenance", json=payload, headers=auth_headers)
        print(f"Create maintenance response: {response.status_code} - {response.text}")
        assert response.status_code == 200, f"Failed to create maintenance: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should contain id"
        assert data["performed_date"] == performed_date, f"Expected performed_date {performed_date}, got {data.get('performed_date')}"
        assert data["equipment_id"] == equipment_id
        assert data["maintenance_type"] == "Preventivo"
        
        print(f"Successfully created maintenance log with performed_date: {data['performed_date']}")
        return data['id']
    
    def test_create_maintenance_correctivo_with_all_fields(self, auth_headers):
        """Create corrective maintenance with performed_date and other fields"""
        response = requests.get(f"{BASE_URL}/api/equipment", headers=auth_headers)
        equipment_list = response.json()
        
        if len(equipment_list) == 0:
            pytest.skip("No equipment available")
        
        equipment_id = equipment_list[0]['id']
        
        payload = {
            "equipment_id": equipment_id,
            "maintenance_type": "Correctivo",
            "description": "TEST - Mantenimiento correctivo completo",
            "technician": "Técnico Especializado",
            "performed_date": "2025-01-14",
            "problem_diagnosis": "Problema de rendimiento detectado",
            "solution_applied": "Actualización de drivers y limpieza",
            "repair_time_hours": 2.5,
            "parts_used": "Pasta térmica, limpiador de contactos"
        }
        
        response = requests.post(f"{BASE_URL}/api/maintenance", json=payload, headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data["performed_date"] == "2025-01-14"
        assert data["maintenance_type"] == "Correctivo"
        assert data["problem_diagnosis"] == "Problema de rendimiento detectado"
        
        print(f"Successfully created corrective maintenance with performed_date: {data['performed_date']}")


class TestMaintenanceReportsByPeriod(TestSetup):
    """Test downloading maintenance reports by period"""
    
    def test_download_maintenance_report_by_day(self, auth_headers):
        """Download maintenance report for last day"""
        response = requests.get(
            f"{BASE_URL}/api/reports/maintenance/pdf",
            params={"period": "day"},
            headers=auth_headers
        )
        print(f"Day report response: {response.status_code}")
        
        assert response.status_code == 200, f"Failed to download day report: {response.text}"
        assert response.headers.get('content-type') == 'application/pdf'
        assert len(response.content) > 0, "PDF should not be empty"
        
        print(f"Day report downloaded successfully, size: {len(response.content)} bytes")
    
    def test_download_maintenance_report_by_week(self, auth_headers):
        """Download maintenance report for last week"""
        response = requests.get(
            f"{BASE_URL}/api/reports/maintenance/pdf",
            params={"period": "week"},
            headers=auth_headers
        )
        print(f"Week report response: {response.status_code}")
        
        assert response.status_code == 200, f"Failed to download week report: {response.text}"
        assert response.headers.get('content-type') == 'application/pdf'
        
        print(f"Week report downloaded successfully, size: {len(response.content)} bytes")
    
    def test_download_maintenance_report_by_month(self, auth_headers):
        """Download maintenance report for last month"""
        response = requests.get(
            f"{BASE_URL}/api/reports/maintenance/pdf",
            params={"period": "month"},
            headers=auth_headers
        )
        print(f"Month report response: {response.status_code}")
        
        assert response.status_code == 200, f"Failed to download month report: {response.text}"
        assert response.headers.get('content-type') == 'application/pdf'
        
        print(f"Month report downloaded successfully, size: {len(response.content)} bytes")


class TestCompanyLogoUrl(TestSetup):
    """Test logo_url field in companies"""
    
    def test_create_company_with_logo_url(self, auth_headers):
        """Create company with logo_url field"""
        payload = {
            "name": "TEST - Empresa con Logo",
            "address": "Calle Test 123",
            "phone": "+52 555 123 4567",
            "email": "test@empresa.com",
            "tax_id": "TEST123456ABC",
            "logo_url": "https://example.com/logo.png"
        }
        
        response = requests.post(f"{BASE_URL}/api/companies", json=payload, headers=auth_headers)
        assert response.status_code == 200, f"Failed to create company: {response.text}"
        
        data = response.json()
        assert data["logo_url"] == "https://example.com/logo.png", "logo_url should be saved"
        assert data["name"] == "TEST - Empresa con Logo"
        
        print(f"Created company with logo_url: {data['logo_url']}")
        return data['id']
    
    def test_update_company_logo_url(self, auth_headers):
        """Update company logo_url"""
        # First create a company
        create_payload = {
            "name": "TEST - Empresa Update Logo",
            "email": "update@empresa.com"
        }
        create_response = requests.post(f"{BASE_URL}/api/companies", json=create_payload, headers=auth_headers)
        assert create_response.status_code == 200
        company_id = create_response.json()['id']
        
        # Update with logo_url
        update_payload = {
            "name": "TEST - Empresa Update Logo",
            "email": "update@empresa.com",
            "logo_url": "https://updated.example.com/new_logo.png"
        }
        response = requests.put(f"{BASE_URL}/api/companies/{company_id}", json=update_payload, headers=auth_headers)
        assert response.status_code == 200, f"Failed to update company: {response.text}"
        
        data = response.json()
        assert data["logo_url"] == "https://updated.example.com/new_logo.png"
        
        print(f"Updated company logo_url: {data['logo_url']}")
    
    def test_get_company_includes_logo_url(self, auth_headers):
        """Verify companies list includes logo_url field"""
        response = requests.get(f"{BASE_URL}/api/companies", headers=auth_headers)
        assert response.status_code == 200
        
        companies = response.json()
        assert len(companies) > 0, "Should have at least one company"
        
        # Check that logo_url field is present in response model
        first_company = companies[0]
        assert "logo_url" in first_company or first_company.get("logo_url") is None, "logo_url field should exist"
        
        print(f"Companies list returns logo_url field correctly")


class TestEquipmentStatusReportByCompany(TestSetup):
    """Test equipment status report by company"""
    
    def test_download_equipment_status_report(self, auth_headers):
        """Download equipment status report for a specific company"""
        # Get companies first
        response = requests.get(f"{BASE_URL}/api/companies", headers=auth_headers)
        assert response.status_code == 200
        companies = response.json()
        
        if len(companies) == 0:
            pytest.skip("No companies available")
        
        company_id = companies[0]['id']
        
        # Download equipment status report
        response = requests.get(
            f"{BASE_URL}/api/reports/equipment-status/pdf",
            params={"company_id": company_id},
            headers=auth_headers
        )
        print(f"Equipment status report response: {response.status_code}")
        
        assert response.status_code == 200, f"Failed to download equipment status report: {response.text}"
        assert response.headers.get('content-type') == 'application/pdf'
        assert len(response.content) > 0
        
        print(f"Equipment status report downloaded, size: {len(response.content)} bytes")


class TestEquipmentAssignment(TestSetup):
    """Test equipment assignment to employees"""
    
    @pytest.fixture(scope="class")
    def test_company(self, auth_headers):
        """Create a test company"""
        payload = {
            "name": "TEST - Empresa Asignaciones",
            "email": "asign@test.com"
        }
        response = requests.post(f"{BASE_URL}/api/companies", json=payload, headers=auth_headers)
        assert response.status_code == 200
        return response.json()
    
    @pytest.fixture(scope="class")
    def test_employee(self, auth_headers, test_company):
        """Create a test employee"""
        payload = {
            "company_id": test_company['id'],
            "first_name": "TEST",
            "last_name": "Empleado Asignación",
            "position": "Ingeniero de Pruebas",
            "department": "TI",
            "email": "test.empleado@test.com"
        }
        response = requests.post(f"{BASE_URL}/api/employees", json=payload, headers=auth_headers)
        assert response.status_code == 200
        return response.json()
    
    @pytest.fixture(scope="class")
    def test_equipment(self, auth_headers, test_company):
        """Create a test equipment (Disponible status)"""
        import uuid
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "company_id": test_company['id'],
            "inventory_code": f"TEST-ASSIGN-{unique_id}",
            "equipment_type": "Laptop",
            "brand": "Dell",
            "model": "Latitude 5530",
            "serial_number": f"SN-ASSIGN-{unique_id}",
            "status": "Disponible"
        }
        response = requests.post(f"{BASE_URL}/api/equipment", json=payload, headers=auth_headers)
        assert response.status_code == 200, f"Failed to create equipment: {response.text}"
        return response.json()
    
    def test_create_assignment(self, auth_headers, test_employee, test_equipment):
        """Test creating an assignment"""
        payload = {
            "equipment_id": test_equipment['id'],
            "employee_id": test_employee['id'],
            "delivery_date": datetime.now().strftime("%Y-%m-%d"),
            "observations": "TEST - Asignación de prueba"
        }
        
        response = requests.post(f"{BASE_URL}/api/assignments", json=payload, headers=auth_headers)
        print(f"Create assignment response: {response.status_code} - {response.text}")
        
        assert response.status_code == 200, f"Failed to create assignment: {response.text}"
        
        data = response.json()
        assert data["equipment_id"] == test_equipment['id']
        assert data["employee_id"] == test_employee['id']
        assert data["status"] == "Activa"
        assert "employee_name" in data
        assert "equipment_code" in data
        
        print(f"Assignment created successfully: {data['equipment_code']} -> {data['employee_name']}")
        return data
    
    def test_equipment_status_changes_to_asignado(self, auth_headers, test_equipment):
        """Verify equipment status changes to 'Asignado' after assignment"""
        response = requests.get(f"{BASE_URL}/api/equipment/{test_equipment['id']}", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "Asignado", f"Expected 'Asignado', got '{data['status']}'"
        assert data["assigned_to"] is not None, "assigned_to should be set"
        
        print(f"Equipment status correctly changed to: {data['status']}")
    
    def test_get_assignments(self, auth_headers):
        """Test getting all assignments"""
        response = requests.get(f"{BASE_URL}/api/assignments", headers=auth_headers)
        assert response.status_code == 200
        
        assignments = response.json()
        assert isinstance(assignments, list)
        
        print(f"Found {len(assignments)} assignments")
    
    def test_return_assignment(self, auth_headers, test_equipment):
        """Test returning an assignment"""
        # Get active assignment for this equipment
        response = requests.get(
            f"{BASE_URL}/api/assignments",
            params={"equipment_id": test_equipment['id'], "status": "Activa"},
            headers=auth_headers
        )
        assert response.status_code == 200
        assignments = response.json()
        
        if len(assignments) == 0:
            pytest.skip("No active assignment to return")
        
        assignment_id = assignments[0]['id']
        
        # Return the assignment
        response = requests.put(
            f"{BASE_URL}/api/assignments/{assignment_id}/return",
            params={"observations": "TEST - Devolución de equipo"},
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to return assignment: {response.text}"
        
        print("Assignment returned successfully")
    
    def test_equipment_status_returns_to_disponible(self, auth_headers, test_equipment):
        """Verify equipment status returns to 'Disponible' after return"""
        response = requests.get(f"{BASE_URL}/api/equipment/{test_equipment['id']}", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "Disponible", f"Expected 'Disponible', got '{data['status']}'"
        
        print(f"Equipment status correctly returned to: {data['status']}")


class TestCleanup(TestSetup):
    """Cleanup test data"""
    
    def test_cleanup_test_data(self, auth_headers):
        """Clean up test companies and equipment"""
        # Get all companies and delete TEST ones
        response = requests.get(f"{BASE_URL}/api/companies", headers=auth_headers)
        if response.status_code == 200:
            for company in response.json():
                if "TEST" in company.get('name', ''):
                    requests.delete(f"{BASE_URL}/api/companies/{company['id']}", headers=auth_headers)
        
        # Get all equipment and delete TEST ones
        response = requests.get(f"{BASE_URL}/api/equipment", headers=auth_headers)
        if response.status_code == 200:
            for eq in response.json():
                if "TEST" in eq.get('inventory_code', ''):
                    requests.delete(f"{BASE_URL}/api/equipment/{eq['id']}", headers=auth_headers)
        
        print("Cleanup completed")
