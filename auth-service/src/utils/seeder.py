from src.database import get_collection
from src.utils.security import hash_password
import datetime

# Define standard permissions
DEFAULT_PERMISSIONS = [
    {"name": "users:read", "description": "Read user profiles"},
    {"name": "users:write", "description": "Create, update, delete user accounts"},
    {"name": "roles:read", "description": "Read roles and permissions"},
    {"name": "roles:write", "description": "Modify roles and permission mapping"},
    {"name": "hr:read", "description": "Read HR employee, attendance, and leave details"},
    {"name": "hr:write", "description": "Manage employee profiles, leave requests, and recruiting"},
    {"name": "projects:read", "description": "Read project boards, milestones, and tasks"},
    {"name": "projects:write", "description": "Create and update projects, milestones, tasks, and tickets"},
    {"name": "finance:read", "description": "Read expense records, budgets, and invoices"},
    {"name": "finance:write", "description": "Create and modify expense reports, budgets, invoices"},
    {"name": "ai:chat", "description": "Engage with the AI chatbot engine"},
    {"name": "ai:admin", "description": "Configure embedding and LLM provider parameters"}
]

# Define roles and permission mapping
DEFAULT_ROLES = {
    "SUPER_ADMIN": [p["name"] for p in DEFAULT_PERMISSIONS],
    "ORG_ADMIN": [
        "users:read", "users:write", "roles:read",
        "hr:read", "hr:write", "projects:read", "projects:write",
        "finance:read", "finance:write", "ai:chat", "ai:admin"
    ],
    "HR_MANAGER": [
        "users:read", "users:write", "hr:read", "hr:write", "ai:chat", "ai:admin"
    ],
    "PROJECT_MANAGER": [
        "users:read", "hr:read", "projects:read", "projects:write", "ai:chat"
    ],
    "FINANCE_MANAGER": [
        "users:read", "hr:read", "finance:read", "finance:write", "ai:chat"
    ],
    "EMPLOYEE": [
        "users:read", "hr:read", "projects:read", "ai:chat"
    ]
}

async def seed_database():
    """Seed the roles, permissions, and super administrator user if not already seeded."""
    print("[Seeder] Checking database seeding state...")
    
    perm_col = get_collection("permissions")
    role_col = get_collection("roles")
    user_col = get_collection("users")

    # 1. Seed Permissions
    for perm in DEFAULT_PERMISSIONS:
        existing = await perm_col.find_one({"name": perm["name"]})
        if not existing:
            await perm_col.insert_one(perm)
            print(f"[Seeder] Seeded permission: {perm['name']}")

    # 2. Seed Roles
    for role_name, permissions in DEFAULT_ROLES.items():
        existing = await role_col.find_one({"name": role_name})
        if not existing:
            await role_col.insert_one({
                "name": role_name,
                "permissions": permissions
            })
            print(f"[Seeder] Seeded role: {role_name}")
        else:
            # Sync permissions in case they changed
            await role_col.update_one(
                {"name": role_name},
                {"$set": {"permissions": permissions}}
            )

    # 3. Seed Default Super Admin User
    admin_email = "admin@organistation.com"
    for legacy_email in ("admin@organistation.local", "admin@anu.ai"):
        legacy_user = await user_col.find_one({"email": legacy_email})
        if legacy_user:
            await user_col.update_one(
                {"email": legacy_email},
                {"$set": {"email": admin_email, "updated_at": datetime.datetime.utcnow()}}
            )
            print(f"[Seeder] Migrated admin email from {legacy_email} to {admin_email}")

    existing_admin = await user_col.find_one({"email": admin_email})
    if not existing_admin:
        hashed = hash_password("Admin@123")
        now = datetime.datetime.utcnow()
        admin_user = {
            "email": admin_email,
            "hashed_password": hashed,
            "first_name": "Super",
            "last_name": "Admin",
            "role": "SUPER_ADMIN",
            "status": "active",
            "must_change_password": True,
            "created_at": now,
            "updated_at": now
        }
        await user_col.insert_one(admin_user)
        print(f"[Seeder] Default Super Admin user created ({admin_email} / Admin@123)")
    else:
        print("[Seeder] Admin user already exists.")

    # Require password change on first login for accounts missing the flag
    await user_col.update_many(
        {"must_change_password": {"$exists": False}},
        {"$set": {"must_change_password": True}}
    )

    print("[Seeder] Seeding database checks complete.")
