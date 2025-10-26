import { ROLES } from "../config/roles.js";

export function roleRequired(allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ ok: false, error: "Forbidden" });
    }
    next();
  };
}

// أمثلة:
// roleRequired([ROLES.SUPER_ADMIN])
// roleRequired([ROLES.SUPER_ADMIN, ROLES.ADMIN])
