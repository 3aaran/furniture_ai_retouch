const roleRank = {
  SYSTEM_ADMIN: 100,
  MERCHANT_OWNER: 80,
  MERCHANT_ADMIN: 60,
  STAFF: 30,
  TRIAL: 10
};

export function requireAnyRole(...roles) {
  return (req, res, next) => {
    if (roles.includes(req.user?.role)) return next();
    return res.status(403).json({ message: '当前角色无权访问该接口' });
  };
}

export function requireSystemAdmin(req, res, next) {
  if (req.user?.role === 'SYSTEM_ADMIN') return next();
  return res.status(403).json({ message: '需要系统管理员权限' });
}

export function requireMerchantAccount(req, res, next) {
  if (req.user?.merchant_id) return next();
  return res.status(403).json({ message: '需要门店账号权限' });
}

export function requireMerchantManager(req, res, next) {
  if (['MERCHANT_OWNER', 'MERCHANT_ADMIN'].includes(req.user?.role)) return next();
  return res.status(403).json({ message: '需要门店管理员权限' });
}

export function hasHigherRole(actorRole, targetRole) {
  return Number(roleRank[actorRole] || 0) > Number(roleRank[targetRole] || 0);
}

export default {
  requireAnyRole,
  requireSystemAdmin,
  requireMerchantAccount,
  requireMerchantManager,
  hasHigherRole
};
