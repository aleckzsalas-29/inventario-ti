from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
from database import db
from auth import get_current_user, check_permission
from models import NotificationSettings, NotificationSendRequest, EmailTestRequest
from services.email_service import (
    send_email, get_email_template, send_automatic_notifications,
    update_scheduler_job, scheduler
)
from helpers import now_iso

router = APIRouter()


# ==================== NOTIFICATION SETTINGS ====================

@router.get("/notifications/settings")
async def get_notification_settings(current_user: dict = Depends(get_current_user)):
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
            "new_equipment_enabled": True,
            "recipient_type": "all_users",
            "custom_recipients": []
        }
        await db.notification_settings.insert_one(settings)
    return settings


@router.put("/notifications/settings")
async def update_notification_settings(settings_data: NotificationSettings, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "admin")
    update_data = settings_data.model_dump()
    update_data["type"] = "notifications"

    existing = await db.notification_settings.find_one({"type": "notifications"})
    if existing:
        await db.notification_settings.update_one({"type": "notifications"}, {"$set": update_data})
    else:
        await db.notification_settings.insert_one(update_data)

    # Update scheduler job
    await update_scheduler_job(
        enabled=settings_data.auto_send_enabled,
        send_time=settings_data.send_time
    )

    result = await db.notification_settings.find_one({"type": "notifications"}, {"_id": 0})
    return result


# ==================== IN-APP NOTIFICATION CHECK ====================

@router.get("/notifications/check")
async def check_notifications(current_user: dict = Depends(get_current_user)):
    """Check for pending notifications (maintenance and services)"""
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
                        "id": svc["id"],
                        "provider": svc.get("provider"),
                        "service_type": svc.get("service_type"),
                        "company_name": company.get("name") if company else "N/A",
                        "renewal_date": svc["renewal_date"],
                        "days_until": days_until
                    })
            except:
                pass

    return {
        "pending_maintenance": pending_maintenance,
        "expiring_services": sorted(expiring_services, key=lambda x: x.get("days_until", 999)),
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
    """Send a test email to verify configuration"""
    app_settings = await db.settings.find_one({"type": "system"}, {"_id": 0}) or {}
    template_data = {
        "company_name": app_settings.get("company_name", "InventarioTI"),
        "logo_url": app_settings.get("logo_url", ""),
        "primary_color": app_settings.get("primary_color", "#3b82f6"),
        "message": "Esta es una notificación de prueba. Si recibes este correo, la configuración de email está funcionando correctamente."
    }

    subject, html = get_email_template("test", template_data)
    result = await send_email(data.recipient_email, subject, html)

    if result.get("status") == "success":
        return {"message": f"Email de prueba enviado a {data.recipient_email}", "result": result}
    raise HTTPException(status_code=500, detail=f"Error enviando email: {result.get('error', 'Unknown')}")


@router.post("/notifications/email/send")
async def send_notification_email(data: NotificationSendRequest, current_user: dict = Depends(get_current_user)):
    """Send notification emails based on type"""
    await check_permission(current_user, "admin")

    app_settings = await db.settings.find_one({"type": "system"}, {"_id": 0}) or {}
    template_data = {
        "company_name": app_settings.get("company_name", "InventarioTI"),
        "logo_url": app_settings.get("logo_url", ""),
        "primary_color": app_settings.get("primary_color", "#3b82f6")
    }

    # Get data based on type
    if data.notification_type == "maintenance_pending":
        maintenances = await db.maintenance_logs.find(
            {"status": {"$in": ["Pendiente", "En Proceso"]}}, {"_id": 0}
        ).to_list(100)
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
                except:
                    pass
        template_data["services"] = sorted(expiring, key=lambda x: x.get("days_until", 999))
        if not expiring:
            return {"message": "No hay servicios próximos a renovar", "sent": 0}
    else:
        raise HTTPException(status_code=400, detail=f"Tipo de notificación no válido: {data.notification_type}")

    subject, html = get_email_template(data.notification_type, template_data)

    # Determine recipients
    if data.recipient_emails:
        recipients = data.recipient_emails
    else:
        users = await db.users.find({"is_active": True}, {"_id": 0, "email": 1}).to_list(100)
        recipients = [u["email"] for u in users if u.get("email")]

    results = []
    for email_addr in recipients:
        result = await send_email(email_addr, subject, html)
        results.append(result)

    # Log it
    await db.notification_history.insert_one({
        "sent_at": now_iso(),
        "type": "manual",
        "notification_type": data.notification_type,
        "total_sent": len([r for r in results if r.get("status") == "success"]),
        "total_failed": len([r for r in results if r.get("status") != "success"]),
        "triggered_by": current_user.get("name", current_user.get("email"))
    })

    successful = len([r for r in results if r.get("status") == "success"])
    return {"message": f"Notificaciones enviadas: {successful}/{len(recipients)}", "sent": successful, "results": results}


@router.post("/notifications/send-now")
async def trigger_automatic_notifications(current_user: dict = Depends(get_current_user)):
    """Manually trigger automatic notification check"""
    await check_permission(current_user, "admin")
    await send_automatic_notifications()
    return {"message": "Notificaciones automáticas ejecutadas"}


@router.get("/notifications/scheduler/status")
async def get_scheduler_status(current_user: dict = Depends(get_current_user)):
    """Get the current status of the notification scheduler"""
    job = scheduler.get_job("auto_notifications")
    running = scheduler.running if hasattr(scheduler, 'running') else False

    return {
        "scheduler_running": running,
        "job_active": job is not None,
        "next_run": str(job.next_run_time) if job else None,
        "job_id": "auto_notifications" if job else None
    }
