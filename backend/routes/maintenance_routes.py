from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from database import db
from auth import get_current_user, check_permission
from models import MaintenanceLogCreate, MaintenanceLogResponse
from helpers import generate_id, now_iso
from services.email_service import send_email, get_email_template, get_recipients_for_notifications
import asyncio
import logging

router = APIRouter()


@router.get("/maintenance", response_model=List[MaintenanceLogResponse])
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
            log["equipment_type"] = eq.get("equipment_type")
            log["equipment_brand"] = eq.get("brand")
        if log.get("performed_by"):
            user = await db.users.find_one({"id": log["performed_by"]}, {"_id": 0})
            log["performed_by_name"] = user["name"] if user else None
        result.append(MaintenanceLogResponse(**log))
    return result


# Use a different path to avoid conflict with the GET /maintenance route
@router.get("/maintenance-logs", response_model=List[MaintenanceLogResponse])
async def get_maintenance_logs_alias(current_user: dict = Depends(get_current_user)):
    """Alias for getting all maintenance logs (used by frontend notifications)"""
    logs = await db.maintenance_logs.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    result = []
    for log in logs:
        eq = await db.equipment.find_one({"id": log["equipment_id"]}, {"_id": 0})
        if eq:
            log["equipment_code"] = eq.get("inventory_code")
            log["equipment_type"] = eq.get("equipment_type")
            log["equipment_brand"] = eq.get("brand")
        if log.get("performed_by"):
            user = await db.users.find_one({"id": log["performed_by"]}, {"_id": 0})
            log["performed_by_name"] = user["name"] if user else None
        result.append(MaintenanceLogResponse(**log))
    return result


@router.get("/maintenance/history/{equipment_id}", response_model=List[MaintenanceLogResponse])
async def get_equipment_maintenance_history(equipment_id: str, current_user: dict = Depends(get_current_user)):
    eq = await db.equipment.find_one({"id": equipment_id}, {"_id": 0})
    if not eq:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    logs = await db.maintenance_logs.find({"equipment_id": equipment_id}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    result = []
    for log in logs:
        log["equipment_code"] = eq.get("inventory_code")
        log["equipment_type"] = eq.get("equipment_type")
        log["equipment_brand"] = eq.get("brand")
        if log.get("performed_by"):
            user = await db.users.find_one({"id": log["performed_by"]}, {"_id": 0})
            log["performed_by_name"] = user["name"] if user else None
        result.append(MaintenanceLogResponse(**log))
    return result


@router.post("/maintenance", response_model=MaintenanceLogResponse)
async def create_maintenance_log(log_data: MaintenanceLogCreate, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "maintenance.write")
    eq = await db.equipment.find_one({"id": log_data.equipment_id})
    if not eq:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    maint_log = {
        "id": generate_id(), "equipment_id": log_data.equipment_id,
        "maintenance_type": log_data.maintenance_type, "description": log_data.description,
        "technician": log_data.technician,
        "performed_date": log_data.performed_date or now_iso()[:10],
        "checklist_items": log_data.checklist_items, "checklist_results": log_data.checklist_results,
        "next_maintenance_date": log_data.next_maintenance_date,
        "maintenance_frequency": log_data.maintenance_frequency,
        "problem_diagnosis": log_data.problem_diagnosis, "solution_applied": log_data.solution_applied,
        "repair_time_hours": log_data.repair_time_hours,
        "parts_used": log_data.parts_used, "parts_replaced": log_data.parts_replaced,
        "custom_fields": log_data.custom_fields, "status": "Pendiente",
        "created_at": now_iso(), "completed_at": None, "performed_by": current_user["id"]
    }
    await db.maintenance_logs.insert_one(maint_log)
    eq_log = {
        "id": generate_id(), "equipment_id": log_data.equipment_id, "log_type": "Mantenimiento",
        "description": f"Mantenimiento {log_data.maintenance_type}: {log_data.description}",
        "performed_by": current_user["id"], "created_at": now_iso()
    }
    await db.equipment_logs.insert_one(eq_log)
    maint_log["equipment_code"] = eq.get("inventory_code")
    maint_log["equipment_type"] = eq.get("equipment_type")
    maint_log["equipment_brand"] = eq.get("brand")
    maint_log["performed_by_name"] = current_user["name"]
    return MaintenanceLogResponse(**maint_log)


@router.put("/maintenance/{log_id}/start")
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


@router.put("/maintenance/{log_id}/complete")
async def complete_maintenance(log_id: str, notes: Optional[str] = None, solution: Optional[str] = None,
                               repair_time: Optional[float] = None, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "maintenance.write")
    log = await db.maintenance_logs.find_one({"id": log_id})
    if not log:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
    if log["status"] == "Finalizado":
        raise HTTPException(status_code=400, detail="El mantenimiento ya fue finalizado")
    update_data = {"status": "Finalizado", "completed_at": now_iso()}
    if notes:
        update_data["description"] = log["description"] + f" | Notas: {notes}"
    if solution:
        update_data["solution_applied"] = solution
    if repair_time:
        update_data["repair_time_hours"] = repair_time
    await db.maintenance_logs.update_one({"id": log_id}, {"$set": update_data})
    await db.equipment.update_one({"id": log["equipment_id"]}, {"$set": {"status": "Disponible"}})
    eq_log = {
        "id": generate_id(), "equipment_id": log["equipment_id"], "log_type": "Mantenimiento",
        "description": f"Mantenimiento {log['maintenance_type']} completado",
        "performed_by": current_user["id"], "created_at": now_iso()
    }
    await db.equipment_logs.insert_one(eq_log)

    # Send email notification for completed maintenance
    try:
        notif_settings = await db.notification_settings.find_one({"type": "notifications"}, {"_id": 0})
        if notif_settings and notif_settings.get("maintenance_completed_enabled", True):
            app_settings = await db.settings.find_one({"type": "system"}, {"_id": 0}) or {}
            eq = await db.equipment.find_one({"id": log["equipment_id"]}, {"_id": 0})
            updated_log = await db.maintenance_logs.find_one({"id": log_id}, {"_id": 0})
            updated_log["equipment_code"] = eq.get("inventory_code", "N/A") if eq else "N/A"

            template_data = {
                "company_name": app_settings.get("company_name", "InventarioTI"),
                "logo_url": app_settings.get("logo_url", ""),
                "primary_color": app_settings.get("primary_color", "#3b82f6"),
                "maintenances": [updated_log]
            }
            subject, html = get_email_template("maintenance_completed", template_data)
            recipients = await get_recipients_for_notifications()
            for email_addr in recipients:
                await send_email(email_addr, subject, html)
                await asyncio.sleep(0.1)
    except Exception as e:
        logging.error(f"Error sending maintenance completed email: {str(e)}")

    return {"message": "Mantenimiento finalizado"}
