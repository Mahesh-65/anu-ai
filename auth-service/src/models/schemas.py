from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field

class PermissionBase(BaseModel):
    name: str = Field(..., description="Unique permission name, e.g., 'hr:write'")
    description: Optional[str] = Field(None, description="Detailed description of permission")

class PermissionCreate(PermissionBase):
    pass

class PermissionResponse(PermissionBase):
    id: str = Field(..., alias="_id")

    class Config:
        populate_by_name = True

class RoleBase(BaseModel):
    name: str = Field(..., description="Unique role name, e.g., 'EMPLOYEE'")
    permissions: List[str] = Field(default=[], description="List of permission names associated with this role")

class RoleCreate(RoleBase):
    pass

class RoleResponse(RoleBase):
    id: str = Field(..., alias="_id")

    class Config:
        populate_by_name = True

class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    first_name: str
    last_name: str
    role: Optional[str] = "EMPLOYEE"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: EmailStr
    first_name: str
    last_name: str
    role: str
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class TokenPayload(BaseModel):
    sub: str  # user email
    role: str
    permissions: List[str]
    exp: datetime
