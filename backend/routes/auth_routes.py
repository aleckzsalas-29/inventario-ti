from fastapi import APIRouter, HTTPException, Depends
from typing import List
from database import db
from auth import get_current_user, hash_password, verify_password, create_token, check_permission
from models import (
    UserCreate, UserLogin, UserResponse, TokenResponse,
    RoleCreate, RoleResponse
)
from helpers import generate_id, now_iso

router = APIRouter()


@router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    if not user.get("is_active", True):
        raise HTTPException(status_code=401, detail="Usuario desactivado")

    role_name = None
    if user.get("role_id"):
        role = await db.roles.find_one({"id": user["role_id"]}, {"_id": 0})
        role_name = role["name"] if role else None

    company_name = None
    if user.get("company_id"):
        company = await db.companies.find_one({"id": user["company_id"]}, {"_id": 0})
        company_name = company["name"] if company else None

    token = create_token(user["id"], user["email"], user.get("role_id"))

    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user["id"], email=user["email"], name=user["name"],
            role_id=user.get("role_id"), role_name=role_name,
            company_id=user.get("company_id"), company_name=company_name,
            assigned_equipment_ids=user.get("assigned_equipment_ids", []),
            is_active=user.get("is_active", True), created_at=user["created_at"]
        )
    )


@router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    role_name = None
    if current_user.get("role_id"):
        role = await db.roles.find_one({"id": current_user["role_id"]}, {"_id": 0})
        role_name = role["name"] if role else None

    company_name = None
    if current_user.get("company_id"):
        company = await db.companies.find_one({"id": current_user["company_id"]}, {"_id": 0})
        company_name = company["name"] if company else None

    return UserResponse(
        id=current_user["id"], email=current_user["email"], name=current_user["name"],
        role_id=current_user.get("role_id"), role_name=role_name,
        company_id=current_user.get("company_id"), company_name=company_name,
        assigned_equipment_ids=current_user.get("assigned_equipment_ids", []),
        is_active=current_user.get("is_active", True), created_at=current_user["created_at"]
    )


# ==================== USERS ====================

@router.get("/users", response_model=List[UserResponse])
async def get_users(current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "users.read")
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)

    result = []
    for user in users:
        role_name = None
        if user.get("role_id"):
            role = await db.roles.find_one({"id": user["role_id"]}, {"_id": 0})
            role_name = role["name"] if role else None
        company_name = None
        if user.get("company_id"):
            company = await db.companies.find_one({"id": user["company_id"]}, {"_id": 0})
            company_name = company["name"] if company else None
        result.append(UserResponse(
            id=user["id"], email=user["email"], name=user["name"],
            role_id=user.get("role_id"), role_name=role_name,
            company_id=user.get("company_id"), company_name=company_name,
            assigned_equipment_ids=user.get("assigned_equipment_ids", []),
            is_active=user.get("is_active", True), created_at=user["created_at"]
        ))
    return result


@router.post("/users", response_model=UserResponse)
async def create_user(user_data: UserCreate, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "users.write")

    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="El email ya está registrado")

    user = {
        "id": generate_id(), "email": user_data.email,
        "password": hash_password(user_data.password), "name": user_data.name,
        "role_id": user_data.role_id, "company_id": user_data.company_id,
        "assigned_equipment_ids": user_data.assigned_equipment_ids or [],
        "is_active": True, "created_at": now_iso()
    }
    await db.users.insert_one(user)

    role_name = None
    if user_data.role_id:
        role = await db.roles.find_one({"id": user_data.role_id}, {"_id": 0})
        role_name = role["name"] if role else None
    company_name = None
    if user_data.company_id:
        company = await db.companies.find_one({"id": user_data.company_id}, {"_id": 0})
        company_name = company["name"] if company else None

    return UserResponse(
        id=user["id"], email=user["email"], name=user["name"],
        role_id=user.get("role_id"), role_name=role_name,
        company_id=user.get("company_id"), company_name=company_name,
        assigned_equipment_ids=user.get("assigned_equipment_ids", []),
        is_active=True, created_at=user["created_at"]
    )


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(user_id: str, user_data: UserCreate, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "users.write")

    update_data = {"email": user_data.email, "name": user_data.name,
                   "role_id": user_data.role_id, "company_id": user_data.company_id,
                   "assigned_equipment_ids": user_data.assigned_equipment_ids or []}
    if user_data.password:
        update_data["password"] = hash_password(user_data.password)

    result = await db.users.update_one({"id": user_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    role_name = None
    if user.get("role_id"):
        role = await db.roles.find_one({"id": user["role_id"]}, {"_id": 0})
        role_name = role["name"] if role else None
    company_name = None
    if user.get("company_id"):
        company = await db.companies.find_one({"id": user["company_id"]}, {"_id": 0})
        company_name = company["name"] if company else None

    return UserResponse(
        id=user["id"], email=user["email"], name=user["name"],
        role_id=user.get("role_id"), role_name=role_name,
        company_id=user.get("company_id"), company_name=company_name,
        assigned_equipment_ids=user.get("assigned_equipment_ids", []),
        is_active=user.get("is_active", True), created_at=user["created_at"]
    )


@router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "users.write")
    result = await db.users.update_one({"id": user_id}, {"$set": {"is_active": False}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return {"message": "Usuario desactivado"}


# ==================== ROLES ====================

@router.get("/roles", response_model=List[RoleResponse])
async def get_roles(current_user: dict = Depends(get_current_user)):
    roles = await db.roles.find({}, {"_id": 0}).to_list(100)
    return [RoleResponse(**role) for role in roles]


@router.post("/roles", response_model=RoleResponse)
async def create_role(role_data: RoleCreate, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "admin")
    role = {"id": generate_id(), "name": role_data.name, "permissions": role_data.permissions,
            "description": role_data.description, "is_system": False}
    await db.roles.insert_one(role)
    return RoleResponse(**role)


@router.put("/roles/{role_id}", response_model=RoleResponse)
async def update_role(role_id: str, role_data: RoleCreate, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "admin")
    existing = await db.roles.find_one({"id": role_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Rol no encontrado")
    update_data = {"name": role_data.name, "permissions": role_data.permissions, "description": role_data.description}
    await db.roles.update_one({"id": role_id}, {"$set": update_data})
    role = await db.roles.find_one({"id": role_id}, {"_id": 0})
    return RoleResponse(**role)
