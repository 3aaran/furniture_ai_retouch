export const permissionMatrix = {
  SYSTEM_ADMIN: {
    pages: ['dashboard', 'logs', 'applications', 'feedbacks', 'resources', 'aiConfig', 'settings', 'merchants', 'announcements', 'redeem'],
    dataScope: 'ALL',
    actions: ['admin:read', 'admin:write', 'merchant:adjustQuota', 'ai:configure', 'feedback:handle']
  },
  MERCHANT_OWNER: {
    pages: ['workbench', 'resources', 'users', 'images', 'promotion', 'quota', 'profile', 'feedback', 'redeem'],
    dataScope: 'MERCHANT',
    actions: ['ai:create', 'merchantUser:manage', 'merchantResource:manage', 'quota:allocate', 'feedback:create']
  },
  MERCHANT_ADMIN: {
    pages: ['workbench', 'resources', 'users', 'images', 'promotion', 'quota', 'profile', 'feedback', 'redeem'],
    dataScope: 'MERCHANT',
    actions: ['ai:create', 'merchantUser:manageLower', 'merchantResource:manage', 'quota:allocate', 'feedback:create']
  },
  STAFF: {
    pages: ['workbench', 'images', 'quota', 'profile', 'feedback', 'redeem'],
    dataScope: 'SELF',
    actions: ['ai:create', 'feedback:create']
  },
  TRIAL: {
    pages: ['workbench', 'images', 'quota', 'profile', 'feedback'],
    dataScope: 'SELF',
    actions: ['ai:create', 'feedback:create']
  }
};

export function canAccessPage(role, pageKey) {
  return !!permissionMatrix[role]?.pages?.includes(pageKey);
}

export function canPerform(role, action) {
  return !!permissionMatrix[role]?.actions?.includes(action);
}
