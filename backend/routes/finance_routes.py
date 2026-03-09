from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from database import db
from auth import get_current_user, check_permission
from config import PAC_PROVIDER, PAC_API_KEY, PAC_API_SECRET, PAC_SANDBOX
from models import (
    QuotationCreate, QuotationResponse,
    InvoiceCreate, InvoiceResponse
)
from helpers import generate_id, now_iso

router = APIRouter()


# ==================== QUOTATIONS ====================

@router.get("/quotations", response_model=List[QuotationResponse])
async def get_quotations(company_id: Optional[str] = None, status: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if company_id:
        query["company_id"] = company_id
    elif current_user.get("company_id"):
        query["company_id"] = current_user["company_id"]
    if status:
        query["status"] = status
    quotations = await db.quotations.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    result = []
    for quot in quotations:
        company = await db.companies.find_one({"id": quot["company_id"]}, {"_id": 0})
        quot["company_name"] = company["name"] if company else None
        result.append(QuotationResponse(**quot))
    return result


@router.get("/quotations/{quotation_id}", response_model=QuotationResponse)
async def get_quotation_by_id(quotation_id: str, current_user: dict = Depends(get_current_user)):
    quot = await db.quotations.find_one({"id": quotation_id}, {"_id": 0})
    if not quot:
        raise HTTPException(status_code=404, detail="Cotización no encontrada")
    company = await db.companies.find_one({"id": quot["company_id"]}, {"_id": 0})
    quot["company_name"] = company["name"] if company else None
    return QuotationResponse(**quot)


@router.post("/quotations", response_model=QuotationResponse)
async def create_quotation(quot_data: QuotationCreate, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "quotations.write")
    count = await db.quotations.count_documents({})
    quotation_number = f"COT-{str(count + 1).zfill(6)}"
    items = []
    subtotal = 0
    for item in quot_data.items:
        item_total = item.quantity * item.unit_price * (1 - item.discount / 100)
        items.append({
            "description": item.description, "quantity": item.quantity,
            "unit_price": item.unit_price, "discount": item.discount, "total": round(item_total, 2),
            "clave_prod_serv": item.clave_prod_serv, "clave_unidad": item.clave_unidad, "unidad": item.unidad
        })
        subtotal += item_total
    tax_amount = subtotal * (quot_data.tax_rate / 100)
    total = subtotal + tax_amount
    valid_until = (datetime.now(timezone.utc) + timedelta(days=quot_data.valid_days)).isoformat()
    quotation = {
        "id": generate_id(), "quotation_number": quotation_number, "company_id": quot_data.company_id,
        "client_name": quot_data.client_name, "client_email": quot_data.client_email,
        "client_phone": quot_data.client_phone, "client_address": quot_data.client_address,
        "client_rfc": quot_data.client_rfc, "client_regimen_fiscal": quot_data.client_regimen_fiscal,
        "items": items, "subtotal": round(subtotal, 2),
        "tax_rate": quot_data.tax_rate, "tax_amount": round(tax_amount, 2), "total": round(total, 2),
        "notes": quot_data.notes, "terms_conditions": quot_data.terms_conditions,
        "valid_until": valid_until, "status": "Pendiente",
        "uso_cfdi": quot_data.uso_cfdi, "custom_fields": quot_data.custom_fields, "created_at": now_iso()
    }
    await db.quotations.insert_one(quotation)
    company = await db.companies.find_one({"id": quot_data.company_id}, {"_id": 0})
    quotation["company_name"] = company["name"] if company else None
    return QuotationResponse(**quotation)


@router.put("/quotations/{quotation_id}/status")
async def update_quotation_status(quotation_id: str, status: str, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "quotations.write")
    if status not in ["Pendiente", "Aprobada", "Aceptada", "Rechazada", "Convertida"]:
        raise HTTPException(status_code=400, detail="Estado inválido")
    result = await db.quotations.update_one({"id": quotation_id}, {"$set": {"status": status}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Cotización no encontrada")
    return {"message": f"Estado actualizado a {status}"}


# ==================== INVOICES ====================

@router.get("/invoices", response_model=List[InvoiceResponse])
async def get_invoices(company_id: Optional[str] = None, status: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if company_id:
        query["company_id"] = company_id
    elif current_user.get("company_id"):
        query["company_id"] = current_user["company_id"]
    if status:
        query["status"] = status
    invoices = await db.invoices.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    result = []
    for inv in invoices:
        company = await db.companies.find_one({"id": inv["company_id"]}, {"_id": 0})
        inv["company_name"] = company["name"] if company else None
        result.append(InvoiceResponse(**inv))
    return result


@router.get("/invoices/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice_by_id(invoice_id: str, current_user: dict = Depends(get_current_user)):
    inv = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not inv:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    company = await db.companies.find_one({"id": inv["company_id"]}, {"_id": 0})
    inv["company_name"] = company["name"] if company else None
    return InvoiceResponse(**inv)


@router.post("/invoices", response_model=InvoiceResponse)
async def create_invoice(inv_data: InvoiceCreate, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "invoices.write")
    count = await db.invoices.count_documents({})
    folio = str(count + 1).zfill(6)
    serie = inv_data.serie or "A"
    invoice_number = f"{serie}-{folio}"

    items = []
    subtotal = 0
    for item in inv_data.items:
        item_total = item.quantity * item.unit_price * (1 - item.discount / 100)
        items.append({
            "description": item.description, "quantity": item.quantity,
            "unit_price": item.unit_price, "discount": item.discount, "total": round(item_total, 2),
            "clave_prod_serv": item.clave_prod_serv, "clave_unidad": item.clave_unidad, "unidad": item.unidad
        })
        subtotal += item_total
    tax_amount = subtotal * (inv_data.tax_rate / 100)
    total = subtotal + tax_amount

    invoice = {
        "id": generate_id(), "invoice_number": invoice_number, "serie": serie, "folio": folio,
        "company_id": inv_data.company_id, "quotation_id": inv_data.quotation_id,
        "client_name": inv_data.client_name, "client_email": inv_data.client_email,
        "client_phone": inv_data.client_phone, "client_address": inv_data.client_address,
        "client_rfc": inv_data.client_rfc, "client_regimen_fiscal": inv_data.client_regimen_fiscal,
        "client_codigo_postal": inv_data.client_codigo_postal,
        "uso_cfdi": inv_data.uso_cfdi, "metodo_pago": inv_data.metodo_pago,
        "forma_pago": inv_data.forma_pago, "condiciones_pago": inv_data.condiciones_pago,
        "moneda": inv_data.moneda, "tipo_cambio": inv_data.tipo_cambio,
        "items": items, "subtotal": round(subtotal, 2),
        "tax_rate": inv_data.tax_rate, "tax_amount": round(tax_amount, 2), "total": round(total, 2),
        "notes": inv_data.notes, "status": "Pendiente",
        "uuid_fiscal": None, "fecha_timbrado": None, "sello_sat": None,
        "sello_cfdi": None, "cadena_original": None,
        "custom_fields": inv_data.custom_fields, "created_at": now_iso()
    }
    await db.invoices.insert_one(invoice)
    if inv_data.quotation_id:
        await db.quotations.update_one({"id": inv_data.quotation_id}, {"$set": {"status": "Convertida"}})
    company = await db.companies.find_one({"id": inv_data.company_id}, {"_id": 0})
    invoice["company_name"] = company["name"] if company else None
    return InvoiceResponse(**invoice)


@router.put("/invoices/{invoice_id}/status")
async def update_invoice_status(invoice_id: str, status: str, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "invoices.write")
    if status not in ["Pendiente", "Pagada", "Anulada"]:
        raise HTTPException(status_code=400, detail="Estado inválido")
    result = await db.invoices.update_one({"id": invoice_id}, {"$set": {"status": status}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    return {"message": f"Estado actualizado a {status}"}


# ==================== PAC / CFDI TIMBRADO ====================

@router.get("/pac/status")
async def get_pac_status(current_user: dict = Depends(get_current_user)):
    if not PAC_PROVIDER or not PAC_API_KEY:
        return {
            "configured": False, "provider": None, "sandbox": True,
            "message": "PAC no configurado. Configure PAC_PROVIDER, PAC_API_KEY y PAC_API_SECRET en las variables de entorno."
        }
    return {
        "configured": True, "provider": PAC_PROVIDER, "sandbox": PAC_SANDBOX,
        "message": f"PAC {PAC_PROVIDER} configurado en modo {'sandbox' if PAC_SANDBOX else 'producción'}"
    }


@router.post("/invoices/{invoice_id}/timbrar")
async def timbrar_invoice(invoice_id: str, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "invoices.write")
    if not PAC_PROVIDER or not PAC_API_KEY:
        raise HTTPException(status_code=400, detail="PAC no configurado. Configure PAC_PROVIDER, PAC_API_KEY y PAC_API_SECRET.")

    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    if invoice.get("uuid_fiscal"):
        raise HTTPException(status_code=400, detail="La factura ya está timbrada")
    if not invoice.get("client_rfc"):
        raise HTTPException(status_code=400, detail="La factura requiere RFC del receptor")

    company = await db.companies.find_one({"id": invoice["company_id"]}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=400, detail="Empresa emisora no encontrada")

    raise HTTPException(
        status_code=501,
        detail=f"Timbrado con {PAC_PROVIDER} pendiente de implementación. Contacte al administrador para completar la integración."
    )


@router.post("/invoices/{invoice_id}/cancel")
async def cancel_timbrado(invoice_id: str, motivo: str = "02", current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "invoices.write")
    if not PAC_PROVIDER or not PAC_API_KEY:
        raise HTTPException(status_code=400, detail="PAC no configurado")

    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    if not invoice.get("uuid_fiscal"):
        raise HTTPException(status_code=400, detail="La factura no está timbrada")

    raise HTTPException(status_code=501, detail="Cancelación de CFDI pendiente de implementación")
