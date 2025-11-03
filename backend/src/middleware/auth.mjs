import jwt from 'jsonwebtoken';
import User from '../models/User.mjs';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

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
        return res.status(403).json({ ok: false, error: 'Invalid token' });
      }

      // Fetch user from database
      const user = await User.findById(decoded.userId);
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
export const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};

export default { authenticateToken, requireSuperAdmin, requireAdmin, generateToken };
