import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import CORS_ORIGINS
from database import db
from auth import hash_password
from helpers import generate_id, now_iso
from routes import api_router
from services.email_service import scheduler, update_scheduler_job

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="InventarioTI API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


async def init_default_roles():
    """Initialize default roles and admin user if they don't exist"""
    admin_role = await db.roles.find_one({"name": "Administrador"})
    if not admin_role:
        admin_role = {
            "id": generate_id(),
            "name": "Administrador",
            "permissions": ["admin", "users.read", "users.write", "companies.read", "companies.write",
                          "equipment.read", "equipment.write", "maintenance.read", "maintenance.write",
                          "assignments.read", "assignments.write", "services.read", "services.write",
                          "quotations.read", "quotations.write", "invoices.read", "invoices.write",
                          "custom_fields.read", "custom_fields.write"],
            "description": "Acceso completo al sistema",
            "is_system": True
        }
        await db.roles.insert_one(admin_role)
        logger.info("Default admin role created")

    tech_role = await db.roles.find_one({"name": "Tecnico"})
    if not tech_role:
        tech_role = {
            "id": generate_id(),
            "name": "Tecnico",
            "permissions": ["equipment.read", "equipment.write", "maintenance.read", "maintenance.write",
                          "assignments.read", "services.read"],
            "description": "Acceso a equipos y mantenimientos",
            "is_system": True
        }
        await db.roles.insert_one(tech_role)

    viewer_role = await db.roles.find_one({"name": "Consulta"})
    if not viewer_role:
        viewer_role = {
            "id": generate_id(),
            "name": "Consulta",
            "permissions": ["equipment.read", "maintenance.read", "assignments.read", "services.read",
                          "companies.read", "quotations.read", "invoices.read"],
            "description": "Solo lectura",
            "is_system": True
        }
        await db.roles.insert_one(viewer_role)

    admin_user = await db.users.find_one({"email": "admin@example.com"})
    if not admin_user:
        admin_role_doc = await db.roles.find_one({"name": "Administrador"}, {"_id": 0})
        admin_user = {
            "id": generate_id(),
            "email": "admin@example.com",
            "password": hash_password("adminpassword"),
            "name": "Administrador",
            "role_id": admin_role_doc["id"] if admin_role_doc else None,
            "company_id": None,
            "is_active": True,
            "created_at": now_iso()
        }
        await db.users.insert_one(admin_user)
        logger.info("Default admin user created (admin@example.com / adminpassword)")


@app.on_event("startup")
async def startup_event():
    logger.info("Starting InventarioTI API...")
    await init_default_roles()

    # Initialize scheduler
    try:
        notif_settings = await db.notification_settings.find_one({"type": "notifications"}, {"_id": 0})
        if notif_settings and notif_settings.get("auto_send_enabled"):
            send_time = notif_settings.get("send_time", "08:00")
            await update_scheduler_job(enabled=True, send_time=send_time)

        if not scheduler.running:
            scheduler.start()
            logger.info("Notification scheduler started")
    except Exception as e:
        logger.error(f"Error initializing scheduler: {str(e)}")

    logger.info("InventarioTI API started successfully")


@app.on_event("shutdown")
async def shutdown_event():
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Notification scheduler stopped")
