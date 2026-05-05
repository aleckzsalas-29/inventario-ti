from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from database import db
from auth import get_current_user, check_permission
from models import ExternalServiceCreate, ExternalServiceResponse
from helpers import generate_id, now_iso

router = APIRouter()


@router.get("/external-services", response_model=List[ExternalServiceResponse])
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


@router.post("/external-services", response_model=ExternalServiceResponse)
async def create_external_service(svc_data: ExternalServiceCreate, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "services.write")
    service = {
        "id": generate_id(), "company_id": svc_data.company_id, "service_type": svc_data.service_type,
        "provider": svc_data.provider, "description": svc_data.description, "cost": svc_data.cost,
        "start_date": svc_data.start_date, "renewal_date": svc_data.renewal_date,
        "payment_frequency": svc_data.payment_frequency, "credentials_info": svc_data.credentials_info,
        "custom_fields": svc_data.custom_fields, "is_active": True, "created_at": now_iso()
    }
    await db.external_services.insert_one(service)
    company = await db.companies.find_one({"id": svc_data.company_id}, {"_id": 0})
    service["company_name"] = company["name"] if company else None
    return ExternalServiceResponse(**service)


@router.put("/external-services/{service_id}", response_model=ExternalServiceResponse)
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


@router.delete("/external-services/{service_id}")
async def delete_external_service(service_id: str, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "services.write")
    result = await db.external_services.update_one({"id": service_id}, {"$set": {"is_active": False}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    return {"message": "Servicio desactivado"}
