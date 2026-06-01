from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from src.database import get_collection
from src.models.schemas import UserResponse, UserUpdate
from src.utils.auth_deps import PermissionChecker, get_current_user
from bson import ObjectId
import datetime

router = APIRouter(prefix="/users", tags=["Users"])

def serialize_user(user) -> dict:
    user["id"] = str(user["_id"])
    user.pop("hashed_password", None)
    user.pop("_id", None)
    return user

@router.get("", response_model=List[UserResponse])
async def list_users(
    current_user: dict = Depends(PermissionChecker(["users:read"]))
):
    user_col = get_collection("users")
    cursor = user_col.find()
    users = []
    async for user in cursor:
        users.append(serialize_user(user))
    return users

@router.get("/{user_id}", response_model=UserResponse)
async def get_user_by_id(
    user_id: str,
    current_user: dict = Depends(get_current_user)
):
    # Allow reading if they have users:read, or if it is their own profile
    if current_user["role"] != "SUPER_ADMIN" and current_user["id"] != user_id:
        # Check permissions
        role_col = get_collection("roles")
        role = await role_col.find_one({"name": current_user["role"]})
        permissions = role.get("permissions", []) if role else []
        if "users:read" not in permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. Insufficient permissions."
            )

    user_col = get_collection("users")
    try:
        user = await user_col.find_one({"_id": ObjectId(user_id)})
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID format."
        )
        
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found."
        )
    return serialize_user(user)

@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    update_data: UserUpdate,
    current_user: dict = Depends(get_current_user)
):
    user_col = get_collection("users")
    
    # Check if modifying own profile OR has user:write permissions
    is_admin = False
    if current_user["role"] == "SUPER_ADMIN":
        is_admin = True
    else:
        role_col = get_collection("roles")
        role = await role_col.find_one({"name": current_user["role"]})
        permissions = role.get("permissions", []) if role else []
        if "users:write" in permissions:
            is_admin = True

    if not is_admin and current_user["id"] != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Cannot modify other users' profiles."
        )

    try:
        user = await user_col.find_one({"_id": ObjectId(user_id)})
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID format."
        )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found."
        )

    # Compile updates
    update_dict = {}
    data = update_data.model_dump(exclude_unset=True)

    # Restrict non-admins from changing role and status
    if not is_admin:
        data.pop("role", None)
        data.pop("status", None)

    if not data:
        return serialize_user(user)

    data["updated_at"] = datetime.datetime.utcnow()
    
    await user_col.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": data}
    )
    
    updated_user = await user_col.find_one({"_id": ObjectId(user_id)})
    return serialize_user(updated_user)

@router.delete("/{user_id}", status_code=status.HTTP_200_OK)
async def delete_user(
    user_id: str,
    current_user: dict = Depends(PermissionChecker(["users:write"]))
):
    user_col = get_collection("users")
    
    if current_user["id"] == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account."
        )
        
    try:
        result = await user_col.delete_one({"_id": ObjectId(user_id)})
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID format."
        )

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found."
        )
        
    return {"message": "User deleted successfully"}
