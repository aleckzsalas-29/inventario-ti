from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Response, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import asyncio
from fpdf import FPDF
import io
import base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ.get('JWT_SECRET', 'inventario-ti-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

app = FastAPI(title="Inventario TI API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

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

# Custom Fields for any entity
class CustomFieldCreate(BaseModel):
    entity_type: str  # company, branch, employee, equipment, service, quotation, invoice
    name: str
    field_type: str  # text, number, date, select, boolean, password
    options: Optional[List[str]] = None
    required: bool = False
    category: Optional[str] = None

class CustomFieldResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    entity_type: str
    name: str
    field_type: str
    options: Optional[List[str]] = None
    required: bool = False
    category: Optional[str] = None
    is_active: bool = True

class CompanyCreate(BaseModel):
    name: str
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    tax_id: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = None

class CompanyResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    tax_id: Optional[str] = None
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

class EmployeeCreate(BaseModel):
    company_id: str
    branch_id: Optional[str] = None
    dni: str
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
    dni: str
    first_name: str
    last_name: str
    full_name: Optional[str] = None
    position: Optional[str] = None
    department: Optional[str] = None
    email: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = None
    is_active: bool = True
    created_at: str

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
    # Hardware specifications
    processor_brand: Optional[str] = None
    processor_model: Optional[str] = None
    processor_speed: Optional[str] = None
    ram_capacity: Optional[str] = None
    ram_type: Optional[str] = None
    storage_type: Optional[str] = None
    storage_capacity: Optional[str] = None
    # Software
    os_name: Optional[str] = None
    os_version: Optional[str] = None
    os_license: Optional[str] = None
    antivirus_name: Optional[str] = None
    antivirus_license: Optional[str] = None
    antivirus_expiry: Optional[str] = None
    # Network
    ip_address: Optional[str] = None
    mac_address: Optional[str] = None
    # Credential fields
    windows_user: Optional[str] = None
    windows_password: Optional[str] = None
    email_account: Optional[str] = None
    email_password: Optional[str] = None
    cloud_user: Optional[str] = None
    cloud_password: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = None

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
    # Hardware specifications
    processor_brand: Optional[str] = None
    processor_model: Optional[str] = None
    processor_speed: Optional[str] = None
    ram_capacity: Optional[str] = None
    ram_type: Optional[str] = None
    storage_type: Optional[str] = None
    storage_capacity: Optional[str] = None
    # Software
    os_name: Optional[str] = None
    os_version: Optional[str] = None
    os_license: Optional[str] = None
    antivirus_name: Optional[str] = None
    antivirus_license: Optional[str] = None
    antivirus_expiry: Optional[str] = None
    # Network
    ip_address: Optional[str] = None
    mac_address: Optional[str] = None
    # Credentials
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

# Maintenance Log (replaces Repairs)
class MaintenanceLogCreate(BaseModel):
    equipment_id: str
    maintenance_type: str  # Preventivo, Correctivo, Reparacion, Otro
    description: str
    technician: Optional[str] = None
    # Preventive maintenance fields
    checklist_items: Optional[List[str]] = None
    checklist_results: Optional[Dict[str, bool]] = None
    next_maintenance_date: Optional[str] = None
    maintenance_frequency: Optional[str] = None  # Mensual, Trimestral, Semestral, Anual
    # Corrective maintenance fields
    problem_diagnosis: Optional[str] = None
    solution_applied: Optional[str] = None
    repair_time_hours: Optional[float] = None
    # Parts/materials
    parts_used: Optional[str] = None
    parts_replaced: Optional[List[str]] = None
    # Custom fields
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
    # Preventive fields
    checklist_items: Optional[List[str]] = None
    checklist_results: Optional[Dict[str, bool]] = None
    next_maintenance_date: Optional[str] = None
    maintenance_frequency: Optional[str] = None
    # Corrective fields
    problem_diagnosis: Optional[str] = None
    solution_applied: Optional[str] = None
    repair_time_hours: Optional[float] = None
    # Parts
    parts_used: Optional[str] = None
    parts_replaced: Optional[List[str]] = None
    custom_fields: Optional[Dict[str, Any]] = None
    status: str  # Pendiente, En Proceso, Finalizado
    created_at: str
    completed_at: Optional[str] = None
    performed_by: Optional[str] = None
    performed_by_name: Optional[str] = None

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

# CFDI Item for Mexico invoicing
class CFDIItemCreate(BaseModel):
    description: str
    quantity: float = 1
    unit_price: float
    discount: float = 0.0
    clave_prod_serv: Optional[str] = None  # SAT product/service key
    clave_unidad: Optional[str] = None  # SAT unit key (E48=Unidad, H87=Pieza, etc.)
    unidad: Optional[str] = None  # Unit description

class QuotationCreate(BaseModel):
    company_id: str
    # Client info
    client_name: str
    client_email: Optional[EmailStr] = None
    client_phone: Optional[str] = None
    client_address: Optional[str] = None
    client_rfc: Optional[str] = None
    client_regimen_fiscal: Optional[str] = None
    # Items and totals
    items: List[CFDIItemCreate]
    tax_rate: float = 16.0  # Default IVA Mexico
    notes: Optional[str] = None
    terms_conditions: Optional[str] = None
    valid_days: int = 30
    # CFDI fields for conversion to invoice
    uso_cfdi: Optional[str] = None  # G01, G03, P01, etc.
    custom_fields: Optional[Dict[str, Any]] = None

class QuotationResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    quotation_number: str
    company_id: str
    company_name: Optional[str] = None
    # Client info
    client_name: str
    client_email: Optional[str] = None
    client_phone: Optional[str] = None
    client_address: Optional[str] = None
    client_rfc: Optional[str] = None
    client_regimen_fiscal: Optional[str] = None
    # Items and totals
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
    # Client info (receptor)
    client_name: str
    client_email: Optional[EmailStr] = None
    client_phone: Optional[str] = None
    client_address: Optional[str] = None
    client_rfc: str  # Required for CFDI
    client_regimen_fiscal: Optional[str] = None
    client_codigo_postal: Optional[str] = None
    # CFDI Mexico fields
    serie: Optional[str] = None
    uso_cfdi: str = "G03"  # Default: Gastos en general
    metodo_pago: str = "PUE"  # PUE=Pago en una sola exhibición, PPD=Pago en parcialidades
    forma_pago: str = "03"  # 01=Efectivo, 03=Transferencia, 04=Tarjeta crédito, etc.
    condiciones_pago: Optional[str] = None
    moneda: str = "MXN"
    tipo_cambio: Optional[float] = None
    # Items
    items: List[CFDIItemCreate]
    tax_rate: float = 16.0  # IVA default
    # Additional
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
    # Client info
    client_name: str
    client_email: Optional[str] = None
    client_phone: Optional[str] = None
    client_address: Optional[str] = None
    client_rfc: Optional[str] = None
    client_regimen_fiscal: Optional[str] = None
    client_codigo_postal: Optional[str] = None
    # CFDI fields
    uso_cfdi: Optional[str] = None
    metodo_pago: Optional[str] = None
    forma_pago: Optional[str] = None
    condiciones_pago: Optional[str] = None
    moneda: Optional[str] = None
    tipo_cambio: Optional[float] = None
    # Items and totals
    items: List[Dict[str, Any]]
    subtotal: float
    tax_rate: float
    tax_amount: float
    total: float
    notes: Optional[str] = None
    status: str
    # Timbrado (after PAC integration)
    uuid_fiscal: Optional[str] = None
    fecha_timbrado: Optional[str] = None
    sello_sat: Optional[str] = None
    sello_cfdi: Optional[str] = None
    cadena_original: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = None
    created_at: str

class EmailNotificationRequest(BaseModel):
    recipient_email: EmailStr
    subject: str
    html_content: str

# ==================== HELPER FUNCTIONS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, email: str, role_id: str = None) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "role_id": role_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="Usuario no encontrado")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")

async def check_permission(user: dict, permission: str):
    if user.get("role_id"):
        role = await db.roles.find_one({"id": user["role_id"]}, {"_id": 0})
        if role and (permission in role.get("permissions", []) or "admin" in role.get("permissions", [])):
            return True
    raise HTTPException(status_code=403, detail="No tiene permisos para esta acción")

def generate_id() -> str:
    return str(uuid.uuid4())

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

# ==================== INITIALIZATION ====================

async def init_default_roles():
    default_roles = [
        {
            "id": "role-admin",
            "name": "Administrador",
            "permissions": ["admin", "users.read", "users.write", "companies.read", "companies.write", 
                          "equipment.read", "equipment.write", "assignments.read", "assignments.write",
                          "maintenance.read", "maintenance.write", "services.read", "services.write",
                          "quotations.read", "quotations.write", "invoices.read", "invoices.write",
                          "reports.read", "reports.export", "custom_fields.write"],
            "description": "Acceso total al sistema",
            "is_system": True
        },
        {
            "id": "role-tech",
            "name": "Técnico",
            "permissions": ["equipment.read", "equipment.write", "assignments.read", "assignments.write",
                          "maintenance.read", "maintenance.write", "services.read"],
            "description": "Gestión de equipos y mantenimientos",
            "is_system": True
        },
        {
            "id": "role-client",
            "name": "Cliente",
            "permissions": ["equipment.read", "assignments.read", "services.read", "quotations.read", "invoices.read"],
            "description": "Vista de sus equipos y documentos",
            "is_system": True
        }
    ]
    
    for role in default_roles:
        existing = await db.roles.find_one({"id": role["id"]})
        if not existing:
            await db.roles.insert_one(role)
    
    admin_exists = await db.users.find_one({"email": "admin@inventarioti.com"})
    if not admin_exists:
        admin_user = {
            "id": generate_id(),
            "email": "admin@inventarioti.com",
            "password": hash_password("admin123"),
            "name": "Administrador",
            "role_id": "role-admin",
            "company_id": None,
            "is_active": True,
            "created_at": now_iso()
        }
        await db.users.insert_one(admin_user)
        logger.info("Default admin user created")

@app.on_event("startup")
async def startup_event():
    await init_default_roles()
    logger.info("Application started")

# ==================== AUTH ENDPOINTS ====================

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    if not user.get("is_active", True):
        raise HTTPException(status_code=401, detail="Usuario desactivado")
    
    role_name = None
    if user.get("role_id"):
        role = await db.roles.find_one({"id": user["role_id"]}, {"_id": 0})
        role_name = role["name"] if role else None
    
    company_name = None
    if user.get("company_id"):
        company = await db.companies.find_one({"id": user["company_id"]}, {"_id": 0})
        company_name = company["name"] if company else None
    
    token = create_token(user["id"], user["email"], user.get("role_id"))
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user["id"], email=user["email"], name=user["name"],
            role_id=user.get("role_id"), role_name=role_name,
            company_id=user.get("company_id"), company_name=company_name,
            is_active=user.get("is_active", True), created_at=user["created_at"]
        )
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    role_name = None
    if current_user.get("role_id"):
        role = await db.roles.find_one({"id": current_user["role_id"]}, {"_id": 0})
        role_name = role["name"] if role else None
    
    company_name = None
    if current_user.get("company_id"):
        company = await db.companies.find_one({"id": current_user["company_id"]}, {"_id": 0})
        company_name = company["name"] if company else None
    
    return UserResponse(
        id=current_user["id"], email=current_user["email"], name=current_user["name"],
        role_id=current_user.get("role_id"), role_name=role_name,
        company_id=current_user.get("company_id"), company_name=company_name,
        is_active=current_user.get("is_active", True), created_at=current_user["created_at"]
    )

# ==================== CUSTOM FIELDS ENDPOINTS ====================

@api_router.get("/custom-fields", response_model=List[CustomFieldResponse])
async def get_custom_fields(entity_type: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {"is_active": {"$ne": False}}
    if entity_type:
        query["entity_type"] = entity_type
    fields = await db.custom_fields.find(query, {"_id": 0}).to_list(200)
    return [CustomFieldResponse(**f) for f in fields]

@api_router.post("/custom-fields", response_model=CustomFieldResponse)
async def create_custom_field(field_data: CustomFieldCreate, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "custom_fields.write")
    
    field = {
        "id": generate_id(),
        "entity_type": field_data.entity_type,
        "name": field_data.name,
        "field_type": field_data.field_type,
        "options": field_data.options,
        "required": field_data.required,
        "category": field_data.category,
        "is_active": True
    }
    await db.custom_fields.insert_one(field)
    return CustomFieldResponse(**field)

@api_router.put("/custom-fields/{field_id}", response_model=CustomFieldResponse)
async def update_custom_field(field_id: str, field_data: CustomFieldCreate, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "custom_fields.write")
    
    update_data = field_data.model_dump()
    result = await db.custom_fields.update_one({"id": field_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Campo no encontrado")
    
    field = await db.custom_fields.find_one({"id": field_id}, {"_id": 0})
    return CustomFieldResponse(**field)

@api_router.delete("/custom-fields/{field_id}")
async def delete_custom_field(field_id: str, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "custom_fields.write")
    result = await db.custom_fields.update_one({"id": field_id}, {"$set": {"is_active": False}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Campo no encontrado")
    return {"message": "Campo eliminado"}

# ==================== USERS ENDPOINTS ====================

@api_router.get("/users", response_model=List[UserResponse])
async def get_users(current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "users.read")
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    
    result = []
    for user in users:
        role_name = None
        if user.get("role_id"):
            role = await db.roles.find_one({"id": user["role_id"]}, {"_id": 0})
            role_name = role["name"] if role else None
        company_name = None
        if user.get("company_id"):
            company = await db.companies.find_one({"id": user["company_id"]}, {"_id": 0})
            company_name = company["name"] if company else None
        result.append(UserResponse(
            id=user["id"], email=user["email"], name=user["name"],
            role_id=user.get("role_id"), role_name=role_name,
            company_id=user.get("company_id"), company_name=company_name,
            is_active=user.get("is_active", True), created_at=user["created_at"]
        ))
    return result

@api_router.post("/users", response_model=UserResponse)
async def create_user(user_data: UserCreate, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "users.write")
    
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="El email ya está registrado")
    
    user = {
        "id": generate_id(), "email": user_data.email,
        "password": hash_password(user_data.password), "name": user_data.name,
        "role_id": user_data.role_id, "company_id": user_data.company_id,
        "is_active": True, "created_at": now_iso()
    }
    await db.users.insert_one(user)
    
    role_name = None
    if user_data.role_id:
        role = await db.roles.find_one({"id": user_data.role_id}, {"_id": 0})
        role_name = role["name"] if role else None
    company_name = None
    if user_data.company_id:
        company = await db.companies.find_one({"id": user_data.company_id}, {"_id": 0})
        company_name = company["name"] if company else None
    
    return UserResponse(
        id=user["id"], email=user["email"], name=user["name"],
        role_id=user.get("role_id"), role_name=role_name,
        company_id=user.get("company_id"), company_name=company_name,
        is_active=True, created_at=user["created_at"]
    )

@api_router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(user_id: str, user_data: UserCreate, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "users.write")
    
    update_data = {"email": user_data.email, "name": user_data.name,
                   "role_id": user_data.role_id, "company_id": user_data.company_id}
    if user_data.password:
        update_data["password"] = hash_password(user_data.password)
    
    result = await db.users.update_one({"id": user_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    role_name = None
    if user.get("role_id"):
        role = await db.roles.find_one({"id": user["role_id"]}, {"_id": 0})
        role_name = role["name"] if role else None
    company_name = None
    if user.get("company_id"):
        company = await db.companies.find_one({"id": user["company_id"]}, {"_id": 0})
        company_name = company["name"] if company else None
    
    return UserResponse(
        id=user["id"], email=user["email"], name=user["name"],
        role_id=user.get("role_id"), role_name=role_name,
        company_id=user.get("company_id"), company_name=company_name,
        is_active=user.get("is_active", True), created_at=user["created_at"]
    )

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "users.write")
    result = await db.users.update_one({"id": user_id}, {"$set": {"is_active": False}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return {"message": "Usuario desactivado"}

# ==================== ROLES ENDPOINTS ====================

@api_router.get("/roles", response_model=List[RoleResponse])
async def get_roles(current_user: dict = Depends(get_current_user)):
    roles = await db.roles.find({}, {"_id": 0}).to_list(100)
    return [RoleResponse(**role) for role in roles]

@api_router.post("/roles", response_model=RoleResponse)
async def create_role(role_data: RoleCreate, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "admin")
    role = {"id": generate_id(), "name": role_data.name, "permissions": role_data.permissions,
            "description": role_data.description, "is_system": False}
    await db.roles.insert_one(role)
    return RoleResponse(**role)

@api_router.put("/roles/{role_id}", response_model=RoleResponse)
async def update_role(role_id: str, role_data: RoleCreate, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "admin")
    existing = await db.roles.find_one({"id": role_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Rol no encontrado")
    update_data = {"name": role_data.name, "permissions": role_data.permissions, "description": role_data.description}
    await db.roles.update_one({"id": role_id}, {"$set": update_data})
    role = await db.roles.find_one({"id": role_id}, {"_id": 0})
    return RoleResponse(**role)

# ==================== COMPANIES ENDPOINTS ====================

@api_router.get("/companies", response_model=List[CompanyResponse])
async def get_companies(current_user: dict = Depends(get_current_user)):
    query = {"is_active": {"$ne": False}}
    if current_user.get("company_id"):
        query["id"] = current_user["company_id"]
    companies = await db.companies.find(query, {"_id": 0}).to_list(1000)
    return [CompanyResponse(**c) for c in companies]

@api_router.post("/companies", response_model=CompanyResponse)
async def create_company(company_data: CompanyCreate, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "companies.write")
    company = {
        "id": generate_id(), "name": company_data.name, "address": company_data.address,
        "phone": company_data.phone, "email": company_data.email, "tax_id": company_data.tax_id,
        "custom_fields": company_data.custom_fields, "is_active": True, "created_at": now_iso()
    }
    await db.companies.insert_one(company)
    return CompanyResponse(**company)

@api_router.put("/companies/{company_id}", response_model=CompanyResponse)
async def update_company(company_id: str, company_data: CompanyCreate, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "companies.write")
    update_data = company_data.model_dump()
    result = await db.companies.update_one({"id": company_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    company = await db.companies.find_one({"id": company_id}, {"_id": 0})
    return CompanyResponse(**company)

@api_router.delete("/companies/{company_id}")
async def delete_company(company_id: str, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "companies.write")
    result = await db.companies.update_one({"id": company_id}, {"$set": {"is_active": False}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    return {"message": "Empresa desactivada"}

# ==================== BRANCHES ENDPOINTS ====================

@api_router.get("/branches", response_model=List[BranchResponse])
async def get_branches(company_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {"is_active": {"$ne": False}}
    if company_id:
        query["company_id"] = company_id
    elif current_user.get("company_id"):
        query["company_id"] = current_user["company_id"]
    branches = await db.branches.find(query, {"_id": 0}).to_list(1000)
    result = []
    for branch in branches:
        company = await db.companies.find_one({"id": branch["company_id"]}, {"_id": 0})
        branch["company_name"] = company["name"] if company else None
        result.append(BranchResponse(**branch))
    return result

@api_router.post("/branches", response_model=BranchResponse)
async def create_branch(branch_data: BranchCreate, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "companies.write")
    branch = {
        "id": generate_id(), "company_id": branch_data.company_id, "name": branch_data.name,
        "address": branch_data.address, "phone": branch_data.phone,
        "custom_fields": branch_data.custom_fields, "is_active": True
    }
    await db.branches.insert_one(branch)
    company = await db.companies.find_one({"id": branch_data.company_id}, {"_id": 0})
    branch["company_name"] = company["name"] if company else None
    return BranchResponse(**branch)

@api_router.put("/branches/{branch_id}", response_model=BranchResponse)
async def update_branch(branch_id: str, branch_data: BranchCreate, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "companies.write")
    update_data = branch_data.model_dump()
    result = await db.branches.update_one({"id": branch_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Sucursal no encontrada")
    branch = await db.branches.find_one({"id": branch_id}, {"_id": 0})
    company = await db.companies.find_one({"id": branch["company_id"]}, {"_id": 0})
    branch["company_name"] = company["name"] if company else None
    return BranchResponse(**branch)

@api_router.delete("/branches/{branch_id}")
async def delete_branch(branch_id: str, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "companies.write")
    result = await db.branches.update_one({"id": branch_id}, {"$set": {"is_active": False}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Sucursal no encontrada")
    return {"message": "Sucursal desactivada"}

# ==================== EMPLOYEES ENDPOINTS ====================

@api_router.get("/employees", response_model=List[EmployeeResponse])
async def get_employees(company_id: Optional[str] = None, branch_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {"is_active": {"$ne": False}}
    if company_id:
        query["company_id"] = company_id
    elif current_user.get("company_id"):
        query["company_id"] = current_user["company_id"]
    if branch_id:
        query["branch_id"] = branch_id
    employees = await db.employees.find(query, {"_id": 0}).to_list(1000)
    result = []
    for emp in employees:
        company = await db.companies.find_one({"id": emp["company_id"]}, {"_id": 0})
        emp["company_name"] = company["name"] if company else None
        if emp.get("branch_id"):
            branch = await db.branches.find_one({"id": emp["branch_id"]}, {"_id": 0})
            emp["branch_name"] = branch["name"] if branch else None
        emp["full_name"] = f"{emp['first_name']} {emp['last_name']}"
        result.append(EmployeeResponse(**emp))
    return result

@api_router.post("/employees", response_model=EmployeeResponse)
async def create_employee(emp_data: EmployeeCreate, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "companies.write")
    existing = await db.employees.find_one({"dni": emp_data.dni, "company_id": emp_data.company_id})
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe un empleado con ese DNI")
    employee = {
        "id": generate_id(), "company_id": emp_data.company_id, "branch_id": emp_data.branch_id,
        "dni": emp_data.dni, "first_name": emp_data.first_name, "last_name": emp_data.last_name,
        "position": emp_data.position, "department": emp_data.department, "email": emp_data.email,
        "custom_fields": emp_data.custom_fields, "is_active": True, "created_at": now_iso()
    }
    await db.employees.insert_one(employee)
    company = await db.companies.find_one({"id": emp_data.company_id}, {"_id": 0})
    employee["company_name"] = company["name"] if company else None
    employee["full_name"] = f"{emp_data.first_name} {emp_data.last_name}"
    if emp_data.branch_id:
        branch = await db.branches.find_one({"id": emp_data.branch_id}, {"_id": 0})
        employee["branch_name"] = branch["name"] if branch else None
    return EmployeeResponse(**employee)

@api_router.put("/employees/{employee_id}", response_model=EmployeeResponse)
async def update_employee(employee_id: str, emp_data: EmployeeCreate, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "companies.write")
    update_data = emp_data.model_dump()
    result = await db.employees.update_one({"id": employee_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    employee = await db.employees.find_one({"id": employee_id}, {"_id": 0})
    company = await db.companies.find_one({"id": employee["company_id"]}, {"_id": 0})
    employee["company_name"] = company["name"] if company else None
    employee["full_name"] = f"{employee['first_name']} {employee['last_name']}"
    if employee.get("branch_id"):
        branch = await db.branches.find_one({"id": employee["branch_id"]}, {"_id": 0})
        employee["branch_name"] = branch["name"] if branch else None
    return EmployeeResponse(**employee)

@api_router.delete("/employees/{employee_id}")
async def delete_employee(employee_id: str, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "companies.write")
    result = await db.employees.update_one({"id": employee_id}, {"$set": {"is_active": False}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    return {"message": "Empleado desactivado"}

# ==================== EQUIPMENT ENDPOINTS ====================

@api_router.get("/equipment", response_model=List[EquipmentResponse])
async def get_equipment(company_id: Optional[str] = None, branch_id: Optional[str] = None,
                        status: Optional[str] = None, equipment_type: Optional[str] = None,
                        current_user: dict = Depends(get_current_user)):
    query = {}
    if company_id:
        query["company_id"] = company_id
    elif current_user.get("company_id"):
        query["company_id"] = current_user["company_id"]
    if branch_id:
        query["branch_id"] = branch_id
    if status:
        query["status"] = status
    if equipment_type:
        query["equipment_type"] = equipment_type
    equipment_list = await db.equipment.find(query, {"_id": 0}).to_list(1000)
    result = []
    for eq in equipment_list:
        company = await db.companies.find_one({"id": eq["company_id"]}, {"_id": 0})
        eq["company_name"] = company["name"] if company else None
        if eq.get("branch_id"):
            branch = await db.branches.find_one({"id": eq["branch_id"]}, {"_id": 0})
            eq["branch_name"] = branch["name"] if branch else None
        if eq.get("assigned_to"):
            employee = await db.employees.find_one({"id": eq["assigned_to"]}, {"_id": 0})
            eq["assigned_employee_name"] = f"{employee['first_name']} {employee['last_name']}" if employee else None
        result.append(EquipmentResponse(**eq))
    return result

@api_router.get("/equipment/{equipment_id}", response_model=EquipmentResponse)
async def get_equipment_by_id(equipment_id: str, current_user: dict = Depends(get_current_user)):
    eq = await db.equipment.find_one({"id": equipment_id}, {"_id": 0})
    if not eq:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    company = await db.companies.find_one({"id": eq["company_id"]}, {"_id": 0})
    eq["company_name"] = company["name"] if company else None
    if eq.get("branch_id"):
        branch = await db.branches.find_one({"id": eq["branch_id"]}, {"_id": 0})
        eq["branch_name"] = branch["name"] if branch else None
    if eq.get("assigned_to"):
        employee = await db.employees.find_one({"id": eq["assigned_to"]}, {"_id": 0})
        eq["assigned_employee_name"] = f"{employee['first_name']} {employee['last_name']}" if employee else None
    return EquipmentResponse(**eq)

@api_router.post("/equipment", response_model=EquipmentResponse)
async def create_equipment(eq_data: EquipmentCreate, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "equipment.write")
    existing = await db.equipment.find_one({"serial_number": eq_data.serial_number})
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe un equipo con ese número de serie")
    existing_code = await db.equipment.find_one({"inventory_code": eq_data.inventory_code})
    if existing_code:
        raise HTTPException(status_code=400, detail="Ya existe un equipo con ese código de inventario")
    equipment = {
        "id": generate_id(), "company_id": eq_data.company_id, "branch_id": eq_data.branch_id,
        "inventory_code": eq_data.inventory_code, "equipment_type": eq_data.equipment_type,
        "brand": eq_data.brand, "model": eq_data.model, "serial_number": eq_data.serial_number,
        "acquisition_type": eq_data.acquisition_type, "acquisition_date": eq_data.acquisition_date,
        "provider": eq_data.provider, "status": eq_data.status, "observations": eq_data.observations,
        "windows_user": eq_data.windows_user, "windows_password": eq_data.windows_password,
        "email_account": eq_data.email_account, "email_password": eq_data.email_password,
        "cloud_user": eq_data.cloud_user, "cloud_password": eq_data.cloud_password,
        "custom_fields": eq_data.custom_fields, "assigned_to": None, "created_at": now_iso()
    }
    await db.equipment.insert_one(equipment)
    company = await db.companies.find_one({"id": eq_data.company_id}, {"_id": 0})
    equipment["company_name"] = company["name"] if company else None
    if eq_data.branch_id:
        branch = await db.branches.find_one({"id": eq_data.branch_id}, {"_id": 0})
        equipment["branch_name"] = branch["name"] if branch else None
    return EquipmentResponse(**equipment)

@api_router.put("/equipment/{equipment_id}", response_model=EquipmentResponse)
async def update_equipment(equipment_id: str, eq_data: EquipmentCreate, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "equipment.write")
    update_data = eq_data.model_dump()
    result = await db.equipment.update_one({"id": equipment_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    eq = await db.equipment.find_one({"id": equipment_id}, {"_id": 0})
    company = await db.companies.find_one({"id": eq["company_id"]}, {"_id": 0})
    eq["company_name"] = company["name"] if company else None
    if eq.get("branch_id"):
        branch = await db.branches.find_one({"id": eq["branch_id"]}, {"_id": 0})
        eq["branch_name"] = branch["name"] if branch else None
    if eq.get("assigned_to"):
        employee = await db.employees.find_one({"id": eq["assigned_to"]}, {"_id": 0})
        eq["assigned_employee_name"] = f"{employee['first_name']} {employee['last_name']}" if employee else None
    return EquipmentResponse(**eq)

@api_router.delete("/equipment/{equipment_id}")
async def delete_equipment(equipment_id: str, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "equipment.write")
    result = await db.equipment.delete_one({"id": equipment_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    return {"message": "Equipo eliminado"}

# ==================== EQUIPMENT LOGS ENDPOINTS ====================

@api_router.get("/equipment/{equipment_id}/logs", response_model=List[EquipmentLogResponse])
async def get_equipment_logs(equipment_id: str, current_user: dict = Depends(get_current_user)):
    logs = await db.equipment_logs.find({"equipment_id": equipment_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    result = []
    for log in logs:
        if log.get("performed_by"):
            user = await db.users.find_one({"id": log["performed_by"]}, {"_id": 0})
            log["performed_by_name"] = user["name"] if user else None
        result.append(EquipmentLogResponse(**log))
    return result

@api_router.post("/equipment/{equipment_id}/logs", response_model=EquipmentLogResponse)
async def create_equipment_log(equipment_id: str, log_data: EquipmentLogCreate, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "equipment.write")
    eq = await db.equipment.find_one({"id": equipment_id})
    if not eq:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    log = {
        "id": generate_id(), "equipment_id": equipment_id, "log_type": log_data.log_type,
        "description": log_data.description, "performed_by": current_user["id"], "created_at": now_iso()
    }
    await db.equipment_logs.insert_one(log)
    log["performed_by_name"] = current_user["name"]
    return EquipmentLogResponse(**log)

# ==================== ASSIGNMENTS ENDPOINTS ====================

@api_router.get("/assignments", response_model=List[AssignmentResponse])
async def get_assignments(equipment_id: Optional[str] = None, employee_id: Optional[str] = None,
                          status: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if equipment_id:
        query["equipment_id"] = equipment_id
    if employee_id:
        query["employee_id"] = employee_id
    if status:
        query["status"] = status
    assignments = await db.assignments.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    result = []
    for assign in assignments:
        eq = await db.equipment.find_one({"id": assign["equipment_id"]}, {"_id": 0})
        if eq:
            assign["equipment_code"] = eq.get("inventory_code")
            assign["equipment_type"] = eq.get("equipment_type")
        emp = await db.employees.find_one({"id": assign["employee_id"]}, {"_id": 0})
        if emp:
            assign["employee_name"] = f"{emp['first_name']} {emp['last_name']}"
        result.append(AssignmentResponse(**assign))
    return result

@api_router.post("/assignments", response_model=AssignmentResponse)
async def create_assignment(assign_data: AssignmentCreate, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "assignments.write")
    eq = await db.equipment.find_one({"id": assign_data.equipment_id})
    if not eq:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    if eq.get("status") != "Disponible":
        raise HTTPException(status_code=400, detail="El equipo no está disponible")
    emp = await db.employees.find_one({"id": assign_data.employee_id})
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    assignment = {
        "id": generate_id(), "equipment_id": assign_data.equipment_id,
        "employee_id": assign_data.employee_id, "delivery_date": assign_data.delivery_date,
        "return_date": None, "status": "Activa", "observations": assign_data.observations,
        "return_observations": None, "created_at": now_iso()
    }
    await db.assignments.insert_one(assignment)
    await db.equipment.update_one({"id": assign_data.equipment_id},
                                   {"$set": {"status": "Asignado", "assigned_to": assign_data.employee_id}})
    log = {
        "id": generate_id(), "equipment_id": assign_data.equipment_id, "log_type": "Cambio",
        "description": f"Equipo asignado a {emp['first_name']} {emp['last_name']}",
        "performed_by": current_user["id"], "created_at": now_iso()
    }
    await db.equipment_logs.insert_one(log)
    assignment["equipment_code"] = eq.get("inventory_code")
    assignment["equipment_type"] = eq.get("equipment_type")
    assignment["employee_name"] = f"{emp['first_name']} {emp['last_name']}"
    return AssignmentResponse(**assignment)

@api_router.put("/assignments/{assignment_id}/return")
async def return_assignment(assignment_id: str, observations: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "assignments.write")
    assignment = await db.assignments.find_one({"id": assignment_id})
    if not assignment:
        raise HTTPException(status_code=404, detail="Asignación no encontrada")
    if assignment["status"] != "Activa":
        raise HTTPException(status_code=400, detail="La asignación ya fue finalizada")
    await db.assignments.update_one({"id": assignment_id},
                                     {"$set": {"status": "Finalizada", "return_date": now_iso(), "return_observations": observations}})
    await db.equipment.update_one({"id": assignment["equipment_id"]},
                                   {"$set": {"status": "Disponible", "assigned_to": None}})
    log = {
        "id": generate_id(), "equipment_id": assignment["equipment_id"], "log_type": "Cambio",
        "description": "Equipo devuelto y marcado como disponible",
        "performed_by": current_user["id"], "created_at": now_iso()
    }
    await db.equipment_logs.insert_one(log)
    return {"message": "Asignación finalizada"}

# ==================== MAINTENANCE LOGS ENDPOINTS ====================

@api_router.get("/maintenance", response_model=List[MaintenanceLogResponse])
async def get_maintenance_logs(status: Optional[str] = None, maintenance_type: Optional[str] = None,
                                equipment_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if status:
        query["status"] = status
    if maintenance_type:
        query["maintenance_type"] = maintenance_type
    if equipment_id:
        query["equipment_id"] = equipment_id
    logs = await db.maintenance_logs.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    result = []
    for log in logs:
        eq = await db.equipment.find_one({"id": log["equipment_id"]}, {"_id": 0})
        if eq:
            log["equipment_code"] = eq.get("inventory_code")
        if log.get("performed_by"):
            user = await db.users.find_one({"id": log["performed_by"]}, {"_id": 0})
            log["performed_by_name"] = user["name"] if user else None
        result.append(MaintenanceLogResponse(**log))
    return result

@api_router.post("/maintenance", response_model=MaintenanceLogResponse)
async def create_maintenance_log(log_data: MaintenanceLogCreate, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "maintenance.write")
    eq = await db.equipment.find_one({"id": log_data.equipment_id})
    if not eq:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    maint_log = {
        "id": generate_id(), "equipment_id": log_data.equipment_id,
        "maintenance_type": log_data.maintenance_type, "description": log_data.description,
        "technician": log_data.technician, "parts_used": log_data.parts_used,
        "next_maintenance_date": log_data.next_maintenance_date,
        "custom_fields": log_data.custom_fields, "status": "Pendiente",
        "created_at": now_iso(), "completed_at": None, "performed_by": current_user["id"]
    }
    await db.maintenance_logs.insert_one(maint_log)
    # Log in equipment history
    eq_log = {
        "id": generate_id(), "equipment_id": log_data.equipment_id, "log_type": "Mantenimiento",
        "description": f"Mantenimiento {log_data.maintenance_type}: {log_data.description}",
        "performed_by": current_user["id"], "created_at": now_iso()
    }
    await db.equipment_logs.insert_one(eq_log)
    maint_log["equipment_code"] = eq.get("inventory_code")
    maint_log["performed_by_name"] = current_user["name"]
    return MaintenanceLogResponse(**maint_log)

@api_router.put("/maintenance/{log_id}/start")
async def start_maintenance(log_id: str, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "maintenance.write")
    log = await db.maintenance_logs.find_one({"id": log_id})
    if not log:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
    if log["status"] != "Pendiente":
        raise HTTPException(status_code=400, detail="El mantenimiento ya fue iniciado")
    await db.maintenance_logs.update_one({"id": log_id}, {"$set": {"status": "En Proceso"}})
    await db.equipment.update_one({"id": log["equipment_id"]}, {"$set": {"status": "En Mantenimiento"}})
    return {"message": "Mantenimiento iniciado"}

@api_router.put("/maintenance/{log_id}/complete")
async def complete_maintenance(log_id: str, notes: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "maintenance.write")
    log = await db.maintenance_logs.find_one({"id": log_id})
    if not log:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
    if log["status"] == "Finalizado":
        raise HTTPException(status_code=400, detail="El mantenimiento ya fue finalizado")
    update_data = {"status": "Finalizado", "completed_at": now_iso()}
    if notes:
        update_data["description"] = log["description"] + f" | Notas: {notes}"
    await db.maintenance_logs.update_one({"id": log_id}, {"$set": update_data})
    await db.equipment.update_one({"id": log["equipment_id"]}, {"$set": {"status": "Disponible"}})
    eq_log = {
        "id": generate_id(), "equipment_id": log["equipment_id"], "log_type": "Mantenimiento",
        "description": f"Mantenimiento {log['maintenance_type']} completado",
        "performed_by": current_user["id"], "created_at": now_iso()
    }
    await db.equipment_logs.insert_one(eq_log)
    return {"message": "Mantenimiento finalizado"}

# ==================== DECOMMISSIONS ENDPOINTS ====================

@api_router.get("/decommissions", response_model=List[DecommissionResponse])
async def get_decommissions(current_user: dict = Depends(get_current_user)):
    decommissions = await db.decommissions.find({}, {"_id": 0}).sort("decommission_date", -1).to_list(1000)
    result = []
    for dec in decommissions:
        eq = await db.equipment.find_one({"id": dec["equipment_id"]}, {"_id": 0})
        if eq:
            dec["equipment_code"] = eq.get("inventory_code")
        if dec.get("responsible_user_id"):
            user = await db.users.find_one({"id": dec["responsible_user_id"]}, {"_id": 0})
            dec["responsible_user_name"] = user["name"] if user else None
        result.append(DecommissionResponse(**dec))
    return result

@api_router.post("/decommissions", response_model=DecommissionResponse)
async def create_decommission(dec_data: DecommissionCreate, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "equipment.write")
    eq = await db.equipment.find_one({"id": dec_data.equipment_id})
    if not eq:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    if eq.get("status") == "Asignado":
        raise HTTPException(status_code=400, detail="El equipo está asignado")
    if eq.get("status") == "De Baja":
        raise HTTPException(status_code=400, detail="El equipo ya está dado de baja")
    decommission = {
        "id": generate_id(), "equipment_id": dec_data.equipment_id, "decommission_date": now_iso(),
        "reason": dec_data.reason, "description": dec_data.description, "responsible_user_id": current_user["id"]
    }
    await db.decommissions.insert_one(decommission)
    await db.equipment.update_one({"id": dec_data.equipment_id}, {"$set": {"status": "De Baja"}})
    log = {
        "id": generate_id(), "equipment_id": dec_data.equipment_id, "log_type": "Cambio",
        "description": f"Equipo dado de baja: {dec_data.reason}",
        "performed_by": current_user["id"], "created_at": now_iso()
    }
    await db.equipment_logs.insert_one(log)
    decommission["equipment_code"] = eq.get("inventory_code")
    decommission["responsible_user_name"] = current_user["name"]
    return DecommissionResponse(**decommission)

# ==================== EXTERNAL SERVICES ENDPOINTS ====================

@api_router.get("/external-services", response_model=List[ExternalServiceResponse])
async def get_external_services(company_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {"is_active": {"$ne": False}}
    if company_id:
        query["company_id"] = company_id
    elif current_user.get("company_id"):
        query["company_id"] = current_user["company_id"]
    services = await db.external_services.find(query, {"_id": 0}).to_list(1000)
    result = []
    for svc in services:
        company = await db.companies.find_one({"id": svc["company_id"]}, {"_id": 0})
        svc["company_name"] = company["name"] if company else None
        result.append(ExternalServiceResponse(**svc))
    return result

@api_router.post("/external-services", response_model=ExternalServiceResponse)
async def create_external_service(svc_data: ExternalServiceCreate, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "services.write")
    service = {
        "id": generate_id(), "company_id": svc_data.company_id, "service_type": svc_data.service_type,
        "provider": svc_data.provider, "description": svc_data.description,
        "start_date": svc_data.start_date, "renewal_date": svc_data.renewal_date,
        "payment_frequency": svc_data.payment_frequency, "credentials_info": svc_data.credentials_info,
        "custom_fields": svc_data.custom_fields, "is_active": True, "created_at": now_iso()
    }
    await db.external_services.insert_one(service)
    company = await db.companies.find_one({"id": svc_data.company_id}, {"_id": 0})
    service["company_name"] = company["name"] if company else None
    return ExternalServiceResponse(**service)

@api_router.put("/external-services/{service_id}", response_model=ExternalServiceResponse)
async def update_external_service(service_id: str, svc_data: ExternalServiceCreate, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "services.write")
    update_data = svc_data.model_dump()
    result = await db.external_services.update_one({"id": service_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    service = await db.external_services.find_one({"id": service_id}, {"_id": 0})
    company = await db.companies.find_one({"id": service["company_id"]}, {"_id": 0})
    service["company_name"] = company["name"] if company else None
    return ExternalServiceResponse(**service)

@api_router.delete("/external-services/{service_id}")
async def delete_external_service(service_id: str, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "services.write")
    result = await db.external_services.update_one({"id": service_id}, {"$set": {"is_active": False}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    return {"message": "Servicio desactivado"}

# ==================== QUOTATIONS ENDPOINTS ====================

@api_router.get("/quotations", response_model=List[QuotationResponse])
async def get_quotations(company_id: Optional[str] = None, status: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if company_id:
        query["company_id"] = company_id
    elif current_user.get("company_id"):
        query["company_id"] = current_user["company_id"]
    if status:
        query["status"] = status
    quotations = await db.quotations.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    result = []
    for quot in quotations:
        company = await db.companies.find_one({"id": quot["company_id"]}, {"_id": 0})
        quot["company_name"] = company["name"] if company else None
        result.append(QuotationResponse(**quot))
    return result

@api_router.get("/quotations/{quotation_id}", response_model=QuotationResponse)
async def get_quotation_by_id(quotation_id: str, current_user: dict = Depends(get_current_user)):
    quot = await db.quotations.find_one({"id": quotation_id}, {"_id": 0})
    if not quot:
        raise HTTPException(status_code=404, detail="Cotización no encontrada")
    company = await db.companies.find_one({"id": quot["company_id"]}, {"_id": 0})
    quot["company_name"] = company["name"] if company else None
    return QuotationResponse(**quot)

@api_router.post("/quotations", response_model=QuotationResponse)
async def create_quotation(quot_data: QuotationCreate, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "quotations.write")
    count = await db.quotations.count_documents({})
    quotation_number = f"COT-{str(count + 1).zfill(6)}"
    items = []
    subtotal = 0
    for item in quot_data.items:
        item_total = item.quantity * item.unit_price * (1 - item.discount / 100)
        items.append({"description": item.description, "quantity": item.quantity,
                      "unit_price": item.unit_price, "discount": item.discount, "total": round(item_total, 2)})
        subtotal += item_total
    tax_amount = subtotal * (quot_data.tax_rate / 100)
    total = subtotal + tax_amount
    valid_until = (datetime.now(timezone.utc) + timedelta(days=quot_data.valid_days)).isoformat()
    quotation = {
        "id": generate_id(), "quotation_number": quotation_number, "company_id": quot_data.company_id,
        "client_name": quot_data.client_name, "client_email": quot_data.client_email,
        "client_address": quot_data.client_address, "items": items, "subtotal": round(subtotal, 2),
        "tax_rate": quot_data.tax_rate, "tax_amount": round(tax_amount, 2), "total": round(total, 2),
        "notes": quot_data.notes, "valid_until": valid_until, "status": "Pendiente",
        "custom_fields": quot_data.custom_fields, "created_at": now_iso()
    }
    await db.quotations.insert_one(quotation)
    company = await db.companies.find_one({"id": quot_data.company_id}, {"_id": 0})
    quotation["company_name"] = company["name"] if company else None
    return QuotationResponse(**quotation)

@api_router.put("/quotations/{quotation_id}/status")
async def update_quotation_status(quotation_id: str, status: str, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "quotations.write")
    if status not in ["Pendiente", "Aceptada", "Rechazada", "Convertida"]:
        raise HTTPException(status_code=400, detail="Estado inválido")
    result = await db.quotations.update_one({"id": quotation_id}, {"$set": {"status": status}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Cotización no encontrada")
    return {"message": f"Estado actualizado a {status}"}

# ==================== INVOICES ENDPOINTS ====================

@api_router.get("/invoices", response_model=List[InvoiceResponse])
async def get_invoices(company_id: Optional[str] = None, status: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if company_id:
        query["company_id"] = company_id
    elif current_user.get("company_id"):
        query["company_id"] = current_user["company_id"]
    if status:
        query["status"] = status
    invoices = await db.invoices.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    result = []
    for inv in invoices:
        company = await db.companies.find_one({"id": inv["company_id"]}, {"_id": 0})
        inv["company_name"] = company["name"] if company else None
        result.append(InvoiceResponse(**inv))
    return result

@api_router.get("/invoices/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice_by_id(invoice_id: str, current_user: dict = Depends(get_current_user)):
    inv = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not inv:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    company = await db.companies.find_one({"id": inv["company_id"]}, {"_id": 0})
    inv["company_name"] = company["name"] if company else None
    return InvoiceResponse(**inv)

@api_router.post("/invoices", response_model=InvoiceResponse)
async def create_invoice(inv_data: InvoiceCreate, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "invoices.write")
    count = await db.invoices.count_documents({})
    invoice_number = f"FAC-{str(count + 1).zfill(6)}"
    items = []
    subtotal = 0
    for item in inv_data.items:
        item_total = item.quantity * item.unit_price * (1 - item.discount / 100)
        items.append({"description": item.description, "quantity": item.quantity,
                      "unit_price": item.unit_price, "discount": item.discount, "total": round(item_total, 2)})
        subtotal += item_total
    tax_amount = subtotal * (inv_data.tax_rate / 100)
    total = subtotal + tax_amount
    invoice = {
        "id": generate_id(), "invoice_number": invoice_number, "company_id": inv_data.company_id,
        "quotation_id": inv_data.quotation_id, "client_name": inv_data.client_name,
        "client_email": inv_data.client_email, "client_address": inv_data.client_address,
        "client_tax_id": inv_data.client_tax_id, "items": items, "subtotal": round(subtotal, 2),
        "tax_rate": inv_data.tax_rate, "tax_amount": round(tax_amount, 2), "total": round(total, 2),
        "notes": inv_data.notes, "status": "Pendiente", "custom_fields": inv_data.custom_fields, "created_at": now_iso()
    }
    await db.invoices.insert_one(invoice)
    if inv_data.quotation_id:
        await db.quotations.update_one({"id": inv_data.quotation_id}, {"$set": {"status": "Convertida"}})
    company = await db.companies.find_one({"id": inv_data.company_id}, {"_id": 0})
    invoice["company_name"] = company["name"] if company else None
    return InvoiceResponse(**invoice)

@api_router.put("/invoices/{invoice_id}/status")
async def update_invoice_status(invoice_id: str, status: str, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "invoices.write")
    if status not in ["Pendiente", "Pagada", "Anulada"]:
        raise HTTPException(status_code=400, detail="Estado inválido")
    result = await db.invoices.update_one({"id": invoice_id}, {"$set": {"status": status}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    return {"message": f"Estado actualizado a {status}"}

# ==================== DASHBOARD STATS ENDPOINT ====================

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    company_filter = {}
    if current_user.get("company_id"):
        company_filter["company_id"] = current_user["company_id"]
    
    total_equipment = await db.equipment.count_documents(company_filter)
    available_equipment = await db.equipment.count_documents({**company_filter, "status": "Disponible"})
    assigned_equipment = await db.equipment.count_documents({**company_filter, "status": "Asignado"})
    maintenance_equipment = await db.equipment.count_documents({**company_filter, "status": "En Mantenimiento"})
    decommissioned_equipment = await db.equipment.count_documents({**company_filter, "status": "De Baja"})
    total_companies = await db.companies.count_documents({"is_active": {"$ne": False}})
    total_employees = await db.employees.count_documents({**company_filter, "is_active": {"$ne": False}})
    pending_maintenance = await db.maintenance_logs.count_documents({"status": {"$in": ["Pendiente", "En Proceso"]}})
    pending_quotations = await db.quotations.count_documents({**company_filter, "status": "Pendiente"})
    pending_invoices = await db.invoices.count_documents({**company_filter, "status": "Pendiente"})
    
    pipeline = [{"$match": company_filter} if company_filter else {"$match": {}},
                {"$group": {"_id": "$equipment_type", "count": {"$sum": 1}}}, {"$sort": {"count": -1}}]
    equipment_by_type = await db.equipment.aggregate(pipeline).to_list(20)
    recent_logs = await db.equipment_logs.find({}, {"_id": 0}).sort("created_at", -1).to_list(10)
    for log in recent_logs:
        eq = await db.equipment.find_one({"id": log["equipment_id"]}, {"_id": 0})
        log["equipment_code"] = eq.get("inventory_code") if eq else "N/A"
    
    return {
        "equipment": {"total": total_equipment, "available": available_equipment, "assigned": assigned_equipment,
                      "in_maintenance": maintenance_equipment, "decommissioned": decommissioned_equipment},
        "companies": total_companies, "employees": total_employees, "pending_maintenance": pending_maintenance,
        "pending_quotations": pending_quotations, "pending_invoices": pending_invoices,
        "equipment_by_type": [{"type": e["_id"] or "Sin tipo", "count": e["count"]} for e in equipment_by_type],
        "recent_activity": recent_logs
    }

# ==================== PDF GENERATION ENDPOINTS ====================

@api_router.get("/reports/equipment/pdf")
async def generate_equipment_report_pdf(company_id: Optional[str] = None, status: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if company_id:
        query["company_id"] = company_id
    elif current_user.get("company_id"):
        query["company_id"] = current_user["company_id"]
    if status:
        query["status"] = status
    equipment_list = await db.equipment.find(query, {"_id": 0}).to_list(1000)
    
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, "Reporte de Equipos", ln=True, align="C")
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(0, 10, f"Generado: {datetime.now().strftime('%d/%m/%Y %H:%M')}", ln=True, align="C")
    pdf.ln(10)
    pdf.set_font("Helvetica", "B", 9)
    pdf.cell(30, 8, "Codigo", 1)
    pdf.cell(30, 8, "Tipo", 1)
    pdf.cell(30, 8, "Marca", 1)
    pdf.cell(30, 8, "Modelo", 1)
    pdf.cell(40, 8, "Serie", 1)
    pdf.cell(25, 8, "Estado", 1)
    pdf.ln()
    pdf.set_font("Helvetica", "", 8)
    for eq in equipment_list:
        pdf.cell(30, 7, eq.get("inventory_code", "")[:15], 1)
        pdf.cell(30, 7, eq.get("equipment_type", "")[:15], 1)
        pdf.cell(30, 7, eq.get("brand", "")[:15], 1)
        pdf.cell(30, 7, eq.get("model", "")[:15], 1)
        pdf.cell(40, 7, eq.get("serial_number", "")[:20], 1)
        pdf.cell(25, 7, eq.get("status", ""), 1)
        pdf.ln()
    pdf_bytes = pdf.output()
    return Response(content=bytes(pdf_bytes), media_type="application/pdf",
                    headers={"Content-Disposition": "attachment; filename=reporte_equipos.pdf"})

@api_router.get("/reports/equipment-logs/{equipment_id}/pdf")
async def generate_equipment_logs_pdf(equipment_id: str, current_user: dict = Depends(get_current_user)):
    eq = await db.equipment.find_one({"id": equipment_id}, {"_id": 0})
    if not eq:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    logs = await db.equipment_logs.find({"equipment_id": equipment_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, f"Bitacora: {eq.get('inventory_code', '')}", ln=True, align="C")
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(0, 8, f"{eq.get('equipment_type', '')} | {eq.get('brand', '')} {eq.get('model', '')}", ln=True, align="C")
    pdf.ln(10)
    pdf.set_font("Helvetica", "B", 9)
    pdf.cell(35, 8, "Fecha", 1)
    pdf.cell(30, 8, "Tipo", 1)
    pdf.cell(120, 8, "Descripcion", 1)
    pdf.ln()
    pdf.set_font("Helvetica", "", 8)
    for log in logs:
        date_str = log.get("created_at", "")[:19].replace("T", " ")
        pdf.cell(35, 7, date_str, 1)
        pdf.cell(30, 7, log.get("log_type", ""), 1)
        pdf.cell(120, 7, log.get("description", "")[:60], 1)
        pdf.ln()
    pdf_bytes = pdf.output()
    return Response(content=bytes(pdf_bytes), media_type="application/pdf",
                    headers={"Content-Disposition": f"attachment; filename=bitacora_{eq.get('inventory_code', 'equipo')}.pdf"})

@api_router.get("/quotations/{quotation_id}/pdf")
async def generate_quotation_pdf(quotation_id: str, current_user: dict = Depends(get_current_user)):
    quot = await db.quotations.find_one({"id": quotation_id}, {"_id": 0})
    if not quot:
        raise HTTPException(status_code=404, detail="Cotizacion no encontrada")
    company = await db.companies.find_one({"id": quot["company_id"]}, {"_id": 0})
    
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 18)
    pdf.cell(0, 10, "COTIZACION", ln=True, align="C")
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, quot.get("quotation_number", ""), ln=True, align="C")
    pdf.ln(5)
    pdf.set_font("Helvetica", "", 10)
    if company:
        pdf.cell(0, 6, company.get("name", ""), ln=True)
    pdf.ln(5)
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(0, 6, "Cliente:", ln=True)
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(0, 6, quot.get("client_name", ""), ln=True)
    pdf.ln(10)
    pdf.set_font("Helvetica", "B", 9)
    pdf.cell(80, 8, "Descripcion", 1)
    pdf.cell(20, 8, "Cant.", 1, align="C")
    pdf.cell(30, 8, "P. Unit.", 1, align="C")
    pdf.cell(35, 8, "Total", 1, align="C")
    pdf.ln()
    pdf.set_font("Helvetica", "", 9)
    for item in quot.get("items", []):
        pdf.cell(80, 7, item.get("description", "")[:40], 1)
        pdf.cell(20, 7, str(item.get("quantity", 0)), 1, align="C")
        pdf.cell(30, 7, f"${item.get('unit_price', 0):.2f}", 1, align="R")
        pdf.cell(35, 7, f"${item.get('total', 0):.2f}", 1, align="R")
        pdf.ln()
    pdf.ln(5)
    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(150, 8, "TOTAL:", 0, align="R")
    pdf.cell(35, 8, f"${quot.get('total', 0):.2f}", 0, align="R")
    pdf_bytes = pdf.output()
    return Response(content=bytes(pdf_bytes), media_type="application/pdf",
                    headers={"Content-Disposition": f"attachment; filename={quot.get('quotation_number', 'cotizacion')}.pdf"})

@api_router.get("/invoices/{invoice_id}/pdf")
async def generate_invoice_pdf(invoice_id: str, current_user: dict = Depends(get_current_user)):
    inv = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not inv:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    company = await db.companies.find_one({"id": inv["company_id"]}, {"_id": 0})
    
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 18)
    pdf.cell(0, 10, "FACTURA", ln=True, align="C")
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, inv.get("invoice_number", ""), ln=True, align="C")
    pdf.ln(5)
    pdf.set_font("Helvetica", "", 10)
    if company:
        pdf.cell(0, 6, company.get("name", ""), ln=True)
    pdf.ln(5)
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(0, 6, "Cliente:", ln=True)
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(0, 6, inv.get("client_name", ""), ln=True)
    if inv.get("client_tax_id"):
        pdf.cell(0, 6, f"RUC: {inv.get('client_tax_id', '')}", ln=True)
    pdf.ln(10)
    pdf.set_font("Helvetica", "B", 9)
    pdf.cell(80, 8, "Descripcion", 1)
    pdf.cell(20, 8, "Cant.", 1, align="C")
    pdf.cell(30, 8, "P. Unit.", 1, align="C")
    pdf.cell(35, 8, "Total", 1, align="C")
    pdf.ln()
    pdf.set_font("Helvetica", "", 9)
    for item in inv.get("items", []):
        pdf.cell(80, 7, item.get("description", "")[:40], 1)
        pdf.cell(20, 7, str(item.get("quantity", 0)), 1, align="C")
        pdf.cell(30, 7, f"${item.get('unit_price', 0):.2f}", 1, align="R")
        pdf.cell(35, 7, f"${item.get('total', 0):.2f}", 1, align="R")
        pdf.ln()
    pdf.ln(5)
    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(150, 8, "TOTAL:", 0, align="R")
    pdf.cell(35, 8, f"${inv.get('total', 0):.2f}", 0, align="R")
    pdf_bytes = pdf.output()
    return Response(content=bytes(pdf_bytes), media_type="application/pdf",
                    headers={"Content-Disposition": f"attachment; filename={inv.get('invoice_number', 'factura')}.pdf"})

# ==================== EMAIL NOTIFICATION ====================

@api_router.post("/notifications/email")
async def send_email_notification(request: EmailNotificationRequest, current_user: dict = Depends(get_current_user)):
    resend_api_key = os.environ.get("RESEND_API_KEY")
    sender_email = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")
    if not resend_api_key:
        raise HTTPException(status_code=500, detail="Email service not configured")
    try:
        import resend
        resend.api_key = resend_api_key
        params = {"from": sender_email, "to": [request.recipient_email],
                  "subject": request.subject, "html": request.html_content}
        email = await asyncio.to_thread(resend.Emails.send, params)
        return {"status": "success", "message": f"Email enviado", "email_id": email.get("id")}
    except Exception as e:
        logger.error(f"Email error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

# ==================== PERMISSIONS LIST ====================

@api_router.get("/permissions")
async def get_available_permissions(current_user: dict = Depends(get_current_user)):
    return {
        "permissions": [
            {"key": "admin", "label": "Administrador Total", "description": "Acceso completo"},
            {"key": "users.read", "label": "Ver Usuarios", "description": "Ver lista de usuarios"},
            {"key": "users.write", "label": "Gestionar Usuarios", "description": "Crear/editar usuarios"},
            {"key": "companies.read", "label": "Ver Empresas", "description": "Ver empresas"},
            {"key": "companies.write", "label": "Gestionar Empresas", "description": "Crear/editar empresas"},
            {"key": "equipment.read", "label": "Ver Equipos", "description": "Ver inventario"},
            {"key": "equipment.write", "label": "Gestionar Equipos", "description": "Crear/editar equipos"},
            {"key": "assignments.read", "label": "Ver Asignaciones", "description": "Ver asignaciones"},
            {"key": "assignments.write", "label": "Gestionar Asignaciones", "description": "Asignar equipos"},
            {"key": "maintenance.read", "label": "Ver Mantenimientos", "description": "Ver bitácoras"},
            {"key": "maintenance.write", "label": "Gestionar Mantenimientos", "description": "Registrar mantenimientos"},
            {"key": "services.read", "label": "Ver Servicios", "description": "Ver servicios externos"},
            {"key": "services.write", "label": "Gestionar Servicios", "description": "Administrar servicios"},
            {"key": "quotations.read", "label": "Ver Cotizaciones", "description": "Ver cotizaciones"},
            {"key": "quotations.write", "label": "Gestionar Cotizaciones", "description": "Crear cotizaciones"},
            {"key": "invoices.read", "label": "Ver Facturas", "description": "Ver facturas"},
            {"key": "invoices.write", "label": "Gestionar Facturas", "description": "Crear facturas"},
            {"key": "reports.read", "label": "Ver Reportes", "description": "Ver reportes"},
            {"key": "reports.export", "label": "Exportar Reportes", "description": "Exportar PDF/Excel"},
            {"key": "custom_fields.write", "label": "Gestionar Campos", "description": "Crear campos personalizados"}
        ]
    }

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware, allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"], allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
