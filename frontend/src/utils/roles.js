export const CREATABLE_ROLES = {
  SUPER_ADMIN:     ['SUPER_ADMIN', 'ORG_ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER', 'FINANCE_MANAGER', 'EMPLOYEE'],
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
