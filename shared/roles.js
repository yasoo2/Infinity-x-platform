export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  USER: 'user',
};

export const PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: {
    canSeeFactory: true,
    canManageUsers: true,
    canPromoteRoles: true,
    canEditPublicSite: true,
    canEditCoreSystem: true,
    canAccessJoeBrain: true
  },
  [ROLES.ADMIN]: {
    canSeeFactory: true,
    canManageUsers: false,
    canPromoteRoles: false,
    canEditPublicSite: true,
    canEditCoreSystem: true,
    canAccessJoeBrain: true
  },
  [ROLES.USER]: {
    canSeeFactory: false,
    canManageUsers: false,
    canPromoteRoles: false,
    canEditPublicSite: false,
    canEditCoreSystem: false,
    canAccessJoeBrain: false
  }
};

export function can(role, permissionKey) {
  const perms = PERMISSIONS[role] || {};
  return !!perms[permissionKey];
}
