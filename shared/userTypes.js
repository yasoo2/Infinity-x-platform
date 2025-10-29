export function sanitizeUserForClient(userDoc) {
  if (!userDoc) return null;
  return {
    _id: userDoc._id,
    email: userDoc.email,
    phone: userDoc.phone,
    role: userDoc.role,
    lastLoginAt: userDoc.lastLoginAt,
    activeSessionSince: userDoc.activeSessionSince
  };
}
