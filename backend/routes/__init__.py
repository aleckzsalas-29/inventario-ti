from fastapi import APIRouter
from .auth_routes import router as auth_router
from .company_routes import router as company_router
from .equipment_routes import router as equipment_router
from .maintenance_routes import router as maintenance_router
from .services_routes import router as services_router
from .finance_routes import router as finance_router
from .config_routes import router as config_router
from .report_routes import router as report_router
from .notification_routes import router as notification_router

api_router = APIRouter(prefix="/api")

api_router.include_router(auth_router)
api_router.include_router(company_router)
api_router.include_router(equipment_router)
api_router.include_router(maintenance_router)
api_router.include_router(services_router)
api_router.include_router(finance_router)
api_router.include_router(config_router)
api_router.include_router(report_router)
api_router.include_router(notification_router)
