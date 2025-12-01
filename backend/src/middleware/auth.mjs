import jwt from 'jsonwebtoken';
import User from '../database/models/User.mjs';

const JWT_SECRET = process.env.JWT_SECRET || 'a-very-weak-secret-for-dev';

/**
 * Authenticate token middleware
 * Verifies the JWT token and attaches user to request
 */
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ ok: false, error: 'No token provided' });
    }

    jwt.verify(token, JWT_SECRET, async (err, decoded) => {
      if (err) {
        // Check for token expiration
        if (err.name === 'TokenExpiredError') {
          // Attempt to refresh the token
          try {
            const expiredDecoded = jwt.decode(token);
            if (!expiredDecoded || !expiredDecoded.userId) {
              return res.status(403).json({ ok: false, error: 'Invalid token structure' });
            }

            // Fetch user from database to ensure validity
            const user = await User.findById(expiredDecoded.userId);
            if (!user) {
              return res.status(404).json({ ok: false, error: 'User not found' });
            }

            // Generate a new token
            const newToken = generateToken(user);
            
            // Attach the new token to the response header
            res.setHeader('X-New-Token', newToken);
            
            req.user = user;
            return next();

          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
            return res.status(403).json({ ok: false, error: 'Token refresh failed' });
          }
        }
        // Handle other token errors (e.g., invalid signature)
        return res.status(403).json({ ok: false, error: 'Invalid token' });
      }

      // Fetch user from database; fallback to token claims if not found
      let user = await User.findById(decoded.userId);
      if (!user && decoded && decoded.userId) {
        user = { _id: decoded.userId, role: decoded.role || 'user', email: decoded.email };
      }
      if (!user) {
        return res.status(404).json({ ok: false, error: 'User not found' });
      }

      req.user = user;
      next();
    });
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ ok: false, error: 'Authentication failed' });
  }
};

/**
 * Require Super Admin role middleware
 * Checks if user has super_admin role
 */
export const requireSuperAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'super_admin') {
    return res.status(403).json({ 
      ok: false, 
      error: 'Access denied. Super Admin role required.' 
    });
  }
  next();
};

/**
 * Require Admin or Super Admin role middleware
 */
export const requireAdmin = (req, res, next) => {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'super_admin')) {
    return res.status(403).json({ 
      ok: false, 
      error: 'Access denied. Admin role required.' 
    });
  }
  next();
};

/**
 * Generate JWT token
 */
export const generateToken = (user) => {
  // تم زيادة مدة الصلاحية إلى 365 يومًا (سنة) لتقليل فشل WebSocket بسبب انتهاء الصلاحية
  return jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, { expiresIn: '365d' });
};

// This function is not used in the file, but it was in the original app.mjs
// I'm adding it here to keep the auth logic together.
export const setupAuth = (db) => {
    void db;
    // In a real app, you might use the db to configure passport strategies
    console.log('Auth setup complete.');
};

export const requireRole = (db) => (role) => (req, res, next) => {
    void db;
    const required = String(role).toLowerCase();
    const actual = String(req?.user?.role || '').toLowerCase();
    const level = { super_admin: 3, admin: 2, user: 1, joe_brain: 2, guest: 1 };
    const requiredLevel = level[required] ?? 99;
    const actualLevel = level[actual] ?? 0;
    if (!req.user || actualLevel < requiredLevel) {
        // If no user, and the required role is 'user', this is a guest user, so let them pass
        if (!req.user && required === 'user') {
            return next();
        }
        return res.status(403).json({ error: 'ACCESS_DENIED', message: `Role '${role}' required.` });
    }
    next();
};

export const optionalAuth = (db) => async (req, res, next) => {
    void db;
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return next(); // No token, proceed without auth
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        let user = await User.findById(decoded.userId);
        if (!user && decoded && decoded.userId) {
            user = { _id: decoded.userId, role: decoded.role || 'user', email: decoded.email };
        }
        if (user) {
            req.user = user;
        }
    } catch {
        // Invalid token, just proceed without auth
    }
    next();
};


export default { authenticateToken, requireSuperAdmin, requireAdmin, generateToken, setupAuth, requireRole, optionalAuth };
