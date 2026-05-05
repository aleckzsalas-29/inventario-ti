from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List
from datetime import datetime, timezone
from database import db
from auth import get_current_user, check_permission
from models import NotificationSettings, NotificationSendRequest, EmailTestRequest
from services.email_service import (
    send_email, get_email_template, send_automatic_notifications,
    send_notifications_for_company, update_scheduler_job, scheduler
)
from helpers import now_iso

router = APIRouter()


# ==================== PER-COMPANY NOTIFICATION SETTINGS ====================

@router.get("/notifications/settings")
async def get_notification_settings(
    company_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get notification settings for a company. If no company_id, returns global defaults."""
    if company_id:
        settings = await db.notification_settings.find_one(
            {"type": "company_notifications", "company_id": company_id}, {"_id": 0}
        )
        if not settings:
            company = await db.companies.find_one({"id": company_id}, {"_id": 0, "name": 1})
            settings = {
                "type": "company_notifications",
                "company_id": company_id,
                "company_name": company.get("name", "") if company else "",
                "enabled": True,
                "auto_send_enabled": False,
                "send_time": "08:00",
                "service_renewal_enabled": True,
                "service_renewal_days": 30,
                "maintenance_pending_enabled": True,
                "maintenance_completed_enabled": True,
                "recipient_type": "all_users",
                "custom_recipients": []
            }
        return settings
    else:
        # Legacy: return old global settings or first company settings
        settings = await db.notification_settings.find_one({"type": "notifications"}, {"_id": 0})
        if not settings:
            settings = {
                "type": "notifications",
                "enabled": True,
                "auto_send_enabled": False,
                "send_time": "08:00",
                "service_renewal_enabled": True,
                "service_renewal_days": 30,
                "maintenance_pending_enabled": True,
                "maintenance_completed_enabled": True,
                "recipient_type": "all_users",
                "custom_recipients": []
            }
        return settings


@router.put("/notifications/settings")
async def update_notification_settings(
    settings_data: NotificationSettings,
    company_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    await check_permission(current_user, "admin")

    update_data = settings_data.model_dump()

    if company_id:
        update_data["type"] = "company_notifications"
        update_data["company_id"] = company_id
        company = await db.companies.find_one({"id": company_id}, {"_id": 0, "name": 1})
        update_data["company_name"] = company.get("name", "") if company else ""

        existing = await db.notification_settings.find_one(
            {"type": "company_notifications", "company_id": company_id}
        )
        if existing:
            await db.notification_settings.update_one(
                {"type": "company_notifications", "company_id": company_id},
                {"$set": update_data}
            )
        else:
            await db.notification_settings.insert_one(update_data)

        result = await db.notification_settings.find_one(
            {"type": "company_notifications", "company_id": company_id}, {"_id": 0}
        )
    else:
        update_data["type"] = "notifications"
        existing = await db.notification_settings.find_one({"type": "notifications"})
        if existing:
            await db.notification_settings.update_one({"type": "notifications"}, {"$set": update_data})
        else:
            await db.notification_settings.insert_one(update_data)
        result = await db.notification_settings.find_one({"type": "notifications"}, {"_id": 0})

    # Update scheduler based on whether any company has auto_send enabled
    any_auto = await db.notification_settings.count_documents(
        {"type": "company_notifications", "auto_send_enabled": True}
    )
    global_auto = settings_data.auto_send_enabled if not company_id else (any_auto > 0)
    await update_scheduler_job(enabled=global_auto, send_time=settings_data.send_time)

    return result


# ==================== ALL COMPANY SETTINGS (for overview) ====================

@router.get("/notifications/settings/all-companies")
async def get_all_company_notification_settings(current_user: dict = Depends(get_current_user)):
    """Returns notification settings for all companies"""
    companies = await db.companies.find({"is_active": {"$ne": False}}, {"_id": 0, "id": 1, "name": 1}).to_list(100)
    result = []
    for c in companies:
        settings = await db.notification_settings.find_one(
            {"type": "company_notifications", "company_id": c["id"]}, {"_id": 0}
        )
        result.append({
            "company_id": c["id"],
            "company_name": c.get("name", ""),
            "configured": settings is not None,
            "enabled": settings.get("enabled", False) if settings else False,
            "auto_send_enabled": settings.get("auto_send_enabled", False) if settings else False,
        })
    return result


# ==================== IN-APP NOTIFICATION CHECK ====================

@router.get("/notifications/check")
async def check_notifications(current_user: dict = Depends(get_current_user)):
    pending_maintenance = await db.maintenance_logs.find(
        {"status": {"$in": ["Pendiente", "En Proceso"]}},
        {"_id": 0, "id": 1, "maintenance_type": 1, "description": 1, "equipment_id": 1, "status": 1}
    ).to_list(50)
    for m in pending_maintenance:
        eq = await db.equipment.find_one({"id": m["equipment_id"]}, {"_id": 0})
        m["equipment_code"] = eq.get("inventory_code", "N/A") if eq else "N/A"

    today = datetime.now(timezone.utc)
    services = await db.external_services.find({"is_active": {"$ne": False}}, {"_id": 0}).to_list(500)
    expiring_services = []
    for svc in services:
        if svc.get("renewal_date"):
            try:
                renewal = datetime.fromisoformat(svc["renewal_date"].replace("Z", "+00:00"))
                days_until = (renewal - today).days
                if 0 <= days_until <= 30:
                    company = await db.companies.find_one({"id": svc.get("company_id")}, {"_id": 0})
                    expiring_services.append({
                        "id": svc["id"], "provider": svc.get("provider"),
                        "service_type": svc.get("service_type"),
                        "company_name": company.get("name") if company else "N/A",
                        "renewal_date": svc["renewal_date"], "days_until": days_until
                    })
            except Exception:
                pass

    return {
        "pending_maintenance": pending_maintenance,
        "expiring_services": sorted(expiring_services, key=lambda x: x.get("days_until", 999)),
        "completed_maintenance": await db.maintenance_logs.count_documents({"status": "Finalizado"}),
        "open_tickets": await db.tickets.count_documents({"status": {"$in": ["Abierto", "En Proceso"]}}),
        "total_alerts": len(pending_maintenance) + len(expiring_services)
    }


# ==================== NOTIFICATION HISTORY ====================

@router.get("/notifications/history")
async def get_notification_history(current_user: dict = Depends(get_current_user)):
    history = await db.notification_history.find({}, {"_id": 0}).sort("sent_at", -1).to_list(50)
    return history


# ==================== EMAIL NOTIFICATIONS ====================

@router.post("/notifications/email/test")
async def send_test_email(data: EmailTestRequest, current_user: dict = Depends(get_current_user)):
    app_settings = await db.settings.find_one({"type": "system"}, {"_id": 0}) or {}
    template_data = {
        "company_name": app_settings.get("company_name", "InventarioTI"),
        "logo_url": app_settings.get("logo_url", ""),
        "primary_color": app_settings.get("primary_color", "#3b82f6"),
        "message": "Esta es una notificacion de prueba. Si recibes este correo, la configuracion de email esta funcionando correctamente."
    }
    subject, html = get_email_template("test", template_data)
    result = await send_email(data.recipient_email, subject, html)
    if result.get("status") == "success":
        return {"message": f"Email de prueba enviado a {data.recipient_email}", "result": result}
    raise HTTPException(status_code=500, detail=f"Error enviando email: {result.get('error', 'Unknown')}")


@router.post("/notifications/email/send")
async def send_notification_email(
    data: NotificationSendRequest,
    company_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Send notification emails, optionally filtered by company"""
    await check_permission(current_user, "admin")

    # If company_id provided, send company-specific notifications
    if company_id:
        company = await db.companies.find_one({"id": company_id}, {"_id": 0})
        if not company:
            raise HTTPException(status_code=404, detail="Empresa no encontrada")
        notif_settings = await db.notification_settings.find_one(
            {"type": "company_notifications", "company_id": company_id}, {"_id": 0}
        ) or {"recipient_type": "all_users", "custom_recipients": []}

        if data.recipient_emails:
            notif_settings["recipient_type"] = "custom"
            notif_settings["custom_recipients"] = data.recipient_emails

        sent = await send_notifications_for_company(company_id, company, {
            **notif_settings,
            "service_renewal_enabled": data.notification_type == "service_renewal",
            "maintenance_pending_enabled": data.notification_type == "maintenance_pending",
            "maintenance_completed_enabled": data.notification_type == "maintenance_completed",
            "tickets_open_enabled": data.notification_type == "tickets_open",
        })
        await db.notification_history.insert_one({
            "sent_at": now_iso(), "type": "manual", "company_id": company_id,
            "company_name": company.get("name", ""),
            "notification_type": data.notification_type,
            "total_sent": len(sent),
            "triggered_by": current_user.get("name", current_user.get("email"))
        })
        return {"message": f"Notificaciones enviadas: {len(sent)}", "sent": len(sent)}

    # Global send (legacy behavior)
    app_settings = await db.settings.find_one({"type": "system"}, {"_id": 0}) or {}
    template_data = {
        "company_name": app_settings.get("company_name", "InventarioTI"),
        "logo_url": app_settings.get("logo_url", ""),
        "primary_color": app_settings.get("primary_color", "#3b82f6")
    }

    if data.notification_type == "maintenance_pending":
        maintenances = await db.maintenance_logs.find({"status": {"$in": ["Pendiente", "En Proceso"]}}, {"_id": 0}).to_list(100)
        for m in maintenances:
            eq = await db.equipment.find_one({"id": m["equipment_id"]}, {"_id": 0})
            m["equipment_code"] = eq.get("inventory_code", "N/A") if eq else "N/A"
        template_data["maintenances"] = maintenances
        if not maintenances:
            return {"message": "No hay mantenimientos pendientes", "sent": 0}
    elif data.notification_type == "service_renewal":
        today = datetime.now(timezone.utc)
        services = await db.external_services.find({"is_active": {"$ne": False}}, {"_id": 0}).to_list(500)
        expiring = []
        for svc in services:
            if svc.get("renewal_date"):
                try:
                    renewal = datetime.fromisoformat(svc["renewal_date"].replace("Z", "+00:00"))
                    days_until = (renewal - today).days
                    if 0 <= days_until <= 30:
                        expiring.append({**svc, "days_until": days_until})
                except Exception:
                    pass
        template_data["services"] = sorted(expiring, key=lambda x: x.get("days_until", 999))
        if not expiring:
            return {"message": "No hay servicios proximos a renovar", "sent": 0}
    elif data.notification_type == "maintenance_completed":
        completed = await db.maintenance_logs.find({"status": "Finalizado"}, {"_id": 0}).sort("completed_at", -1).to_list(50)
        for m in completed:
            eq = await db.equipment.find_one({"id": m.get("equipment_id")}, {"_id": 0})
            m["equipment_code"] = eq.get("inventory_code", "N/A") if eq else "N/A"
        template_data["maintenances"] = completed
        if not completed:
            return {"message": "No hay mantenimientos realizados", "sent": 0}
    elif data.notification_type == "tickets_open":
        tickets = await db.tickets.find({"status": {"$in": ["Abierto", "En Proceso"]}}, {"_id": 0}).to_list(100)
        template_data["tickets"] = tickets
        if not tickets:
            return {"message": "No hay tickets abiertos", "sent": 0}
    else:
        raise HTTPException(status_code=400, detail=f"Tipo no valido: {data.notification_type}")

    subject, html = get_email_template(data.notification_type, template_data)
    recipients = data.recipient_emails if data.recipient_emails else [u["email"] for u in await db.users.find({"is_active": True}, {"_id": 0, "email": 1}).to_list(100) if u.get("email")]

    results = []
    for email_addr in recipients:
        result = await send_email(email_addr, subject, html)
        results.append(result)

    await db.notification_history.insert_one({
        "sent_at": now_iso(), "type": "manual",
        "notification_type": data.notification_type,
        "total_sent": len([r for r in results if r.get("status") == "success"]),
        "total_failed": len([r for r in results if r.get("status") != "success"]),
        "triggered_by": current_user.get("name", current_user.get("email"))
    })
    successful = len([r for r in results if r.get("status") == "success"])
    return {"message": f"Notificaciones enviadas: {successful}/{len(recipients)}", "sent": successful, "results": results}


@router.post("/notifications/send-now")
async def trigger_automatic_notifications(
    company_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Manually trigger notifications - optionally for a specific company"""
    await check_permission(current_user, "admin")
    if company_id:
        company = await db.companies.find_one({"id": company_id}, {"_id": 0})
        if not company:
            raise HTTPException(status_code=404, detail="Empresa no encontrada")
        notif_settings = await db.notification_settings.find_one(
            {"type": "company_notifications", "company_id": company_id}, {"_id": 0}
        )
        if not notif_settings:
            return {"message": "No hay configuracion de notificaciones para esta empresa", "sent": 0}
        sent = await send_notifications_for_company(company_id, company, notif_settings)
        return {"message": f"Notificaciones enviadas para {company.get('name', '')}: {len(sent)}", "sent": len(sent)}
    else:
        await send_automatic_notifications()
        return {"message": "Notificaciones automaticas ejecutadas (todas las empresas)"}


@router.get("/notifications/scheduler/status")
async def get_scheduler_status(current_user: dict = Depends(get_current_user)):
    job = scheduler.get_job("auto_notifications")
    running = scheduler.running if hasattr(scheduler, 'running') else False
    return {
        "scheduler_running": running,
        "job_active": job is not None,
        "next_run": str(job.next_run_time) if job else None,
        "job_id": "auto_notifications" if job else None
    }
