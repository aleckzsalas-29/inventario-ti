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
        subject = f"⚠️ {company_name}: Servicios próximos a renovar"

        services_html = ''
        for svc in services:
            days = svc.get('days_until', 0)
            alert_class = 'alert-warning' if days <= 7 else 'alert-info'
            services_html += f'''
            <div class="alert {alert_class}">
                <strong>{svc.get('provider', 'N/A')}</strong> - {svc.get('service_type', 'N/A')}<br>
                <small>Vence en <strong>{days} días</strong> ({svc.get('renewal_date', '')[:10]})</small>
            </div>
            '''

        html = f'''
        <!DOCTYPE html>
        <html>
        <head>{base_style}</head>
        <body>
            <div class="container">
                <div class="header">{logo_html}</div>
                <div class="content">
                    <h2>Servicios Próximos a Renovar</h2>
                    <p>Los siguientes servicios requieren atención:</p>
                    {services_html}
                    <p>Te recomendamos revisar y renovar estos servicios a tiempo.</p>
                </div>
                <div class="footer">
                    Este es un mensaje automático de {company_name}.<br>
                    {datetime.now().strftime('%d/%m/%Y %H:%M')}
                </div>
            </div>
        </body>
        </html>
        '''

    elif notification_type == 'maintenance_pending':
        maintenances = data.get('maintenances', [])
        subject = f"🔧 {company_name}: Mantenimientos pendientes"

        maint_rows = ''
        for m in maintenances:
            maint_rows += f'''
            <tr>
                <td>{m.get('equipment_code', 'N/A')}</td>
                <td>{m.get('maintenance_type', 'N/A')}</td>
                <td>{m.get('status', 'N/A')}</td>
                <td>{m.get('created_at', '')[:10]}</td>
            </tr>
            '''

        html = f'''
        <!DOCTYPE html>
        <html>
        <head>{base_style}</head>
        <body>
            <div class="container">
                <div class="header">{logo_html}</div>
                <div class="content">
                    <h2>Mantenimientos Pendientes</h2>
                    <p>Tienes <strong>{len(maintenances)}</strong> mantenimiento(s) sin finalizar:</p>
                    <table>
                        <thead>
                            <tr><th>Equipo</th><th>Tipo</th><th>Estado</th><th>Fecha</th></tr>
                        </thead>
                        <tbody>{maint_rows}</tbody>
                    </table>
                    <p>Por favor, revisa y actualiza el estado de estos mantenimientos.</p>
                </div>
                <div class="footer">
                    Este es un mensaje automático de {company_name}.<br>
                    {datetime.now().strftime('%d/%m/%Y %H:%M')}
                </div>
            </div>
        </body>
        </html>
        '''

    elif notification_type == 'new_equipment':
        equipment = data.get('equipment', {})
        subject = f"✅ {company_name}: Nuevo equipo registrado"

        html = f'''
        <!DOCTYPE html>
        <html>
        <head>{base_style}</head>
        <body>
            <div class="container">
                <div class="header">{logo_html}</div>
                <div class="content">
                    <h2>Nuevo Equipo Registrado</h2>
                    <div class="alert alert-success">
                        <strong>Código:</strong> {equipment.get('inventory_code', 'N/A')}<br>
                        <strong>Tipo:</strong> {equipment.get('equipment_type', 'N/A')}<br>
                        <strong>Marca/Modelo:</strong> {equipment.get('brand', '')} {equipment.get('model', '')}<br>
                        <strong>No. Serie:</strong> {equipment.get('serial_number', 'N/A')}
                    </div>
                    <p>El equipo ha sido registrado correctamente en el sistema.</p>
                </div>
                <div class="footer">
                    Este es un mensaje automático de {company_name}.<br>
                    {datetime.now().strftime('%d/%m/%Y %H:%M')}
                </div>
            </div>
        </body>
        </html>
        '''

    else:
        subject = f"📢 {company_name}: Notificación"
        html = f'''
        <!DOCTYPE html>
        <html>
        <head>{base_style}</head>
        <body>
            <div class="container">
                <div class="header">{logo_html}</div>
                <div class="content">
                    <h2>Notificación</h2>
                    <p>{data.get('message', 'Tienes una nueva notificación.')}</p>
                </div>
                <div class="footer">
                    {company_name} - {datetime.now().strftime('%d/%m/%Y %H:%M')}
                </div>
            </div>
        </body>
        </html>
        '''

    return subject, html


async def send_email(recipient_email: str, subject: str, html_content: str) -> dict:
    """Send email using Resend API"""
    if not RESEND_API_KEY:
        return {"status": "error", "error": "Email service not configured"}

    params = {
        "from": SENDER_EMAIL,
        "to": [recipient_email],
        "subject": subject,
        "html": html_content
    }

    try:
        email = await asyncio.to_thread(resend.Emails.send, params)
        return {"status": "success", "email_id": email.get("id"), "recipient": recipient_email}
    except Exception as e:
        logging.error(f"Failed to send email to {recipient_email}: {str(e)}")
        return {"status": "error", "error": str(e), "recipient": recipient_email}


async def get_recipients_for_notifications():
    """Get list of recipient emails based on settings"""
    notif_settings = await db.notification_settings.find_one({"type": "notifications"}, {"_id": 0})
    if not notif_settings:
        notif_settings = {"recipient_type": "all_users", "custom_recipients": []}

    recipients = []

    if notif_settings.get("recipient_type") == "custom" and notif_settings.get("custom_recipients"):
        recipients = notif_settings["custom_recipients"]
    elif notif_settings.get("recipient_type") == "admins_only":
        admin_role = await db.roles.find_one({"name": "Administrador"}, {"id": 1})
        if admin_role:
            users = await db.users.find(
                {"is_active": True, "role_id": admin_role["id"]},
                {"_id": 0, "email": 1}
            ).to_list(100)
            recipients = [u["email"] for u in users if u.get("email")]
    else:
        users = await db.users.find({"is_active": True}, {"_id": 0, "email": 1}).to_list(100)
        recipients = [u["email"] for u in users if u.get("email")]

    companies = await db.companies.find({"email": {"$exists": True, "$ne": ""}}, {"_id": 0, "email": 1}).to_list(100)
    company_emails = [c["email"] for c in companies if c.get("email")]

    all_recipients = list(set(recipients + company_emails))
    return all_recipients


async def send_automatic_notifications():
    """Background task to send automatic notifications"""
    logging.info("Running automatic notification check...")

    try:
        notif_settings = await db.notification_settings.find_one({"type": "notifications"}, {"_id": 0})
        if not notif_settings or not notif_settings.get("enabled", True):
            logging.info("Notifications disabled, skipping...")
            return

        app_settings = await db.settings.find_one({"type": "system"}, {"_id": 0}) or {}

        recipients = await get_recipients_for_notifications()
        if not recipients:
            logging.info("No recipients configured, skipping...")
            return

        data = {
            "company_name": app_settings.get("company_name", "InventarioTI"),
            "logo_url": app_settings.get("logo_url", ""),
            "primary_color": app_settings.get("primary_color", "#3b82f6")
        }

        notifications_sent = []

        # Check service renewals
        if notif_settings.get("service_renewal_enabled", True):
            renewal_days = notif_settings.get("service_renewal_days", 30)
            today = datetime.now(timezone.utc)
            services = await db.external_services.find({"is_active": {"$ne": False}}, {"_id": 0}).to_list(500)
            expiring = []
            for svc in services:
                if svc.get("renewal_date"):
                    try:
                        renewal = datetime.fromisoformat(svc["renewal_date"].replace("Z", "+00:00"))
                        days_until = (renewal - today).days
                        if 0 <= days_until <= renewal_days:
                            expiring.append({**svc, "days_until": days_until})
                    except:
                        pass

            if expiring:
                data["services"] = sorted(expiring, key=lambda x: x.get("days_until", 999))
                subject, html = get_email_template("service_renewal", data)

                for email_addr in recipients:
                    result = await send_email(email_addr, subject, html)
                    if result.get("status") == "success":
                        notifications_sent.append({
                            "type": "service_renewal",
                            "recipient": email_addr,
                            "count": len(expiring)
                        })
                    await asyncio.sleep(0.1)

        # Check pending maintenances
        if notif_settings.get("maintenance_pending_enabled", True):
            maintenances = await db.maintenance_logs.find(
                {"status": {"$in": ["Pendiente", "En Proceso"]}},
                {"_id": 0}
            ).to_list(100)

            if maintenances:
                data["maintenances"] = maintenances
                subject, html = get_email_template("maintenance_pending", data)

                for email_addr in recipients:
                    result = await send_email(email_addr, subject, html)
                    if result.get("status") == "success":
                        notifications_sent.append({
                            "type": "maintenance_pending",
                            "recipient": email_addr,
                            "count": len(maintenances)
                        })
                    await asyncio.sleep(0.1)

        # Log notification history
        if notifications_sent:
            await db.notification_history.insert_one({
                "sent_at": now_iso(),
                "type": "automatic",
                "notifications": notifications_sent,
                "total_sent": len(notifications_sent)
            })
            logging.info(f"Automatic notifications sent: {len(notifications_sent)}")
        else:
            logging.info("No notifications to send")

    except Exception as e:
        logging.error(f"Error sending automatic notifications: {str(e)}")


async def update_scheduler_job(enabled: bool, send_time: str):
    """Update the scheduler job based on settings"""
    job_id = "auto_notifications"

    if scheduler.get_job(job_id):
        scheduler.remove_job(job_id)

    if enabled:
        try:
            hour, minute = map(int, send_time.split(":"))
        except:
            hour, minute = 8, 0

        scheduler.add_job(
            send_automatic_notifications,
            CronTrigger(hour=hour, minute=minute),
            id=job_id,
            replace_existing=True
        )
        logging.info(f"Scheduled automatic notifications at {hour:02d}:{minute:02d}")
