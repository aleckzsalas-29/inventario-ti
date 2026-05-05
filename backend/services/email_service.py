import logging
import asyncio
import resend
from datetime import datetime, timezone
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from database import db
from config import RESEND_API_KEY, SENDER_EMAIL
from helpers import now_iso

if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY

scheduler = AsyncIOScheduler()


def get_email_template(notification_type: str, data: dict) -> tuple:
    """Generate email subject and HTML content based on notification type"""
    company_name = data.get('company_name', 'InventarioTI')
    logo_url = data.get('logo_url', '')
    primary_color = data.get('primary_color', '#3b82f6')

    logo_html = f'<img src="{logo_url}" alt="{company_name}" style="max-height:50px;max-width:200px;">' if logo_url else f'<h2 style="color:{primary_color};margin:0;">{company_name}</h2>'

    base_style = f'''
    <style>
        body {{ font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }}
        .container {{ max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
        .header {{ background: {primary_color}; padding: 20px; text-align: center; }}
        .header img, .header h2 {{ margin: 0; }}
        .content {{ padding: 30px; }}
        .footer {{ background: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #666; }}
        .btn {{ display: inline-block; padding: 12px 24px; background: {primary_color}; color: white; text-decoration: none; border-radius: 6px; margin-top: 15px; }}
        .alert {{ padding: 15px; border-radius: 6px; margin: 15px 0; }}
        .alert-warning {{ background: #fff3cd; border-left: 4px solid #ffc107; }}
        .alert-info {{ background: #cce5ff; border-left: 4px solid #0d6efd; }}
        .alert-success {{ background: #d4edda; border-left: 4px solid #28a745; }}
        table {{ width: 100%; border-collapse: collapse; margin: 15px 0; }}
        th, td {{ padding: 10px; text-align: left; border-bottom: 1px solid #eee; }}
        th {{ background: #f8f9fa; font-weight: 600; }}
    </style>
    '''

    if notification_type == 'service_renewal':
        services = data.get('services', [])
        subject = f"{company_name}: Servicios proximos a renovar"
        services_html = ''
        for svc in services:
            days = svc.get('days_until', 0)
            alert_class = 'alert-warning' if days <= 7 else 'alert-info'
            services_html += f'''
            <div class="alert {alert_class}">
                <strong>{svc.get('provider', 'N/A')}</strong> - {svc.get('service_type', 'N/A')}<br>
                <small>Vence en <strong>{days} dias</strong> ({svc.get('renewal_date', '')[:10]})</small>
            </div>'''
        html = f'''<!DOCTYPE html><html><head>{base_style}</head><body>
            <div class="container"><div class="header">{logo_html}</div>
            <div class="content"><h2>Servicios Proximos a Renovar</h2>
            <p>Los siguientes servicios requieren atencion:</p>{services_html}
            <p>Te recomendamos revisar y renovar estos servicios a tiempo.</p></div>
            <div class="footer">Mensaje automatico de {company_name} - {datetime.now().strftime('%d/%m/%Y %H:%M')}</div>
            </div></body></html>'''

    elif notification_type == 'maintenance_pending':
        maintenances = data.get('maintenances', [])
        subject = f"{company_name}: Mantenimientos pendientes"
        maint_rows = ''
        for m in maintenances:
            maint_rows += f'<tr><td>{m.get("equipment_code", "N/A")}</td><td>{m.get("maintenance_type", "N/A")}</td><td>{m.get("status", "N/A")}</td><td>{m.get("created_at", "")[:10]}</td></tr>'
        html = f'''<!DOCTYPE html><html><head>{base_style}</head><body>
            <div class="container"><div class="header">{logo_html}</div>
            <div class="content"><h2>Mantenimientos Pendientes</h2>
            <p>Tienes <strong>{len(maintenances)}</strong> mantenimiento(s) sin finalizar:</p>
            <table><thead><tr><th>Equipo</th><th>Tipo</th><th>Estado</th><th>Fecha</th></tr></thead>
            <tbody>{maint_rows}</tbody></table>
            <p>Por favor, revisa y actualiza el estado de estos mantenimientos.</p></div>
            <div class="footer">Mensaje automatico de {company_name} - {datetime.now().strftime('%d/%m/%Y %H:%M')}</div>
            </div></body></html>'''

    elif notification_type == 'maintenance_completed':
        maintenances = data.get('maintenances', [])
        subject = f"{company_name}: Mantenimientos realizados"
        maint_details = ''
        for m in maintenances:
            detail_rows = f'<strong>Descripcion:</strong> {m.get("description", "")}<br>'
            if m.get('technician'):
                detail_rows += f'<strong>Tecnico:</strong> {m["technician"]}<br>'
            if m.get('problem_diagnosis'):
                detail_rows += f'<strong>Diagnostico:</strong> {m["problem_diagnosis"]}<br>'
            if m.get('solution_applied'):
                detail_rows += f'<strong>Solucion:</strong> {m["solution_applied"]}<br>'
            if m.get('repair_time_hours'):
                detail_rows += f'<strong>Tiempo:</strong> {m["repair_time_hours"]} horas<br>'
            if m.get('parts_used'):
                detail_rows += f'<strong>Materiales:</strong> {m["parts_used"]}<br>'
            completed_at = m.get('completed_at', m.get('created_at', ''))[:10]
            maint_details += f'''<div class="alert alert-success" style="margin-bottom:10px;">
                <strong>{m.get("equipment_code","N/A")} - {m.get("maintenance_type","N/A")}</strong>
                <span style="float:right;font-size:12px;color:#666;">Completado: {completed_at}</span>
                <hr style="margin:8px 0;border:none;border-top:1px solid #ccc;"><div style="font-size:13px;">{detail_rows}</div></div>'''
        html = f'''<!DOCTYPE html><html><head>{base_style}</head><body>
            <div class="container"><div class="header">{logo_html}</div>
            <div class="content"><h2>Mantenimientos Realizados</h2>
            <p>Se han completado <strong>{len(maintenances)}</strong> mantenimiento(s):</p>{maint_details}</div>
            <div class="footer">Mensaje automatico de {company_name} - {datetime.now().strftime('%d/%m/%Y %H:%M')}</div>
            </div></body></html>'''

    elif notification_type == 'tickets_open':
        tickets = data.get('tickets', [])
        subject = f"{company_name}: Tickets de soporte abiertos"
        tickets_rows = ''
        for t in tickets:
            priority_colors = {"Baja": "#64748b", "Media": "#3b82f6", "Alta": "#f59e0b", "Critica": "#ef4444"}
            p_color = priority_colors.get(t.get('priority', ''), '#3b82f6')
            tickets_rows += f'<tr><td>{t.get("ticket_number", "")}</td><td>{t.get("title", "")[:40]}</td><td style="color:{p_color};font-weight:600;">{t.get("priority", "")}</td><td>{t.get("status", "")}</td><td>{t.get("created_at", "")[:10]}</td></tr>'
        html = f'''<!DOCTYPE html><html><head>{base_style}</head><body>
            <div class="container"><div class="header">{logo_html}</div>
            <div class="content"><h2>Tickets de Soporte Abiertos</h2>
            <p>Hay <strong>{len(tickets)}</strong> ticket(s) pendientes de atender:</p>
            <table><thead><tr><th>No.</th><th>Titulo</th><th>Prioridad</th><th>Estado</th><th>Fecha</th></tr></thead>
            <tbody>{tickets_rows}</tbody></table>
            <p>Por favor, revisa y atiende estos tickets.</p></div>
            <div class="footer">Mensaje automatico de {company_name} - {datetime.now().strftime('%d/%m/%Y %H:%M')}</div>
            </div></body></html>'''

    else:
        subject = f"{company_name}: Notificacion"
        html = f'''<!DOCTYPE html><html><head>{base_style}</head><body>
            <div class="container"><div class="header">{logo_html}</div>
            <div class="content"><h2>Notificacion</h2><p>{data.get('message', 'Tienes una nueva notificacion.')}</p></div>
            <div class="footer">{company_name} - {datetime.now().strftime('%d/%m/%Y %H:%M')}</div>
            </div></body></html>'''

    return subject, html


async def send_email(recipient_email: str, subject: str, html_content: str) -> dict:
    """Send email using Resend API"""
    if not RESEND_API_KEY:
        return {"status": "error", "error": "Email service not configured"}
    params = {"from": SENDER_EMAIL, "to": [recipient_email], "subject": subject, "html": html_content}
    try:
        email = await asyncio.to_thread(resend.Emails.send, params)
        return {"status": "success", "email_id": email.get("id"), "recipient": recipient_email}
    except Exception as e:
        logging.error(f"Failed to send email to {recipient_email}: {str(e)}")
        return {"status": "error", "error": str(e), "recipient": recipient_email}


async def get_recipients_for_company(company_id: str, notif_settings: dict) -> list:
    """Get recipient emails for a specific company based on its notification settings"""
    recipients = []
    recipient_type = notif_settings.get("recipient_type", "all_users")

    if recipient_type == "custom" and notif_settings.get("custom_recipients"):
        recipients = list(notif_settings["custom_recipients"])
    elif recipient_type == "admins_only":
        admin_role = await db.roles.find_one({"name": "Administrador"}, {"id": 1})
        if admin_role:
            users = await db.users.find(
                {"is_active": True, "role_id": admin_role["id"], "company_id": company_id},
                {"_id": 0, "email": 1}
            ).to_list(100)
            recipients = [u["email"] for u in users if u.get("email")]
    else:
        users = await db.users.find(
            {"is_active": True, "company_id": company_id},
            {"_id": 0, "email": 1}
        ).to_list(100)
        recipients = [u["email"] for u in users if u.get("email")]

    return list(set(recipients))


async def get_global_admin_emails() -> list:
    """Get emails of admin users without a company (global admins only)"""
    admins = await db.users.find(
        {"is_active": True, "company_id": {"$in": [None, ""]}},
        {"_id": 0, "email": 1}
    ).to_list(50)
    return list(set([a["email"] for a in admins if a.get("email")]))


async def send_notifications_for_company(company_id: str, company: dict, notif_settings: dict):
    """Send notifications for a single company"""
    company_name = company.get("name", "Empresa")
    logo_url = company.get("logo_url", "")
    data = {"company_name": company_name, "logo_url": logo_url, "primary_color": "#3b82f6"}

    recipients = await get_recipients_for_company(company_id, notif_settings)
    global_admins = await get_global_admin_emails()
    all_recipients = list(set(recipients + global_admins))

    if not all_recipients:
        return []

    eq_ids_docs = await db.equipment.find({"company_id": company_id}, {"id": 1}).to_list(1000)
    eq_ids = [e["id"] for e in eq_ids_docs]

    notifications_sent = []

    # Service renewals
    if notif_settings.get("service_renewal_enabled", True) and eq_ids:
        renewal_days = notif_settings.get("service_renewal_days", 30)
        today = datetime.now(timezone.utc)
        services = await db.external_services.find(
            {"is_active": {"$ne": False}, "company_id": company_id}, {"_id": 0}
        ).to_list(500)
        expiring = []
        for svc in services:
            if svc.get("renewal_date"):
                try:
                    renewal = datetime.fromisoformat(svc["renewal_date"].replace("Z", "+00:00"))
                    days_until = (renewal - today).days
                    if 0 <= days_until <= renewal_days:
                        expiring.append({**svc, "days_until": days_until})
                except Exception:
                    pass
        if expiring:
            data["services"] = sorted(expiring, key=lambda x: x.get("days_until", 999))
            subject, html = get_email_template("service_renewal", data)
            for email_addr in all_recipients:
                result = await send_email(email_addr, subject, html)
                if result.get("status") == "success":
                    notifications_sent.append({"type": "service_renewal", "recipient": email_addr, "company": company_name, "count": len(expiring)})
                await asyncio.sleep(0.1)

    # Pending maintenances
    if notif_settings.get("maintenance_pending_enabled", True) and eq_ids:
        maintenances = await db.maintenance_logs.find(
            {"status": {"$in": ["Pendiente", "En Proceso"]}, "equipment_id": {"$in": eq_ids}}, {"_id": 0}
        ).to_list(100)
        for m in maintenances:
            eq = await db.equipment.find_one({"id": m["equipment_id"]}, {"_id": 0, "inventory_code": 1})
            m["equipment_code"] = eq.get("inventory_code", "N/A") if eq else "N/A"
        if maintenances:
            data["maintenances"] = maintenances
            subject, html = get_email_template("maintenance_pending", data)
            for email_addr in all_recipients:
                result = await send_email(email_addr, subject, html)
                if result.get("status") == "success":
                    notifications_sent.append({"type": "maintenance_pending", "recipient": email_addr, "company": company_name, "count": len(maintenances)})
                await asyncio.sleep(0.1)

    # Completed maintenances (last 24h)
    if notif_settings.get("maintenance_completed_enabled", True) and eq_ids:
        yesterday = datetime.now(timezone.utc).isoformat()[:10]
        completed = await db.maintenance_logs.find(
            {"status": "Finalizado", "completed_at": {"$gte": yesterday}, "equipment_id": {"$in": eq_ids}}, {"_id": 0}
        ).to_list(100)
        for m in completed:
            eq = await db.equipment.find_one({"id": m.get("equipment_id")}, {"_id": 0, "inventory_code": 1})
            m["equipment_code"] = eq.get("inventory_code", "N/A") if eq else "N/A"
        if completed:
            data["maintenances"] = completed
            subject, html = get_email_template("maintenance_completed", data)
            for email_addr in all_recipients:
                result = await send_email(email_addr, subject, html)
                if result.get("status") == "success":
                    notifications_sent.append({"type": "maintenance_completed", "recipient": email_addr, "company": company_name, "count": len(completed)})
                await asyncio.sleep(0.1)

    # Open tickets
    if notif_settings.get("tickets_open_enabled", True):
        tickets = await db.tickets.find(
            {"status": {"$in": ["Abierto", "En Proceso"]}}, {"_id": 0}
        ).to_list(100)
        # Filter tickets by equipment belonging to this company
        if eq_ids:
            company_tickets = [t for t in tickets if t.get("equipment_id") in eq_ids or not t.get("equipment_id")]
        else:
            company_tickets = tickets
        if company_tickets:
            data["tickets"] = company_tickets
            subject, html = get_email_template("tickets_open", data)
            for email_addr in all_recipients:
                result = await send_email(email_addr, subject, html)
                if result.get("status") == "success":
                    notifications_sent.append({"type": "tickets_open", "recipient": email_addr, "company": company_name, "count": len(company_tickets)})
                await asyncio.sleep(0.1)

    return notifications_sent


async def send_automatic_notifications():
    """Background task: iterate companies with enabled notifications and send per-company emails"""
    logging.info("Running automatic notification check (per-company)...")
    try:
        companies = await db.companies.find({"is_active": {"$ne": False}}, {"_id": 0}).to_list(100)
        all_notifications = []

        for company in companies:
            company_id = company.get("id")
            if not company_id:
                continue

            notif_settings = await db.notification_settings.find_one(
                {"type": "company_notifications", "company_id": company_id}, {"_id": 0}
            )
            if not notif_settings:
                continue
            if not notif_settings.get("enabled", True):
                continue
            if not notif_settings.get("auto_send_enabled", False):
                continue

            sent = await send_notifications_for_company(company_id, company, notif_settings)
            all_notifications.extend(sent)

        if all_notifications:
            await db.notification_history.insert_one({
                "sent_at": now_iso(),
                "type": "automatic",
                "notifications": all_notifications,
                "total_sent": len(all_notifications)
            })
            logging.info(f"Automatic notifications sent: {len(all_notifications)}")
        else:
            logging.info("No notifications to send")
    except Exception as e:
        logging.error(f"Error in automatic notifications: {str(e)}")


async def update_scheduler_job(enabled: bool, send_time: str):
    """Update the scheduler job based on settings"""
    job_id = "auto_notifications"
    if scheduler.get_job(job_id):
        scheduler.remove_job(job_id)
    if enabled:
        try:
            hour, minute = map(int, send_time.split(":"))
        except Exception:
            hour, minute = 8, 0
        scheduler.add_job(
            send_automatic_notifications,
            CronTrigger(hour=hour, minute=minute),
            id=job_id,
            replace_existing=True
        )
        logging.info(f"Scheduled automatic notifications at {hour:02d}:{minute:02d}")
