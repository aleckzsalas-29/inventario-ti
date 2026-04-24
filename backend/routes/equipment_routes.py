from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from database import db
from auth import get_current_user, check_permission
from models import (
    EquipmentCreate, EquipmentResponse,
    EquipmentLogCreate, EquipmentLogResponse,
    AssignmentCreate, AssignmentResponse,
    DecommissionCreate, DecommissionResponse
)
from helpers import generate_id, now_iso

router = APIRouter()


# ==================== EQUIPMENT ====================

@router.get("/equipment", response_model=List[EquipmentResponse])
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


@router.get("/equipment/{equipment_id}", response_model=EquipmentResponse)
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


@router.post("/equipment", response_model=EquipmentResponse)
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
        "status": eq_data.status, "observations": eq_data.observations,
        "processor_brand": eq_data.processor_brand, "processor_model": eq_data.processor_model,
        "processor_speed": eq_data.processor_speed, "ram_capacity": eq_data.ram_capacity,
        "ram_type": eq_data.ram_type, "storage_type": eq_data.storage_type,
        "storage_capacity": eq_data.storage_capacity,
        "os_name": eq_data.os_name, "os_version": eq_data.os_version, "os_license": eq_data.os_license,
        "antivirus_name": eq_data.antivirus_name, "antivirus_license": eq_data.antivirus_license,
        "antivirus_expiry": eq_data.antivirus_expiry,
        "office_version": eq_data.office_version, "office_license": eq_data.office_license,
        "ip_address": eq_data.ip_address, "mac_address": eq_data.mac_address,
        "windows_user": eq_data.windows_user, "windows_password": eq_data.windows_password,
        "email_account": eq_data.email_account, "email_password": eq_data.email_password,
        "cloud_user": eq_data.cloud_user, "cloud_password": eq_data.cloud_password,
        "custom_fields": eq_data.custom_fields, "assigned_to": eq_data.assigned_to, "created_at": now_iso()
    }
    await db.equipment.insert_one(equipment)
    company = await db.companies.find_one({"id": eq_data.company_id}, {"_id": 0})
    equipment["company_name"] = company["name"] if company else None
    if eq_data.branch_id:
        branch = await db.branches.find_one({"id": eq_data.branch_id}, {"_id": 0})
        equipment["branch_name"] = branch["name"] if branch else None
    if eq_data.assigned_to:
        employee = await db.employees.find_one({"id": eq_data.assigned_to}, {"_id": 0})
        equipment["assigned_employee_name"] = f"{employee['first_name']} {employee['last_name']}" if employee else None
    return EquipmentResponse(**equipment)


@router.put("/equipment/{equipment_id}", response_model=EquipmentResponse)
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


@router.delete("/equipment/{equipment_id}")
async def delete_equipment(equipment_id: str, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "equipment.write")
    result = await db.equipment.delete_one({"id": equipment_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    return {"message": "Equipo eliminado"}


# ==================== EQUIPMENT LOGS ====================

@router.get("/equipment/{equipment_id}/logs", response_model=List[EquipmentLogResponse])
async def get_equipment_logs(equipment_id: str, current_user: dict = Depends(get_current_user)):
    logs = await db.equipment_logs.find({"equipment_id": equipment_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    result = []
    for log in logs:
        if log.get("performed_by"):
            user = await db.users.find_one({"id": log["performed_by"]}, {"_id": 0})
            log["performed_by_name"] = user["name"] if user else None
        result.append(EquipmentLogResponse(**log))
    return result


@router.post("/equipment/{equipment_id}/logs", response_model=EquipmentLogResponse)
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


# ==================== ASSIGNMENTS ====================

@router.get("/assignments", response_model=List[AssignmentResponse])
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


@router.post("/assignments", response_model=AssignmentResponse)
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


@router.put("/assignments/{assignment_id}/return")
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


# ==================== DECOMMISSIONS ====================

@router.get("/decommissions", response_model=List[DecommissionResponse])
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


@router.post("/decommissions", response_model=DecommissionResponse)
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
