import requests
import sys
from datetime import datetime
import json

class InventoryAPITester:
    def __init__(self, base_url="https://it-inventory-15.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.created_ids = {
            'company': None,
            'branch': None,
            'employee': None,
            'equipment': None,
            'quotation': None,
            'invoice': None,
            'service': None
        }

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json() if response.content else {}
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Response: {response.text}")

            return success, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_login(self):
        """Test login with admin credentials"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": "admin@inventarioti.com", "password": "admin123"}
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            print(f"   Token obtained for user: {response.get('user', {}).get('name', 'Unknown')}")
            return True
        return False

    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        success, response = self.run_test(
            "Dashboard Stats",
            "GET",
            "dashboard/stats",
            200
        )
        if success:
            print(f"   Equipment stats: {response.get('equipment_stats', {})}")
        return success

    def test_companies_crud(self):
        """Test companies CRUD operations"""
        # Create company
        company_data = {
            "name": f"Test Company {datetime.now().strftime('%H%M%S')}",
            "address": "123 Test Street",
            "phone": "+1234567890",
            "email": "test@company.com",
            "tax_id": "12345678901"
        }
        
        success, response = self.run_test(
            "Create Company",
            "POST",
            "companies",
            200,
            data=company_data
        )
        if success:
            self.created_ids['company'] = response.get('id')
            print(f"   Created company ID: {self.created_ids['company']}")

        # Get companies
        self.run_test("Get Companies", "GET", "companies", 200)

        # Update company
        if self.created_ids['company']:
            update_data = {**company_data, "name": "Updated Test Company"}
            self.run_test(
                "Update Company",
                "PUT",
                f"companies/{self.created_ids['company']}",
                200,
                data=update_data
            )

        return success

    def test_branches_crud(self):
        """Test branches CRUD operations"""
        if not self.created_ids['company']:
            print("❌ Skipping branches test - no company created")
            return False

        # Create branch
        branch_data = {
            "company_id": self.created_ids['company'],
            "name": "Main Branch",
            "address": "456 Branch Ave",
            "phone": "+1987654321"
        }
        
        success, response = self.run_test(
            "Create Branch",
            "POST",
            "branches",
            200,
            data=branch_data
        )
        if success:
            self.created_ids['branch'] = response.get('id')
            print(f"   Created branch ID: {self.created_ids['branch']}")

        # Get branches
        self.run_test("Get Branches", "GET", "branches", 200)

        return success

    def test_employees_crud(self):
        """Test employees CRUD operations"""
        if not self.created_ids['company']:
            print("❌ Skipping employees test - no company created")
            return False

        # Create employee
        employee_data = {
            "company_id": self.created_ids['company'],
            "branch_id": self.created_ids['branch'],
            "dni": f"12345{datetime.now().strftime('%H%M%S')}",
            "first_name": "John",
            "last_name": "Doe",
            "position": "IT Specialist",
            "department": "Technology",
            "email": "john.doe@company.com"
        }
        
        success, response = self.run_test(
            "Create Employee",
            "POST",
            "employees",
            200,
            data=employee_data
        )
        if success:
            self.created_ids['employee'] = response.get('id')
            print(f"   Created employee ID: {self.created_ids['employee']}")

        # Get employees
        self.run_test("Get Employees", "GET", "employees", 200)

        return success

    def test_equipment_crud(self):
        """Test equipment CRUD operations"""
        if not self.created_ids['company']:
            print("❌ Skipping equipment test - no company created")
            return False

        # Create equipment
        equipment_data = {
            "company_id": self.created_ids['company'],
            "branch_id": self.created_ids['branch'],
            "inventory_code": f"EQ-{datetime.now().strftime('%H%M%S')}",
            "equipment_type": "Laptop",
            "brand": "Dell",
            "model": "Latitude 5520",
            "serial_number": f"SN{datetime.now().strftime('%H%M%S')}",
            "acquisition_type": "Propio",
            "acquisition_date": "2024-01-15",
            "provider": "Dell Inc",
            "status": "Disponible",
            "observations": "Test equipment"
        }
        
        success, response = self.run_test(
            "Create Equipment",
            "POST",
            "equipment",
            200,
            data=equipment_data
        )
        if success:
            self.created_ids['equipment'] = response.get('id')
            print(f"   Created equipment ID: {self.created_ids['equipment']}")

        # Get equipment
        self.run_test("Get Equipment", "GET", "equipment", 200)

        # Get equipment by ID
        if self.created_ids['equipment']:
            self.run_test(
                "Get Equipment by ID",
                "GET",
                f"equipment/{self.created_ids['equipment']}",
                200
            )

        return success

    def test_equipment_logs(self):
        """Test equipment logs"""
        if not self.created_ids['equipment']:
            print("❌ Skipping equipment logs test - no equipment created")
            return False

        # Create equipment log
        log_data = {
            "equipment_id": self.created_ids['equipment'],
            "log_type": "Mantenimiento",
            "description": "Mantenimiento preventivo realizado",
            "performed_by": None  # Will be set to current user
        }
        
        success, response = self.run_test(
            "Create Equipment Log",
            "POST",
            f"equipment/{self.created_ids['equipment']}/logs",
            200,
            data=log_data
        )

        # Get equipment logs
        self.run_test(
            "Get Equipment Logs",
            "GET",
            f"equipment/{self.created_ids['equipment']}/logs",
            200
        )

        return success

    def test_assignments(self):
        """Test equipment assignments"""
        if not self.created_ids['equipment'] or not self.created_ids['employee']:
            print("❌ Skipping assignments test - missing equipment or employee")
            return False

        # Create assignment
        assignment_data = {
            "equipment_id": self.created_ids['equipment'],
            "employee_id": self.created_ids['employee'],
            "delivery_date": datetime.now().strftime('%Y-%m-%d'),
            "observations": "Test assignment"
        }
        
        success, response = self.run_test(
            "Create Assignment",
            "POST",
            "assignments",
            200,
            data=assignment_data
        )
        
        assignment_id = response.get('id') if success else None

        # Get assignments
        self.run_test("Get Assignments", "GET", "assignments", 200)

        # Return assignment
        if assignment_id:
            self.run_test(
                "Return Assignment",
                "PUT",
                f"assignments/{assignment_id}/return",
                200
            )

        return success

    def test_repairs(self):
        """Test equipment repairs"""
        if not self.created_ids['equipment']:
            print("❌ Skipping repairs test - no equipment created")
            return False

        # Create repair
        repair_data = {
            "equipment_id": self.created_ids['equipment'],
            "reason": "Screen replacement needed",
            "service_provider": "Tech Repair Co",
            "cost": 150.00
        }
        
        success, response = self.run_test(
            "Create Repair",
            "POST",
            "repairs",
            200,
            data=repair_data
        )
        
        repair_id = response.get('id') if success else None

        # Get repairs
        self.run_test("Get Repairs", "GET", "repairs", 200)

        # Finish repair
        if repair_id:
            self.run_test(
                "Finish Repair",
                "PUT",
                f"repairs/{repair_id}/finish",
                200
            )

        return success

    def test_external_services(self):
        """Test external services CRUD"""
        if not self.created_ids['company']:
            print("❌ Skipping external services test - no company created")
            return False

        # Create external service
        service_data = {
            "company_id": self.created_ids['company'],
            "service_type": "Hosting",
            "provider": "AWS",
            "description": "Web hosting service",
            "start_date": "2024-01-01",
            "renewal_date": "2024-12-31",
            "cost": 50.00,
            "payment_frequency": "Mensual",
            "credentials_info": "Access via console"
        }
        
        success, response = self.run_test(
            "Create External Service",
            "POST",
            "external-services",
            200,
            data=service_data
        )
        if success:
            self.created_ids['service'] = response.get('id')

        # Get external services
        self.run_test("Get External Services", "GET", "external-services", 200)

        return success

    def test_quotations(self):
        """Test quotations CRUD"""
        if not self.created_ids['company']:
            print("❌ Skipping quotations test - no company created")
            return False

        # Create quotation
        quotation_data = {
            "company_id": self.created_ids['company'],
            "client_name": "Test Client",
            "client_email": "client@test.com",
            "client_address": "789 Client St",
            "items": [
                {
                    "description": "Laptop Dell Latitude",
                    "quantity": 2,
                    "unit_price": 800.00,
                    "discount": 5.0
                },
                {
                    "description": "Monitor 24 inch",
                    "quantity": 2,
                    "unit_price": 200.00,
                    "discount": 0.0
                }
            ],
            "tax_rate": 18.0,
            "notes": "Test quotation",
            "valid_days": 30
        }
        
        success, response = self.run_test(
            "Create Quotation",
            "POST",
            "quotations",
            200,
            data=quotation_data
        )
        if success:
            self.created_ids['quotation'] = response.get('id')

        # Get quotations
        self.run_test("Get Quotations", "GET", "quotations", 200)

        # Update quotation status
        if self.created_ids['quotation']:
            self.run_test(
                "Update Quotation Status",
                "PUT",
                f"quotations/{self.created_ids['quotation']}/status",
                200,
                params={"status": "Aceptada"}
            )

        return success

    def test_invoices(self):
        """Test invoices CRUD"""
        if not self.created_ids['company']:
            print("❌ Skipping invoices test - no company created")
            return False

        # Create invoice
        invoice_data = {
            "company_id": self.created_ids['company'],
            "quotation_id": self.created_ids['quotation'],
            "client_name": "Test Client",
            "client_email": "client@test.com",
            "client_address": "789 Client St",
            "client_tax_id": "20123456789",
            "items": [
                {
                    "description": "Laptop Dell Latitude",
                    "quantity": 2,
                    "unit_price": 800.00,
                    "discount": 5.0
                }
            ],
            "tax_rate": 18.0,
            "notes": "Test invoice"
        }
        
        success, response = self.run_test(
            "Create Invoice",
            "POST",
            "invoices",
            200,
            data=invoice_data
        )
        if success:
            self.created_ids['invoice'] = response.get('id')

        # Get invoices
        self.run_test("Get Invoices", "GET", "invoices", 200)

        return success

    def test_users_and_roles(self):
        """Test users and roles management"""
        # Get roles
        self.run_test("Get Roles", "GET", "roles", 200)

        # Get users
        self.run_test("Get Users", "GET", "users", 200)

        # Get current user
        self.run_test("Get Current User", "GET", "auth/me", 200)

        return True

    def cleanup(self):
        """Clean up created test data"""
        print("\n🧹 Cleaning up test data...")
        
        # Delete in reverse order of dependencies
        if self.created_ids['service']:
            self.run_test("Delete Service", "DELETE", f"external-services/{self.created_ids['service']}", 200)
        
        if self.created_ids['equipment']:
            self.run_test("Delete Equipment", "DELETE", f"equipment/{self.created_ids['equipment']}", 200)
        
        if self.created_ids['employee']:
            self.run_test("Delete Employee", "DELETE", f"employees/{self.created_ids['employee']}", 200)
        
        if self.created_ids['branch']:
            self.run_test("Delete Branch", "DELETE", f"branches/{self.created_ids['branch']}", 200)
        
        if self.created_ids['company']:
            self.run_test("Delete Company", "DELETE", f"companies/{self.created_ids['company']}", 200)

def main():
    print("🚀 Starting IT Inventory System API Tests")
    print("=" * 50)
    
    tester = InventoryAPITester()
    
    # Test authentication first
    if not tester.test_login():
        print("❌ Login failed, stopping tests")
        return 1

    # Test all modules
    test_results = []
    
    test_results.append(("Dashboard Stats", tester.test_dashboard_stats()))
    test_results.append(("Users & Roles", tester.test_users_and_roles()))
    test_results.append(("Companies CRUD", tester.test_companies_crud()))
    test_results.append(("Branches CRUD", tester.test_branches_crud()))
    test_results.append(("Employees CRUD", tester.test_employees_crud()))
    test_results.append(("Equipment CRUD", tester.test_equipment_crud()))
    test_results.append(("Equipment Logs", tester.test_equipment_logs()))
    test_results.append(("Assignments", tester.test_assignments()))
    test_results.append(("Repairs", tester.test_repairs()))
    test_results.append(("External Services", tester.test_external_services()))
    test_results.append(("Quotations", tester.test_quotations()))
    test_results.append(("Invoices", tester.test_invoices()))

    # Cleanup
    tester.cleanup()

    # Print results
    print("\n" + "=" * 50)
    print("📊 TEST RESULTS SUMMARY")
    print("=" * 50)
    
    for test_name, result in test_results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} {test_name}")
    
    print(f"\n📈 Overall: {tester.tests_passed}/{tester.tests_run} tests passed")
    success_rate = (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0
    print(f"🎯 Success Rate: {success_rate:.1f}%")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())