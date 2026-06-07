"""Role hierarchy — higher rank can manage lower ranks only."""

ROLE_RANK = {
    "SUPER_ADMIN": 100,
    "ORG_ADMIN": 90,
    "HR_MANAGER": 70,
    "PROJECT_MANAGER": 60,
    "FINANCE_MANAGER": 60,
    "EMPLOYEE": 10,
}

ROLE_CREATABLE = {
    "SUPER_ADMIN": ["ORG_ADMIN", "HR_MANAGER", "PROJECT_MANAGER", "FINANCE_MANAGER", "EMPLOYEE"],
    "ORG_ADMIN": ["HR_MANAGER", "PROJECT_MANAGER", "FINANCE_MANAGER", "EMPLOYEE"],
    "HR_MANAGER": ["EMPLOYEE"],
}

HIDDEN_ROLES = {"SUPER_ADMIN"}


def role_rank(role: str) -> int:
    return ROLE_RANK.get(role, 0)


def can_manage_role(actor_role: str, target_role: str) -> bool:
    """True if actor may create/update/delete another user with target_role."""
    if target_role == "SUPER_ADMIN":
        return False
    return role_rank(actor_role) > role_rank(target_role)


def is_visible_user(user_role: str, viewer_role: str) -> bool:
    """SUPER_ADMIN accounts are hidden from everyone except SUPER_ADMIN."""
    if user_role in HIDDEN_ROLES and viewer_role != "SUPER_ADMIN":
        return False
    return True
