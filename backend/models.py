from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional, Dict, Any


# ==================== AUTH MODELS ====================

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role_id: Optional[str] = None
    company_id: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    name: str
    role_id: Optional[str] = None
    role_name: Optional[str] = None
    company_id: Optional[str] = None
    company_name: Optional[str] = None
    is_active: bool = True
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class RoleCreate(BaseModel):
    name: str
    permissions: List[str] = []
    description: Optional[str] = None

class RoleResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    permissions: List[str]
    description: Optional[str] = None
    is_system: bool = False


# ==================== CUSTOM FIELDS MODELS ====================

class CustomFieldValidation(BaseModel):
    min_length: Optional[int] = None
    max_length: Optional[int] = None
    regex_pattern: Optional[str] = None
    regex_message: Optional[str] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    min_date: Optional[str] = None
    max_date: Optional[str] = None

class CustomFieldCreate(BaseModel):
    entity_type: str
    name: str
    field_type: str
    options: Optional[List[str]] = None
    required: bool = False
    category: Optional[str] = None
    validation: Optional[CustomFieldValidation] = None
    placeholder: Optional[str] = None
    help_text: Optional[str] = None

class CustomFieldResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    entity_type: str
    name: str
    field_type: str
    options: Optional[List[str]] = None
    required: bool = False
    category: Optional[str] = None
    validation: Optional[Dict[str, Any]] = None
    placeholder: Optional[str] = None
    help_text: Optional[str] = None
    is_active: bool = True


# ==================== COMPANY MODELS ====================

class CompanyCreate(BaseModel):
    name: str
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    tax_id: Optional[str] = None
    logo_url: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = None

class CompanyResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    tax_id: Optional[str] = None
    logo_url: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = None
    is_active: bool = True
    created_at: str

class BranchCreate(BaseModel):
    company_id: str
    name: str
    address: Optional[str] = None
    phone: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = None

class BranchResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    company_id: str
    company_name: Optional[str] = None
    name: str
    address: Optional[str] = None
    phone: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = None
    is_active: bool = True


# ==================== EMPLOYEE MODELS ====================

class EmployeeCreate(BaseModel):
    company_id: str
    branch_id: Optional[str] = None
    dni: Optional[str] = None
    first_name: str
    last_name: str
    position: Optional[str] = None
    department: Optional[str] = None
    email: Optional[EmailStr] = None
    custom_fields: Optional[Dict[str, Any]] = None

class EmployeeResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    company_id: str
    company_name: Optional[str] = None
    branch_id: Optional[str] = None
    branch_name: Optional[str] = None
    dni: Optional[str] = None
    first_name: str
    last_name: str
    full_name: Optional[str] = None
    position: Optional[str] = None
    department: Optional[str] = None
    email: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = None
    is_active: bool = True
    created_at: str


# ==================== EQUIPMENT MODELS ====================

class EquipmentCreate(BaseModel):
    company_id: str
    branch_id: Optional[str] = None
    inventory_code: str
    equipment_type: str
    brand: str
    model: str
    serial_number: str
    status: str = "Disponible"
    observations: Optional[str] = None
    processor_brand: Optional[str] = None
    processor_model: Optional[str] = None
    processor_speed: Optional[str] = None
    ram_capacity: Optional[str] = None
    ram_type: Optional[str] = None
    storage_type: Optional[str] = None
    storage_capacity: Optional[str] = None
    os_name: Optional[str] = None
    os_version: Optional[str] = None
    os_license: Optional[str] = None
    antivirus_name: Optional[str] = None
    antivirus_license: Optional[str] = None
    antivirus_expiry: Optional[str] = None
    ip_address: Optional[str] = None
    mac_address: Optional[str] = None
    windows_user: Optional[str] = None
    windows_password: Optional[str] = None
    email_account: Optional[str] = None
    email_password: Optional[str] = None
    cloud_user: Optional[str] = None
    cloud_password: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = None
    assigned_to: Optional[str] = None

class EquipmentResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    company_id: str
    company_name: Optional[str] = None
    branch_id: Optional[str] = None
    branch_name: Optional[str] = None
    inventory_code: str
    equipment_type: str
    brand: str
    model: str
    serial_number: str
    status: str
    observations: Optional[str] = None
    processor_brand: Optional[str] = None
    processor_model: Optional[str] = None
    processor_speed: Optional[str] = None
    ram_capacity: Optional[str] = None
    ram_type: Optional[str] = None
    storage_type: Optional[str] = None
    storage_capacity: Optional[str] = None
    os_name: Optional[str] = None
    os_version: Optional[str] = None
    os_license: Optional[str] = None
    antivirus_name: Optional[str] = None
    antivirus_license: Optional[str] = None
    antivirus_expiry: Optional[str] = None
    ip_address: Optional[str] = None
    mac_address: Optional[str] = None
    windows_user: Optional[str] = None
    windows_password: Optional[str] = None
    email_account: Optional[str] = None
    email_password: Optional[str] = None
    cloud_user: Optional[str] = None
    cloud_password: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = None
    assigned_to: Optional[str] = None
    assigned_employee_name: Optional[str] = None
    created_at: str

class EquipmentLogCreate(BaseModel):
    equipment_id: str
    log_type: str
    description: str
    performed_by: Optional[str] = None

class EquipmentLogResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    equipment_id: str
    log_type: str
    description: str
    performed_by: Optional[str] = None
    performed_by_name: Optional[str] = None
    created_at: str


# ==================== ASSIGNMENT MODELS ====================

class AssignmentCreate(BaseModel):
    equipment_id: str
    employee_id: str
    delivery_date: str
    observations: Optional[str] = None

class AssignmentResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    equipment_id: str
    equipment_code: Optional[str] = None
    equipment_type: Optional[str] = None
    employee_id: str
    employee_name: Optional[str] = None
    delivery_date: str
    return_date: Optional[str] = None
    status: str
    observations: Optional[str] = None
    return_observations: Optional[str] = None
    created_at: str


# ==================== MAINTENANCE MODELS ====================

class MaintenanceLogCreate(BaseModel):
    equipment_id: str
    maintenance_type: str
    description: str
    technician: Optional[str] = None
    performed_date: Optional[str] = None
    checklist_items: Optional[List[str]] = None
    checklist_results: Optional[Dict[str, bool]] = None
    next_maintenance_date: Optional[str] = None
    maintenance_frequency: Optional[str] = None
    problem_diagnosis: Optional[str] = None
    solution_applied: Optional[str] = None
    repair_time_hours: Optional[float] = None
    parts_used: Optional[str] = None
    parts_replaced: Optional[List[str]] = None
    custom_fields: Optional[Dict[str, Any]] = None

class MaintenanceLogResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    equipment_id: str
    equipment_code: Optional[str] = None
    equipment_type: Optional[str] = None
    equipment_brand: Optional[str] = None
    maintenance_type: str
    description: str
    technician: Optional[str] = None
    performed_date: Optional[str] = None
    checklist_items: Optional[List[str]] = None
    checklist_results: Optional[Dict[str, bool]] = None
    next_maintenance_date: Optional[str] = None
    maintenance_frequency: Optional[str] = None
    problem_diagnosis: Optional[str] = None
    solution_applied: Optional[str] = None
    repair_time_hours: Optional[float] = None
    parts_used: Optional[str] = None
    parts_replaced: Optional[List[str]] = None
    custom_fields: Optional[Dict[str, Any]] = None
    status: str
    created_at: str
    completed_at: Optional[str] = None
    performed_by: Optional[str] = None
    performed_by_name: Optional[str] = None


# ==================== DECOMMISSION MODELS ====================

class DecommissionCreate(BaseModel):
    equipment_id: str
    reason: str
    description: Optional[str] = None

class DecommissionResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    equipment_id: str
    equipment_code: Optional[str] = None
    decommission_date: str
    reason: str
    description: Optional[str] = None
    responsible_user_id: Optional[str] = None
    responsible_user_name: Optional[str] = None


# ==================== EXTERNAL SERVICE MODELS ====================

class ExternalServiceCreate(BaseModel):
    company_id: str
    service_type: str
    provider: str
    description: Optional[str] = None
    start_date: str
    renewal_date: Optional[str] = None
    payment_frequency: Optional[str] = None
    credentials_info: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = None

class ExternalServiceResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    company_id: str
    company_name: Optional[str] = None
    service_type: str
    provider: str
    description: Optional[str] = None
    start_date: str
    renewal_date: Optional[str] = None
    payment_frequency: Optional[str] = None
    credentials_info: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = None
    is_active: bool = True
    created_at: str


# ==================== SETTINGS MODELS ====================

class SystemSettings(BaseModel):
    company_name: Optional[str] = None
    logo_url: Optional[str] = None
    primary_color: Optional[str] = "#3b82f6"
    login_background_url: Optional[str] = None
    login_title: Optional[str] = None
    login_subtitle: Optional[str] = None

class NotificationSettings(BaseModel):
    enabled: bool = True
    auto_send_enabled: bool = False
    send_time: str = "08:00"
    service_renewal_enabled: bool = True
    service_renewal_days: int = 30
    maintenance_pending_enabled: bool = True
    maintenance_completed_enabled: bool = True
    new_equipment_enabled: bool = True
    recipient_type: str = "all_users"
    custom_recipients: Optional[List[str]] = None


# ==================== FINANCE MODELS (CFDI) ====================

class CFDIItemCreate(BaseModel):
    description: str
    quantity: float = 1
    unit_price: float
    discount: float = 0.0
    clave_prod_serv: Optional[str] = None
    clave_unidad: Optional[str] = None
    unidad: Optional[str] = None

class QuotationCreate(BaseModel):
    company_id: str
    client_name: str
    client_email: Optional[EmailStr] = None
    client_phone: Optional[str] = None
    client_address: Optional[str] = None
    client_rfc: Optional[str] = None
    client_regimen_fiscal: Optional[str] = None
    items: List[CFDIItemCreate]
    tax_rate: float = 16.0
    notes: Optional[str] = None
    terms_conditions: Optional[str] = None
    valid_days: int = 30
    uso_cfdi: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = None

class QuotationResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    quotation_number: str
    company_id: str
    company_name: Optional[str] = None
    client_name: str
    client_email: Optional[str] = None
    client_phone: Optional[str] = None
    client_address: Optional[str] = None
    client_rfc: Optional[str] = None
    client_regimen_fiscal: Optional[str] = None
    items: List[Dict[str, Any]]
    subtotal: float
    tax_rate: float
    tax_amount: float
    total: float
    notes: Optional[str] = None
    terms_conditions: Optional[str] = None
    valid_until: str
    status: str
    uso_cfdi: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = None
    created_at: str

class InvoiceCreate(BaseModel):
    company_id: str
    quotation_id: Optional[str] = None
    client_name: str
    client_email: Optional[EmailStr] = None
    client_phone: Optional[str] = None
    client_address: Optional[str] = None
    client_rfc: str
    client_regimen_fiscal: Optional[str] = None
    client_codigo_postal: Optional[str] = None
    serie: Optional[str] = None
    uso_cfdi: str = "G03"
    metodo_pago: str = "PUE"
    forma_pago: str = "03"
    condiciones_pago: Optional[str] = None
    moneda: str = "MXN"
    tipo_cambio: Optional[float] = None
    items: List[CFDIItemCreate]
    tax_rate: float = 16.0
    notes: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = None

class InvoiceResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    invoice_number: str
    serie: Optional[str] = None
    folio: Optional[str] = None
    company_id: str
    company_name: Optional[str] = None
    quotation_id: Optional[str] = None
    client_name: str
    client_email: Optional[str] = None
    client_phone: Optional[str] = None
    client_address: Optional[str] = None
    client_rfc: Optional[str] = None
    client_regimen_fiscal: Optional[str] = None
    client_codigo_postal: Optional[str] = None
    uso_cfdi: Optional[str] = None
    metodo_pago: Optional[str] = None
    forma_pago: Optional[str] = None
    condiciones_pago: Optional[str] = None
    moneda: Optional[str] = None
    tipo_cambio: Optional[float] = None
    items: List[Dict[str, Any]]
    subtotal: float
    tax_rate: float
    tax_amount: float
    total: float
    notes: Optional[str] = None
    status: str
    uuid_fiscal: Optional[str] = None
    fecha_timbrado: Optional[str] = None
    sello_sat: Optional[str] = None
    sello_cfdi: Optional[str] = None
    cadena_original: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = None
    created_at: str


# ==================== NOTIFICATION REQUEST MODELS ====================

class EmailSendRequest(BaseModel):
    recipient_email: EmailStr
    subject: str
    html_content: str

class NotificationSendRequest(BaseModel):
    notification_type: str
    recipient_emails: Optional[List[str]] = None

class EmailTestRequest(BaseModel):
    recipient_email: EmailStr
