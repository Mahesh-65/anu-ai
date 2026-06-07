from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Header
from src.database import get_collection
from src.models.schemas import UserRegister, UserLogin, Token, UserResponse
from src.utils.security import (
    hash_password, verify_password, create_access_token, create_refresh_token, decode_token
)
from src.utils.auth_deps import get_current_user
from bson import ObjectId

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserRegister):
    user_col = get_collection("users")
    role_col = get_collection("roles")

    # Public self-registration is limited to EMPLOYEE
    role_name = "EMPLOYEE"

    # Check if user already exists
    existing_user = await user_col.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists."
        )

    # Validate role
    role = await role_col.find_one({"name": role_name})
    if not role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Role '{role_name}' does not exist."
        )

    # Hash password and insert
    hashed = hash_password(user_data.password)
    now = datetime.utcnow()
    new_user = {
        "email": user_data.email,
        "hashed_password": hashed,
        "first_name": user_data.first_name,
        "last_name": user_data.last_name,
        "role": role_name,
        "status": "active",
        "created_at": now,
        "updated_at": now
    }

    result = await user_col.insert_one(new_user)
    new_user["id"] = str(result.inserted_id)
    new_user.pop("_id", None)
    return new_user

@router.post("/login", response_model=Token)
async def login(credentials: UserLogin):
    user_col = get_collection("users")
    role_col = get_collection("roles")
    token_col = get_collection("refresh_tokens")

    user = await user_col.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if user.get("status") != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated. Contact administrator.",
        )

    # Get user permissions
    role = await role_col.find_one({"name": user["role"]})
    permissions = role.get("permissions", []) if role else []

    # Generate tokens
    token_payload = {
        "sub": user["email"],
        "role": user["role"],
        "permissions": permissions
    }

    access_token = create_access_token(data=token_payload)
    refresh_token = create_refresh_token(data={"sub": user["email"]})

    # Store refresh token
    expires_at = datetime.utcnow() + timedelta(days=7)
    await token_col.insert_one({
        "user_email": user["email"],
        "token": refresh_token,
        "expires_at": expires_at,
        "created_at": datetime.utcnow()
    })

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

@router.post("/refresh", response_model=Token)
async def refresh(refresh_token: str):
    token_col = get_collection("refresh_tokens")
    user_col = get_collection("users")
    role_col = get_collection("roles")

    # Verify refresh token exists in DB
    db_token = await token_col.find_one({"token": refresh_token})
    if not db_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    # Decode refresh token
    payload = decode_token(refresh_token)
    if not payload or payload.get("sub") != db_token["user_email"]:
        await token_col.delete_one({"token": refresh_token})
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    user = await user_col.find_one({"email": db_token["user_email"]})
    if not user or user.get("status") != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account inactive or deleted",
        )

    # Delete old refresh token (token rotation)
    await token_col.delete_one({"token": refresh_token})

    # Get user permissions
    role = await role_col.find_one({"name": user["role"]})
    permissions = role.get("permissions", []) if role else []

    # Generate new tokens
    token_payload = {
        "sub": user["email"],
        "role": user["role"],
        "permissions": permissions
    }

    access_token = create_access_token(data=token_payload)
    new_refresh_token = create_refresh_token(data={"sub": user["email"]})

    # Store new refresh token
    expires_at = datetime.utcnow() + timedelta(days=7)
    await token_col.insert_one({
        "user_email": user["email"],
        "token": new_refresh_token,
        "expires_at": expires_at,
        "created_at": datetime.utcnow()
    })

    return {
        "access_token": access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer"
    }

@router.post("/logout")
async def logout(refresh_token: str):
    token_col = get_collection("refresh_tokens")
    await token_col.delete_one({"token": refresh_token})
    return {"message": "Successfully logged out"}

@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    # Fetch permissions for the UI and return
    role_col = get_collection("roles")
    role = await role_col.find_one({"name": current_user.get("role")})
    permissions = role.get("permissions", []) if role else []
    
    current_user["permissions"] = permissions
    return current_user
