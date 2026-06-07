export const ROLE_RANK = {
  SUPER_ADMIN: 100,
  ORG_ADMIN: 90,
  HR_MANAGER: 70,
  PROJECT_MANAGER: 60,
  FINANCE_MANAGER: 60,
  EMPLOYEE: 10,
};

export const CREATABLE_ROLES = {
  SUPER_ADMIN:     ['ORG_ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER', 'FINANCE_MANAGER', 'EMPLOYEE'],
  ORG_ADMIN:       ['HR_MANAGER', 'PROJECT_MANAGER', 'FINANCE_MANAGER', 'EMPLOYEE'],
  HR_MANAGER:      ['EMPLOYEE'],
  PROJECT_MANAGER: [],
  FINANCE_MANAGER: [],
  EMPLOYEE:        [],
};

export function creatableRoles(role) {
  return CREATABLE_ROLES[role] ?? [];
}

export function isEmployee(role) {
  return role === 'EMPLOYEE';
}

export function isHiddenUser(user, viewerRole) {
  return user?.role === 'SUPER_ADMIN' && viewerRole !== 'SUPER_ADMIN';
}

export function canManageUser(actorRole, targetRole) {
  if (targetRole === 'SUPER_ADMIN') return false;
  return (ROLE_RANK[actorRole] ?? 0) > (ROLE_RANK[targetRole] ?? 0);
}
