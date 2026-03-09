from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from database import db
from auth import get_current_user, check_permission
from models import (
    CompanyCreate, CompanyResponse,
    BranchCreate, BranchResponse,
    EmployeeCreate, EmployeeResponse
)
from helpers import generate_id, now_iso

router = APIRouter()


# ==================== COMPANIES ====================

@router.get("/companies", response_model=List[CompanyResponse])
async def get_companies(current_user: dict = Depends(get_current_user)):
    query = {"is_active": {"$ne": False}}
    if current_user.get("company_id"):
        query["id"] = current_user["company_id"]
    companies = await db.companies.find(query, {"_id": 0}).to_list(1000)
    return [CompanyResponse(**c) for c in companies]


@router.post("/companies", response_model=CompanyResponse)
async def create_company(company_data: CompanyCreate, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "companies.write")
    company = {
        "id": generate_id(), "name": company_data.name, "address": company_data.address,
        "phone": company_data.phone, "email": company_data.email, "tax_id": company_data.tax_id,
        "logo_url": company_data.logo_url, "custom_fields": company_data.custom_fields,
        "is_active": True, "created_at": now_iso()
    }
    await db.companies.insert_one(company)
    return CompanyResponse(**company)


@router.put("/companies/{company_id}", response_model=CompanyResponse)
async def update_company(company_id: str, company_data: CompanyCreate, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "companies.write")
    update_data = company_data.model_dump()
    result = await db.companies.update_one({"id": company_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    company = await db.companies.find_one({"id": company_id}, {"_id": 0})
    return CompanyResponse(**company)


@router.delete("/companies/{company_id}")
async def delete_company(company_id: str, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "companies.write")
    result = await db.companies.update_one({"id": company_id}, {"$set": {"is_active": False}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    return {"message": "Empresa desactivada"}


# ==================== BRANCHES ====================

@router.get("/branches", response_model=List[BranchResponse])
async def get_branches(company_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {"is_active": {"$ne": False}}
    if company_id:
        query["company_id"] = company_id
    elif current_user.get("company_id"):
        query["company_id"] = current_user["company_id"]
    branches = await db.branches.find(query, {"_id": 0}).to_list(1000)
    result = []
    for branch in branches:
        company = await db.companies.find_one({"id": branch["company_id"]}, {"_id": 0})
        branch["company_name"] = company["name"] if company else None
        result.append(BranchResponse(**branch))
    return result


@router.post("/branches", response_model=BranchResponse)
async def create_branch(branch_data: BranchCreate, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "companies.write")
    branch = {
        "id": generate_id(), "company_id": branch_data.company_id, "name": branch_data.name,
        "address": branch_data.address, "phone": branch_data.phone,
        "custom_fields": branch_data.custom_fields, "is_active": True
    }
    await db.branches.insert_one(branch)
    company = await db.companies.find_one({"id": branch_data.company_id}, {"_id": 0})
    branch["company_name"] = company["name"] if company else None
    return BranchResponse(**branch)


@router.put("/branches/{branch_id}", response_model=BranchResponse)
async def update_branch(branch_id: str, branch_data: BranchCreate, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "companies.write")
    update_data = branch_data.model_dump()
    result = await db.branches.update_one({"id": branch_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Sucursal no encontrada")
    branch = await db.branches.find_one({"id": branch_id}, {"_id": 0})
    company = await db.companies.find_one({"id": branch["company_id"]}, {"_id": 0})
    branch["company_name"] = company["name"] if company else None
    return BranchResponse(**branch)


@router.delete("/branches/{branch_id}")
async def delete_branch(branch_id: str, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "companies.write")
    result = await db.branches.update_one({"id": branch_id}, {"$set": {"is_active": False}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Sucursal no encontrada")
    return {"message": "Sucursal desactivada"}


# ==================== EMPLOYEES ====================

@router.get("/employees", response_model=List[EmployeeResponse])
async def get_employees(company_id: Optional[str] = None, branch_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {"is_active": {"$ne": False}}
    if company_id:
        query["company_id"] = company_id
    elif current_user.get("company_id"):
        query["company_id"] = current_user["company_id"]
    if branch_id:
        query["branch_id"] = branch_id
    employees = await db.employees.find(query, {"_id": 0}).to_list(1000)
    result = []
    for emp in employees:
        company = await db.companies.find_one({"id": emp["company_id"]}, {"_id": 0})
        emp["company_name"] = company["name"] if company else None
        if emp.get("branch_id"):
            branch = await db.branches.find_one({"id": emp["branch_id"]}, {"_id": 0})
            emp["branch_name"] = branch["name"] if branch else None
        emp["full_name"] = f"{emp['first_name']} {emp['last_name']}"
        result.append(EmployeeResponse(**emp))
    return result


@router.post("/employees", response_model=EmployeeResponse)
async def create_employee(emp_data: EmployeeCreate, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "companies.write")
    employee = {
        "id": generate_id(), "company_id": emp_data.company_id, "branch_id": emp_data.branch_id,
        "dni": emp_data.dni, "first_name": emp_data.first_name, "last_name": emp_data.last_name,
        "position": emp_data.position, "department": emp_data.department, "email": emp_data.email,
        "custom_fields": emp_data.custom_fields, "is_active": True, "created_at": now_iso()
    }
    await db.employees.insert_one(employee)
    company = await db.companies.find_one({"id": emp_data.company_id}, {"_id": 0})
    employee["company_name"] = company["name"] if company else None
    employee["full_name"] = f"{emp_data.first_name} {emp_data.last_name}"
    if emp_data.branch_id:
        branch = await db.branches.find_one({"id": emp_data.branch_id}, {"_id": 0})
        employee["branch_name"] = branch["name"] if branch else None
    return EmployeeResponse(**employee)


@router.put("/employees/{employee_id}", response_model=EmployeeResponse)
async def update_employee(employee_id: str, emp_data: EmployeeCreate, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "companies.write")
    update_data = emp_data.model_dump()
    result = await db.employees.update_one({"id": employee_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    employee = await db.employees.find_one({"id": employee_id}, {"_id": 0})
    company = await db.companies.find_one({"id": employee["company_id"]}, {"_id": 0})
    employee["company_name"] = company["name"] if company else None
    employee["full_name"] = f"{employee['first_name']} {employee['last_name']}"
    if employee.get("branch_id"):
        branch = await db.branches.find_one({"id": employee["branch_id"]}, {"_id": 0})
        employee["branch_name"] = branch["name"] if branch else None
    return EmployeeResponse(**employee)


@router.delete("/employees/{employee_id}")
async def delete_employee(employee_id: str, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "companies.write")
    result = await db.employees.update_one({"id": employee_id}, {"$set": {"is_active": False}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    return {"message": "Empleado desactivado"}
