from typing import List, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError
from src.database import get_collection
from src.utils.security import decode_token

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """FastAPI dependency to validate JWT and return current user."""
    token = credentials.credentials
    payload = decode_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    email: str = payload.get("sub")
    if email is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload missing user identifier",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    user_col = get_collection("users")
    user = await user_col.find_one({"email": email})
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
        
    if user.get("status") != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )
        
    # Remove hashed password and serialize ObjectId for security
    user["id"] = str(user["_id"])
    user.pop("_id", None)
    user.pop("hashed_password", None)
    user.setdefault("must_change_password", False)
    return user

class PermissionChecker:
    def __init__(self, required_permissions: List[str]):
        self.required_permissions = required_permissions

    async def __call__(self, current_user: dict = Depends(get_current_user)):
        if current_user.get("must_change_password"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You must change your password before continuing.",
            )

        # Super admin has all permissions
        if current_user.get("role") == "SUPER_ADMIN":
            return current_user

        # Get role details
        role_name = current_user.get("role")
        role_col = get_collection("roles")
        role = await role_col.find_one({"name": role_name})
        
        if not role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User role not found or defined in the system",
            )
            
        user_permissions = role.get("permissions", [])
        
        # Check if all required permissions are met
        for perm in self.required_permissions:
            if perm not in user_permissions:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Operation not permitted. Missing permission: {perm}",
                )
                
        return current_user

class RoleChecker:
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles

    async def __call__(self, current_user: dict = Depends(get_current_user)):
        if current_user.get("role") in self.allowed_roles:
            return current_user
            
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Insufficient role permissions.",
        )
