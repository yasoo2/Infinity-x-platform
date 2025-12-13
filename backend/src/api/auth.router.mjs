
import express from 'express';
import jwt from 'jsonwebtoken';
import { ROLES } from '../../../shared/roles.js';

const authRouterFactory = ({ db }) => {
  const router = express.Router();
  void db;

    

  /**
   * @route POST /api/v1/auth/login
   * @description Authenticates a user and returns a JWT token
   * @access Public
   */
  

  /**
   * @route POST /api/v1/auth/simple-login
   * @description Minimal login using Super Admin credentials from env or defaults
   * @access Public
   */
  router.post('/simple-login', async (req, res) => {
    try {
      const { email, password } = req.body || {};
      const envEmail = (process.env.SUPER_ADMIN_EMAIL || 'info.auraaluxury@gmail.com').toLowerCase();
      const envPassword = process.env.SUPER_ADMIN_PASSWORD || 'younes2025';
      const normalized = String(email || '').toLowerCase();
      if (!normalized || !password) {
        return res.status(400).json({ ok: false, error: 'IDENTIFIER_PASSWORD_REQUIRED' });
      }
      if (normalized === envEmail && password === envPassword) {
        const pseudoId = '000000000000000000000001';
        const token = jwt.sign(
          { userId: pseudoId, role: ROLES.SUPER_ADMIN },
          process.env.JWT_SECRET || 'a-very-weak-secret-for-dev',
          { expiresIn: '7d' }
        );
        return res.json({ ok: true, token, user: { id: pseudoId, email: envEmail, role: ROLES.SUPER_ADMIN } });
      }
      return res.status(401).json({ ok: false, error: 'INVALID_CREDENTIALS' });
    } catch (error) {
      console.error('❌ simple-login error:', error);
      return res.status(500).json({ ok: false, error: 'INTERNAL_ERROR' });
    }
  });

  /**
   * @route GET /api/v1/auth/profile
   * @description Returns user info from Bearer token
   * @access Public (reads token only)
   */
  router.get('/profile', async (req, res) => {
    try {
      const auth = String(req.headers.authorization || '').trim();
      const m = auth.match(/^Bearer\s+(.+)/i);
      if (!m) return res.status(401).json({ ok: false, error: 'NO_TOKEN' });
      const token = m[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'a-very-weak-secret-for-dev');
      const id = String(decoded?.userId || '000000000000000000000001');
      const role = String(decoded?.role || ROLES.SUPER_ADMIN);
      const email = process.env.SUPER_ADMIN_EMAIL || 'info.auraaluxury@gmail.com';
      return res.json({ ok: true, user: { id, email, role } });
    } catch (error) {
      return res.status(401).json({ ok: false, error: 'INVALID_TOKEN' });
    }
  });

  router.get('/validate', async (req, res) => {
    try {
      const auth = String(req.headers.authorization || '').trim();
      const m = auth.match(/^Bearer\s+(.+)/i);
      if (!m) return res.status(401).json({ ok: false, error: 'NO_TOKEN' });
      const token = m[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'a-very-weak-secret-for-dev');
      const id = String(decoded?.userId || '000000000000000000000001');
      const role = String(decoded?.role || ROLES.SUPER_ADMIN);
      const email = process.env.SUPER_ADMIN_EMAIL || 'info.auraaluxury@gmail.com';
      return res.json({ success: true, user: { id, email, role } });
    } catch (error) {
      return res.status(401).json({ ok: false, error: 'INVALID_TOKEN' });
    }
  });

  /**
   * @route POST /api/v1/auth/logout
   * @description Trivial logout endpoint
   */
  router.post('/logout', async (_req, res) => {
    try { return res.json({ ok: true }); } catch { return res.json({ ok: true }); }
  });

  router.post('/guest-token', async (_req, res) => {
    try {
      const id = `guest:${Date.now()}:${Math.random().toString(16).slice(2,10)}`;
      const token = jwt.sign(
        { userId: id, role: ROLES.USER },
        process.env.JWT_SECRET || 'a-very-weak-secret-for-dev',
        { expiresIn: '30d' }
      );
      return res.json({ success: true, token });
    } catch (error) {
      return res.status(500).json({ success: false, error: 'GUEST_TOKEN_FAILED', message: error.message });
    }
  });

    

    



    return router;
};

export default authRouterFactory;
