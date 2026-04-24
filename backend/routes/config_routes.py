from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from database import db
from auth import get_current_user, check_permission
from models import CustomFieldCreate, CustomFieldResponse, SystemSettings
from helpers import generate_id

router = APIRouter()


# ==================== CUSTOM FIELDS ====================

@router.get("/custom-fields", response_model=List[CustomFieldResponse])
async def get_custom_fields(entity_type: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {"is_active": {"$ne": False}}
    if entity_type:
        query["entity_type"] = entity_type
    fields = await db.custom_fields.find(query, {"_id": 0}).to_list(200)
    return [CustomFieldResponse(**f) for f in fields]


@router.post("/custom-fields", response_model=CustomFieldResponse)
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
        "validation": field_data.validation.model_dump() if field_data.validation else None,
        "placeholder": field_data.placeholder,
        "help_text": field_data.help_text,
        "is_active": True
    }
    await db.custom_fields.insert_one(field)
    return CustomFieldResponse(**field)


@router.put("/custom-fields/{field_id}", response_model=CustomFieldResponse)
async def update_custom_field(field_id: str, field_data: CustomFieldCreate, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "custom_fields.write")
    update_data = {
        "entity_type": field_data.entity_type,
        "name": field_data.name,
        "field_type": field_data.field_type,
        "options": field_data.options,
        "required": field_data.required,
        "category": field_data.category,
        "validation": field_data.validation.model_dump() if field_data.validation else None,
        "placeholder": field_data.placeholder,
        "help_text": field_data.help_text
    }
    result = await db.custom_fields.update_one({"id": field_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Campo no encontrado")
    field = await db.custom_fields.find_one({"id": field_id}, {"_id": 0})
    return CustomFieldResponse(**field)


@router.delete("/custom-fields/{field_id}")
async def delete_custom_field(field_id: str, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "custom_fields.write")
    result = await db.custom_fields.update_one({"id": field_id}, {"$set": {"is_active": False}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Campo no encontrado")
    return {"message": "Campo eliminado"}


# ==================== DASHBOARD ====================

@router.get("/dashboard/stats")
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


@router.get("/dashboard/advanced-stats")
async def get_advanced_dashboard_stats(current_user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc)

    # Build company filter for multi-tenant
    company_filter = {}
    eq_id_filter = {}
    if current_user.get("company_id"):
        company_filter["company_id"] = current_user["company_id"]
        eq_list = await db.equipment.find({"company_id": current_user["company_id"]}, {"id": 1}).to_list(1000)
        eq_ids = [e["id"] for e in eq_list]
        eq_id_filter = {"equipment_id": {"$in": eq_ids}}

    # --- Maintenance by month (last 6 months) ---
    six_months_ago = now - timedelta(days=180)
    maint_match = {"created_at": {"$gte": six_months_ago.isoformat()}}
    if eq_id_filter:
        maint_match.update(eq_id_filter)
    maintenance_pipeline = [
        {"$match": maint_match},
        {"$addFields": {"month": {"$substr": ["$created_at", 0, 7]}}},
        {"$group": {
            "_id": {"month": "$month", "maintenance_type": "$maintenance_type"},
            "count": {"$sum": 1}
        }},
        {"$sort": {"_id.month": 1}}
    ]
    maint_by_month_raw = await db.maintenance_logs.aggregate(maintenance_pipeline).to_list(100)

    months_set = sorted(set(r["_id"]["month"] for r in maint_by_month_raw))
    maint_by_month = []
    for month in months_set:
        entry = {"month": month, "Preventivo": 0, "Correctivo": 0, "Reparacion": 0, "Otro": 0}
        for r in maint_by_month_raw:
            if r["_id"]["month"] == month:
                entry[r["_id"]["maintenance_type"]] = r["count"]
        entry["total"] = entry["Preventivo"] + entry["Correctivo"] + entry["Reparacion"] + entry["Otro"]
        maint_by_month.append(entry)

    # --- Maintenance status distribution ---
    maint_status_match = eq_id_filter if eq_id_filter else {}
    status_pipeline = [
        {"$match": maint_status_match} if maint_status_match else {"$match": {}},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    maint_status_raw = await db.maintenance_logs.aggregate(status_pipeline).to_list(10)
    maintenance_by_status = [{"status": r["_id"] or "Sin estado", "count": r["count"]} for r in maint_status_raw]

    # --- Average resolution time (completed maintenances) ---
    completed_query = {"status": "Finalizado", "completed_at": {"$exists": True}, "created_at": {"$exists": True}}
    if eq_id_filter:
        completed_query.update(eq_id_filter)
    completed_logs = await db.maintenance_logs.find(
        completed_query, {"_id": 0, "created_at": 1, "completed_at": 1}
    ).to_list(500)

    resolution_times = []
    for log in completed_logs:
        try:
            created = datetime.fromisoformat(log["created_at"].replace("Z", "+00:00"))
            completed = datetime.fromisoformat(log["completed_at"].replace("Z", "+00:00"))
            diff_hours = (completed - created).total_seconds() / 3600
            if diff_hours >= 0:
                resolution_times.append(diff_hours)
        except Exception:
            pass

    avg_resolution_hours = round(sum(resolution_times) / len(resolution_times), 1) if resolution_times else 0

    # --- Top equipment with most maintenance (top 5) ---
    top_eq_match = eq_id_filter if eq_id_filter else {}
    top_eq_pipeline = [
        {"$match": top_eq_match} if top_eq_match else {"$match": {}},
        {"$group": {"_id": "$equipment_id", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 5}
    ]
    top_equipment_raw = await db.maintenance_logs.aggregate(top_eq_pipeline).to_list(5)
    top_equipment = []
    for item in top_equipment_raw:
        eq = await db.equipment.find_one({"id": item["_id"]}, {"_id": 0, "inventory_code": 1, "equipment_type": 1, "brand": 1, "model": 1})
        if eq:
            top_equipment.append({
                "equipment_id": item["_id"],
                "code": eq.get("inventory_code", "N/A"),
                "type": eq.get("equipment_type", ""),
                "brand_model": f"{eq.get('brand', '')} {eq.get('model', '')}".strip(),
                "count": item["count"]
            })

    # --- Equipment by status (for pie chart) ---
    eq_status_match = company_filter if company_filter else {}
    eq_status_pipeline = [
        {"$match": eq_status_match} if eq_status_match else {"$match": {}},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    eq_by_status_raw = await db.equipment.aggregate(eq_status_pipeline).to_list(10)
    equipment_by_status = [{"status": r["_id"] or "Sin estado", "count": r["count"]} for r in eq_by_status_raw]

    # --- Services expiring soon (next 30 days) ---
    expiring_services = 0
    svc_query = {"is_active": {"$ne": False}, "renewal_date": {"$exists": True}}
    if company_filter:
        svc_query.update(company_filter)
    services = await db.external_services.find(svc_query, {"_id": 0, "renewal_date": 1}).to_list(500)
    for svc in services:
        try:
            renewal = datetime.fromisoformat(svc["renewal_date"].replace("Z", "+00:00"))
            if 0 <= (renewal - now).days <= 30:
                expiring_services += 1
        except Exception:
            pass

    # --- Monthly equipment additions (last 6 months) ---
    eq_month_match = {"created_at": {"$gte": six_months_ago.isoformat()}}
    if company_filter:
        eq_month_match.update(company_filter)
    eq_by_month_pipeline = [
        {"$match": eq_month_match},
        {"$addFields": {"month": {"$substr": ["$created_at", 0, 7]}}},
        {"$group": {"_id": "$month", "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}}
    ]
    eq_by_month_raw = await db.equipment.aggregate(eq_by_month_pipeline).to_list(12)
    equipment_by_month = [{"month": r["_id"], "count": r["count"]} for r in eq_by_month_raw]

    return {
        "maintenance_by_month": maint_by_month,
        "maintenance_by_status": maintenance_by_status,
        "avg_resolution_hours": avg_resolution_hours,
        "total_completed": len(resolution_times),
        "top_equipment_incidents": top_equipment,
        "equipment_by_status": equipment_by_status,
        "equipment_by_month": equipment_by_month,
        "expiring_services_30d": expiring_services
    }



# ==================== PERMISSIONS ====================

@router.get("/permissions")
async def get_all_permissions(current_user: dict = Depends(get_current_user)):
    """Return all available permissions for role assignment"""
    return {
        "permissions": [
            {"key": "admin", "label": "Administrador", "description": "Acceso completo al sistema"},
            {"key": "users.read", "label": "Ver Usuarios", "description": "Puede ver la lista de usuarios"},
            {"key": "users.write", "label": "Gestionar Usuarios", "description": "Puede crear, editar y desactivar usuarios"},
            {"key": "companies.read", "label": "Ver Empresas", "description": "Puede ver empresas, sucursales y empleados"},
            {"key": "companies.write", "label": "Gestionar Empresas", "description": "Puede crear y editar empresas, sucursales y empleados"},
            {"key": "equipment.read", "label": "Ver Equipos", "description": "Puede ver el inventario de equipos"},
            {"key": "equipment.write", "label": "Gestionar Equipos", "description": "Puede crear, editar y dar de baja equipos"},
            {"key": "maintenance.read", "label": "Ver Mantenimientos", "description": "Puede ver registros de mantenimiento"},
            {"key": "maintenance.write", "label": "Gestionar Mantenimientos", "description": "Puede crear y completar mantenimientos"},
            {"key": "assignments.read", "label": "Ver Asignaciones", "description": "Puede ver asignaciones de equipos"},
            {"key": "assignments.write", "label": "Gestionar Asignaciones", "description": "Puede asignar y devolver equipos"},
            {"key": "services.read", "label": "Ver Servicios", "description": "Puede ver servicios externos"},
            {"key": "services.write", "label": "Gestionar Servicios", "description": "Puede crear y editar servicios externos"},
            {"key": "quotations.read", "label": "Ver Cotizaciones", "description": "Puede ver cotizaciones"},
            {"key": "quotations.write", "label": "Gestionar Cotizaciones", "description": "Puede crear y editar cotizaciones"},
            {"key": "invoices.read", "label": "Ver Facturas", "description": "Puede ver facturas"},
            {"key": "invoices.write", "label": "Gestionar Facturas", "description": "Puede crear y editar facturas"},
            {"key": "custom_fields.read", "label": "Ver Campos Personalizados", "description": "Puede ver campos personalizados"},
            {"key": "custom_fields.write", "label": "Gestionar Campos Personalizados", "description": "Puede crear y editar campos personalizados"},
        ]
    }


@router.get("/permissions/check")
async def check_user_permission(permission: str, current_user: dict = Depends(get_current_user)):
    if current_user.get("role_id"):
        role = await db.roles.find_one({"id": current_user["role_id"]}, {"_id": 0})
        if role and (permission in role.get("permissions", []) or "admin" in role.get("permissions", [])):
            return {"has_permission": True}
    return {"has_permission": False}


# ==================== SETTINGS ====================

@router.get("/settings")
async def get_settings(current_user: dict = Depends(get_current_user)):
    settings = await db.settings.find_one({"type": "system"}, {"_id": 0})
    if not settings:
        settings = {
            "type": "system",
            "company_name": "",
            "logo_url": "",
            "primary_color": "#3b82f6",
            "login_background_url": "",
            "login_title": "",
            "login_subtitle": ""
        }
        await db.settings.insert_one(settings)
    return settings


@router.put("/settings")
async def update_settings(settings_data: SystemSettings, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "admin")
    update_data = settings_data.model_dump(exclude_none=False)
    update_data["type"] = "system"

    existing = await db.settings.find_one({"type": "system"})
    if existing:
        await db.settings.update_one({"type": "system"}, {"$set": update_data})
    else:
        await db.settings.insert_one(update_data)

    result = await db.settings.find_one({"type": "system"}, {"_id": 0})
    return result


@router.get("/settings/public")
async def get_public_settings():
    """Get settings without auth (for login page customization)"""
    settings = await db.settings.find_one({"type": "system"}, {"_id": 0})
    if not settings:
        return {
            "company_name": "",
            "logo_url": "",
            "primary_color": "#3b82f6",
            "login_background_url": "",
            "login_title": "",
            "login_subtitle": ""
        }
    return {
        "company_name": settings.get("company_name", ""),
        "logo_url": settings.get("logo_url", ""),
        "primary_color": settings.get("primary_color", "#3b82f6"),
        "login_background_url": settings.get("login_background_url", ""),
        "login_title": settings.get("login_title", ""),
        "login_subtitle": settings.get("login_subtitle", "")
    }
