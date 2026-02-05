"""
Test suite for IT Inventory System - New Features
Tests:
1. Equipment with hardware specs (processor, RAM, storage, network)
2. Equipment with software info (OS, antivirus)
3. Equipment with credentials (Windows, email, cloud)
4. Maintenance with preventive fields (next_maintenance_date, frequency)
5. Maintenance with corrective fields (diagnosis, solution, repair_time)
6. Invoices with CFDI Mexico format
7. Quotations with RFC and regimen fiscal
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuth:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@inventarioti.com",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        return data["access_token"]
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@inventarioti.com",
            "password": "admin123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == "admin@inventarioti.com"
        print("✓ Login successful")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@email.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Invalid login rejected correctly")


class TestEquipmentHardwareSoftware:
    """Test equipment with new hardware/software/credential fields"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@inventarioti.com",
            "password": "admin123"
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.fixture(scope="class")
    def test_company(self, auth_headers):
        """Create or get test company"""
        # First try to get existing companies
        response = requests.get(f"{BASE_URL}/api/companies", headers=auth_headers)
        companies = response.json()
        if companies:
            return companies[0]
        
        # Create new company if none exists
        response = requests.post(f"{BASE_URL}/api/companies", headers=auth_headers, json={
            "name": "TEST_Company_Hardware",
            "address": "Test Address",
            "phone": "1234567890",
            "email": "test@company.com",
            "tax_id": "TEST123456"
        })
        assert response.status_code == 200
        return response.json()
    
    def test_create_equipment_with_hardware_specs(self, auth_headers, test_company):
        """Test creating equipment with detailed hardware specifications"""
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        equipment_data = {
            "company_id": test_company["id"],
            "inventory_code": f"TEST-HW-{timestamp}",
            "equipment_type": "Laptop",
            "brand": "Dell",
            "model": "Latitude 5520",
            "serial_number": f"SN-HW-{timestamp}",
            "status": "Disponible",
            # Hardware specs - NEW FIELDS
            "processor_brand": "Intel",
            "processor_model": "Core i7-12700",
            "processor_speed": "3.6 GHz",
            "ram_capacity": "16 GB",
            "ram_type": "DDR4",
            "storage_type": "SSD",
            "storage_capacity": "512 GB",
            # Network - NEW FIELDS
            "ip_address": "192.168.1.100",
            "mac_address": "00:1A:2B:3C:4D:5E"
        }
        
        response = requests.post(f"{BASE_URL}/api/equipment", headers=auth_headers, json=equipment_data)
        assert response.status_code == 200, f"Failed to create equipment: {response.text}"
        
        data = response.json()
        # Verify hardware fields are saved
        assert data["processor_brand"] == "Intel"
        assert data["processor_model"] == "Core i7-12700"
        assert data["processor_speed"] == "3.6 GHz"
        assert data["ram_capacity"] == "16 GB"
        assert data["ram_type"] == "DDR4"
        assert data["storage_type"] == "SSD"
        assert data["storage_capacity"] == "512 GB"
        assert data["ip_address"] == "192.168.1.100"
        assert data["mac_address"] == "00:1A:2B:3C:4D:5E"
        print("✓ Equipment with hardware specs created successfully")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/equipment/{data['id']}", headers=auth_headers)
    
    def test_create_equipment_with_software_info(self, auth_headers, test_company):
        """Test creating equipment with software information"""
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        equipment_data = {
            "company_id": test_company["id"],
            "inventory_code": f"TEST-SW-{timestamp}",
            "equipment_type": "Desktop",
            "brand": "HP",
            "model": "ProDesk 400",
            "serial_number": f"SN-SW-{timestamp}",
            "status": "Disponible",
            # Software - NEW FIELDS
            "os_name": "Windows 11 Pro",
            "os_version": "22H2",
            "os_license": "XXXXX-XXXXX-XXXXX-XXXXX-XXXXX",
            "antivirus_name": "Norton 360",
            "antivirus_license": "AV-LICENSE-123",
            "antivirus_expiry": "2025-12-31"
        }
        
        response = requests.post(f"{BASE_URL}/api/equipment", headers=auth_headers, json=equipment_data)
        assert response.status_code == 200, f"Failed to create equipment: {response.text}"
        
        data = response.json()
        # Verify software fields are saved
        assert data["os_name"] == "Windows 11 Pro"
        assert data["os_version"] == "22H2"
        assert data["os_license"] == "XXXXX-XXXXX-XXXXX-XXXXX-XXXXX"
        assert data["antivirus_name"] == "Norton 360"
        assert data["antivirus_license"] == "AV-LICENSE-123"
        assert data["antivirus_expiry"] == "2025-12-31"
        print("✓ Equipment with software info created successfully")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/equipment/{data['id']}", headers=auth_headers)
    
    def test_create_equipment_with_credentials(self, auth_headers, test_company):
        """Test creating equipment with credential fields"""
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        equipment_data = {
            "company_id": test_company["id"],
            "inventory_code": f"TEST-CRED-{timestamp}",
            "equipment_type": "Laptop",
            "brand": "Lenovo",
            "model": "ThinkPad X1",
            "serial_number": f"SN-CRED-{timestamp}",
            "status": "Disponible",
            # Credentials - NEW FIELDS
            "windows_user": "admin_user",
            "windows_password": "SecurePass123!",
            "email_account": "user@company.com",
            "email_password": "EmailPass456!",
            "cloud_user": "cloud_admin",
            "cloud_password": "CloudPass789!"
        }
        
        response = requests.post(f"{BASE_URL}/api/equipment", headers=auth_headers, json=equipment_data)
        assert response.status_code == 200, f"Failed to create equipment: {response.text}"
        
        data = response.json()
        # Verify credential fields are saved
        assert data["windows_user"] == "admin_user"
        assert data["windows_password"] == "SecurePass123!"
        assert data["email_account"] == "user@company.com"
        assert data["email_password"] == "EmailPass456!"
        assert data["cloud_user"] == "cloud_admin"
        assert data["cloud_password"] == "CloudPass789!"
        print("✓ Equipment with credentials created successfully")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/equipment/{data['id']}", headers=auth_headers)


class TestMaintenanceTypes:
    """Test maintenance with preventive and corrective specific fields"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@inventarioti.com",
            "password": "admin123"
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.fixture(scope="class")
    def test_equipment(self, auth_headers):
        """Create test equipment for maintenance tests"""
        # Get or create company
        response = requests.get(f"{BASE_URL}/api/companies", headers=auth_headers)
        companies = response.json()
        if not companies:
            response = requests.post(f"{BASE_URL}/api/companies", headers=auth_headers, json={
                "name": "TEST_Maintenance_Company",
                "address": "Test Address"
            })
            company = response.json()
        else:
            company = companies[0]
        
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        response = requests.post(f"{BASE_URL}/api/equipment", headers=auth_headers, json={
            "company_id": company["id"],
            "inventory_code": f"TEST-MAINT-{timestamp}",
            "equipment_type": "Laptop",
            "brand": "Dell",
            "model": "Test Model",
            "serial_number": f"SN-MAINT-{timestamp}",
            "status": "Disponible"
        })
        assert response.status_code == 200
        equipment = response.json()
        yield equipment
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/equipment/{equipment['id']}", headers=auth_headers)
    
    def test_create_preventive_maintenance(self, auth_headers, test_equipment):
        """Test creating preventive maintenance with specific fields"""
        next_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        maintenance_data = {
            "equipment_id": test_equipment["id"],
            "maintenance_type": "Preventivo",
            "description": "Mantenimiento preventivo mensual",
            "technician": "Juan Técnico",
            # Preventive specific fields - NEW
            "next_maintenance_date": next_date,
            "maintenance_frequency": "Mensual"
        }
        
        response = requests.post(f"{BASE_URL}/api/maintenance", headers=auth_headers, json=maintenance_data)
        assert response.status_code == 200, f"Failed to create maintenance: {response.text}"
        
        data = response.json()
        assert data["maintenance_type"] == "Preventivo"
        assert data["next_maintenance_date"] == next_date
        assert data["maintenance_frequency"] == "Mensual"
        assert data["status"] == "Pendiente"
        print("✓ Preventive maintenance with specific fields created successfully")
    
    def test_create_corrective_maintenance(self, auth_headers, test_equipment):
        """Test creating corrective maintenance with specific fields"""
        maintenance_data = {
            "equipment_id": test_equipment["id"],
            "maintenance_type": "Correctivo",
            "description": "Reparación de pantalla",
            "technician": "Pedro Técnico",
            # Corrective specific fields - NEW
            "problem_diagnosis": "Pantalla con líneas verticales, posible falla de cable flex",
            "solution_applied": "Reemplazo de cable flex de pantalla",
            "repair_time_hours": 2.5,
            "parts_used": "Cable flex LCD, tornillos"
        }
        
        response = requests.post(f"{BASE_URL}/api/maintenance", headers=auth_headers, json=maintenance_data)
        assert response.status_code == 200, f"Failed to create maintenance: {response.text}"
        
        data = response.json()
        assert data["maintenance_type"] == "Correctivo"
        assert data["problem_diagnosis"] == "Pantalla con líneas verticales, posible falla de cable flex"
        assert data["solution_applied"] == "Reemplazo de cable flex de pantalla"
        assert data["repair_time_hours"] == 2.5
        assert data["parts_used"] == "Cable flex LCD, tornillos"
        print("✓ Corrective maintenance with specific fields created successfully")
    
    def test_maintenance_workflow(self, auth_headers, test_equipment):
        """Test maintenance workflow: Create -> Start -> Complete"""
        # Create maintenance
        maintenance_data = {
            "equipment_id": test_equipment["id"],
            "maintenance_type": "Correctivo",
            "description": "Test workflow maintenance",
            "technician": "Test Tech"
        }
        
        response = requests.post(f"{BASE_URL}/api/maintenance", headers=auth_headers, json=maintenance_data)
        assert response.status_code == 200
        maint_id = response.json()["id"]
        
        # Start maintenance
        response = requests.put(f"{BASE_URL}/api/maintenance/{maint_id}/start", headers=auth_headers)
        assert response.status_code == 200
        print("✓ Maintenance started")
        
        # Complete maintenance with solution and repair time
        response = requests.put(
            f"{BASE_URL}/api/maintenance/{maint_id}/complete",
            headers=auth_headers,
            params={
                "notes": "Trabajo completado exitosamente",
                "solution": "Se reemplazó componente defectuoso",
                "repair_time": 1.5
            }
        )
        assert response.status_code == 200
        print("✓ Maintenance completed with solution and repair time")
    
    def test_maintenance_history_pdf(self, auth_headers, test_equipment):
        """Test downloading maintenance history PDF for equipment"""
        response = requests.get(
            f"{BASE_URL}/api/reports/maintenance/{test_equipment['id']}/pdf",
            headers=auth_headers
        )
        assert response.status_code == 200
        assert response.headers.get("content-type") == "application/pdf"
        print("✓ Maintenance history PDF downloaded successfully")


class TestInvoicesCFDI:
    """Test invoices with CFDI Mexico format fields"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@inventarioti.com",
            "password": "admin123"
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.fixture(scope="class")
    def test_company(self, auth_headers):
        """Get or create test company"""
        response = requests.get(f"{BASE_URL}/api/companies", headers=auth_headers)
        companies = response.json()
        if companies:
            return companies[0]
        
        response = requests.post(f"{BASE_URL}/api/companies", headers=auth_headers, json={
            "name": "TEST_Invoice_Company",
            "address": "Test Address",
            "tax_id": "TEST123456"
        })
        return response.json()
    
    def test_create_invoice_with_cfdi_fields(self, auth_headers, test_company):
        """Test creating invoice with CFDI Mexico format fields"""
        invoice_data = {
            "company_id": test_company["id"],
            # Client info
            "client_name": "Cliente Prueba SA de CV",
            "client_email": "cliente@prueba.com",
            "client_phone": "+52 55 1234 5678",
            "client_address": "Av. Reforma 123, CDMX",
            "client_rfc": "CPR010101ABC",  # Required for CFDI
            "client_regimen_fiscal": "601",  # General de Ley Personas Morales
            "client_codigo_postal": "06600",
            # CFDI fields - NEW
            "serie": "A",
            "uso_cfdi": "G03",  # Gastos en general
            "metodo_pago": "PUE",  # Pago en una sola exhibición
            "forma_pago": "03",  # Transferencia electrónica
            "condiciones_pago": "Contado",
            "moneda": "MXN",
            # Items
            "items": [
                {
                    "description": "Servicio de mantenimiento preventivo",
                    "quantity": 1,
                    "unit_price": 5000.00,
                    "discount": 0,
                    "clave_prod_serv": "81112101",  # SAT key
                    "clave_unidad": "E48",
                    "unidad": "Unidad de servicio"
                }
            ],
            "tax_rate": 16.0
        }
        
        response = requests.post(f"{BASE_URL}/api/invoices", headers=auth_headers, json=invoice_data)
        assert response.status_code == 200, f"Failed to create invoice: {response.text}"
        
        data = response.json()
        # Verify CFDI fields
        assert data["client_rfc"] == "CPR010101ABC"
        assert data["client_regimen_fiscal"] == "601"
        assert data["uso_cfdi"] == "G03"
        assert data["metodo_pago"] == "PUE"
        assert data["forma_pago"] == "03"
        assert data["moneda"] == "MXN"
        assert data["status"] == "Pendiente"
        assert data["subtotal"] == 5000.00
        assert data["tax_amount"] == 800.00  # 16% of 5000
        assert data["total"] == 5800.00
        print("✓ Invoice with CFDI fields created successfully")
        
        return data
    
    def test_invoice_status_update(self, auth_headers, test_company):
        """Test updating invoice status to Pagada"""
        # First create an invoice
        invoice_data = {
            "company_id": test_company["id"],
            "client_name": "Test Client",
            "client_rfc": "XAXX010101000",
            "uso_cfdi": "G03",
            "metodo_pago": "PUE",
            "forma_pago": "03",
            "moneda": "MXN",
            "items": [{"description": "Test item", "quantity": 1, "unit_price": 1000}],
            "tax_rate": 16.0
        }
        
        response = requests.post(f"{BASE_URL}/api/invoices", headers=auth_headers, json=invoice_data)
        assert response.status_code == 200
        invoice_id = response.json()["id"]
        
        # Update status to Pagada
        response = requests.put(
            f"{BASE_URL}/api/invoices/{invoice_id}/status",
            headers=auth_headers,
            params={"status": "Pagada"}
        )
        assert response.status_code == 200
        print("✓ Invoice status updated to Pagada")
    
    def test_invoice_pdf_download(self, auth_headers, test_company):
        """Test downloading invoice PDF"""
        # Create invoice first
        invoice_data = {
            "company_id": test_company["id"],
            "client_name": "PDF Test Client",
            "client_rfc": "XAXX010101000",
            "uso_cfdi": "G03",
            "metodo_pago": "PUE",
            "forma_pago": "03",
            "moneda": "MXN",
            "items": [{"description": "PDF Test item", "quantity": 1, "unit_price": 1000}],
            "tax_rate": 16.0
        }
        
        response = requests.post(f"{BASE_URL}/api/invoices", headers=auth_headers, json=invoice_data)
        assert response.status_code == 200
        invoice_id = response.json()["id"]
        
        # Download PDF
        response = requests.get(f"{BASE_URL}/api/invoices/{invoice_id}/pdf", headers=auth_headers)
        assert response.status_code == 200
        assert response.headers.get("content-type") == "application/pdf"
        print("✓ Invoice PDF downloaded successfully")


class TestQuotationsRFC:
    """Test quotations with RFC and regimen fiscal fields"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@inventarioti.com",
            "password": "admin123"
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.fixture(scope="class")
    def test_company(self, auth_headers):
        """Get or create test company"""
        response = requests.get(f"{BASE_URL}/api/companies", headers=auth_headers)
        companies = response.json()
        if companies:
            return companies[0]
        
        response = requests.post(f"{BASE_URL}/api/companies", headers=auth_headers, json={
            "name": "TEST_Quotation_Company",
            "address": "Test Address"
        })
        return response.json()
    
    def test_create_quotation_with_rfc_fields(self, auth_headers, test_company):
        """Test creating quotation with RFC and regimen fiscal fields"""
        quotation_data = {
            "company_id": test_company["id"],
            # Client info with RFC fields - NEW
            "client_name": "Cliente Cotización SA de CV",
            "client_email": "cotizacion@cliente.com",
            "client_phone": "+52 55 9876 5432",
            "client_address": "Av. Insurgentes 456, CDMX",
            "client_rfc": "CCO020202XYZ",  # NEW FIELD
            "client_regimen_fiscal": "612",  # Personas Físicas con Actividades Empresariales - NEW FIELD
            # Items
            "items": [
                {
                    "description": "Laptop Dell Latitude 5520",
                    "quantity": 5,
                    "unit_price": 25000.00,
                    "discount": 10,
                    "clave_prod_serv": "43211503",
                    "clave_unidad": "H87",
                    "unidad": "Pieza"
                },
                {
                    "description": "Servicio de configuración",
                    "quantity": 5,
                    "unit_price": 500.00,
                    "discount": 0
                }
            ],
            "tax_rate": 16.0,
            "valid_days": 30,
            "uso_cfdi": "I04",  # Equipo de cómputo
            "notes": "Cotización válida por 30 días",
            "terms_conditions": "Precios sujetos a cambio sin previo aviso"
        }
        
        response = requests.post(f"{BASE_URL}/api/quotations", headers=auth_headers, json=quotation_data)
        assert response.status_code == 200, f"Failed to create quotation: {response.text}"
        
        data = response.json()
        # Verify RFC fields
        assert data["client_rfc"] == "CCO020202XYZ"
        assert data["client_regimen_fiscal"] == "612"
        assert data["uso_cfdi"] == "I04"
        assert data["status"] == "Pendiente"
        # Verify calculations (5 laptops at 25000 with 10% discount = 112500, plus 5 services at 500 = 2500)
        # Subtotal = 112500 + 2500 = 115000
        assert data["subtotal"] == 115000.00
        print("✓ Quotation with RFC and regimen fiscal created successfully")
        
        return data
    
    def test_quotation_approve(self, auth_headers, test_company):
        """Test approving a quotation"""
        # Create quotation
        quotation_data = {
            "company_id": test_company["id"],
            "client_name": "Approve Test Client",
            "client_rfc": "ATC030303DEF",
            "client_regimen_fiscal": "601",
            "items": [{"description": "Test item", "quantity": 1, "unit_price": 1000}],
            "tax_rate": 16.0,
            "valid_days": 30
        }
        
        response = requests.post(f"{BASE_URL}/api/quotations", headers=auth_headers, json=quotation_data)
        assert response.status_code == 200
        quotation_id = response.json()["id"]
        
        # Approve quotation
        response = requests.put(
            f"{BASE_URL}/api/quotations/{quotation_id}/status",
            headers=auth_headers,
            params={"status": "Aprobada"}
        )
        assert response.status_code == 200
        print("✓ Quotation approved successfully")
    
    def test_quotation_reject(self, auth_headers, test_company):
        """Test rejecting a quotation"""
        # Create quotation
        quotation_data = {
            "company_id": test_company["id"],
            "client_name": "Reject Test Client",
            "client_rfc": "RTC040404GHI",
            "client_regimen_fiscal": "625",
            "items": [{"description": "Test item", "quantity": 1, "unit_price": 1000}],
            "tax_rate": 16.0,
            "valid_days": 30
        }
        
        response = requests.post(f"{BASE_URL}/api/quotations", headers=auth_headers, json=quotation_data)
        assert response.status_code == 200
        quotation_id = response.json()["id"]
        
        # Reject quotation
        response = requests.put(
            f"{BASE_URL}/api/quotations/{quotation_id}/status",
            headers=auth_headers,
            params={"status": "Rechazada"}
        )
        assert response.status_code == 200
        print("✓ Quotation rejected successfully")
    
    def test_quotation_pdf_download(self, auth_headers, test_company):
        """Test downloading quotation PDF"""
        # Create quotation
        quotation_data = {
            "company_id": test_company["id"],
            "client_name": "PDF Test Client",
            "client_rfc": "PTC050505JKL",
            "items": [{"description": "PDF Test item", "quantity": 1, "unit_price": 1000}],
            "tax_rate": 16.0,
            "valid_days": 30
        }
        
        response = requests.post(f"{BASE_URL}/api/quotations", headers=auth_headers, json=quotation_data)
        assert response.status_code == 200
        quotation_id = response.json()["id"]
        
        # Download PDF
        response = requests.get(f"{BASE_URL}/api/quotations/{quotation_id}/pdf", headers=auth_headers)
        assert response.status_code == 200
        assert response.headers.get("content-type") == "application/pdf"
        print("✓ Quotation PDF downloaded successfully")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
