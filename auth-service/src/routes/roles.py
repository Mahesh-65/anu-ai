from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from src.database import get_collection
from src.models.schemas import RoleResponse, RoleCreate, PermissionResponse
from src.utils.auth_deps import PermissionChecker

router = APIRouter(tags=["Roles & Permissions"])

@router.get("/roles", response_model=List[RoleResponse])
async def list_roles(
    current_user: dict = Depends(PermissionChecker(["roles:read"]))
):
    role_col = get_collection("roles")
    roles = []
    async for role in role_col.find():
        role["_id"] = str(role["_id"])
        roles.append(role)
    return roles

@router.get("/permissions", response_model=List[PermissionResponse])
async def list_permissions(
    current_user: dict = Depends(PermissionChecker(["roles:read"]))
):
    perm_col = get_collection("permissions")
    perms = []
    async for perm in perm_col.find():
        perm["_id"] = str(perm["_id"])
        perms.append(perm)
    return perms

@router.post("/roles", response_model=RoleResponse)
async def create_role(
    role_data: RoleCreate,
    current_user: dict = Depends(PermissionChecker(["roles:write"]))
):
    role_col = get_collection("roles")
    perm_col = get_collection("permissions")

    # Check if role already exists
    existing = await role_col.find_one({"name": role_data.name.upper()})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Role '{role_data.name.upper()}' already exists."
        )

    # Validate that all permissions exist
    for perm_name in role_data.permissions:
        perm = await perm_col.find_one({"name": perm_name})
        if not perm:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Permission '{perm_name}' does not exist in the system."
            )

    new_role = {
        "name": role_data.name.upper(),
        "permissions": role_data.permissions
    }
    
    result = await role_col.insert_one(new_role)
    new_role["_id"] = str(result.inserted_id)
    return new_role

@router.put("/roles/{role_name}", response_model=RoleResponse)
async def update_role_permissions(
    role_name: str,
    permissions: List[str],
    current_user: dict = Depends(PermissionChecker(["roles:write"]))
):
    role_col = get_collection("roles")
    perm_col = get_collection("permissions")

    role = await role_col.find_one({"name": role_name.upper()})
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Role '{role_name.upper()}' not found."
        )

    # Validate permissions
    for perm_name in permissions:
        perm = await perm_col.find_one({"name": perm_name})
        if not perm:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Permission '{perm_name}' does not exist in the system."
            )

    await role_col.update_one(
        {"name": role_name.upper()},
        {"$set": {"permissions": permissions}}
    )

    updated_role = await role_col.find_one({"name": role_name.upper()})
    updated_role["_id"] = str(updated_role["_id"])
    return updated_role
