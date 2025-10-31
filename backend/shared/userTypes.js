// backend/shared/userTypes.js
export function sanitizeUserForClient(user) {
  if (!user) return null;
  
  const sanitized = {
    _id: user._id?.toString?.(),
    email: user.email,
    phone: user.phone,
    role: user.role,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
    lastSeenAt: user.lastSeenAt,
    activeSessionSince: user.activeSessionSince
  };
  
  // إزالة الحقول الحساسة
  delete sanitized.passwordHash;
  delete sanitized.__v;
  
  return sanitized;
}