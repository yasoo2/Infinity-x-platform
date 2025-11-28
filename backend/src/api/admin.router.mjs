import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../database/models/User.mjs';

const adminRouterFactory = ({ optionalAuth, requireRole }) => {
  const router = express.Router();

  // Attach auth if token provided, then enforce super admin
  router.use(optionalAuth);

  /**
   * GET /api/v1/admin/users
   * Returns users list with basic stats
   */
  router.get('/users', requireRole('super_admin'), async (req, res) => {
    try {
      const users = await User.find({}, 'email phone role lastLoginAt createdAt').sort({ createdAt: -1 }).lean();
      const now = Date.now();
      const activeWindowMs = 30 * 60 * 1000;
      const stats = {
        totalSupers: users.filter(u => u.role === 'super_admin').length,
        totalAdmins: users.filter(u => u.role === 'admin').length,
        totalUsers: users.filter(u => u.role === 'user').length,
        totalActiveNow: users.filter(u => u.lastLoginAt && (now - new Date(u.lastLoginAt).getTime()) < activeWindowMs).length,
      };
      return res.json({ ok: true, users, stats });
    } catch (error) {
      console.error('GET /admin/users error:', error);
      const fallback = { ok: true, users: [], stats: { totalSupers: 0, totalAdmins: 0, totalUsers: 0, totalActiveNow: 0 } };
      return res.json(fallback);
    }
  });

  /**
   * POST /api/v1/admin/users
   * Create a new user (super admin only)
   */
  router.post('/users', requireRole('super_admin'), async (req, res) => {
    try {
      const { email, phone, password, role = 'user' } = req.body || {};
      if ((!email && !phone) || !password) {
        return res.status(400).json({ ok: false, error: 'EMAIL_OR_PHONE_PASSWORD_REQUIRED' });
      }
      const existing = await User.findOne({
        $or: [
          ...(email ? [{ email: String(email).toLowerCase() }] : []),
          ...(phone ? [{ phone: String(phone) }] : []),
        ]
      });
      if (existing) {
        return res.status(409).json({ ok: false, error: 'ACCOUNT_ALREADY_EXISTS' });
      }
      const hashed = await bcrypt.hash(password, 12);
      const newUser = new User({
        email: email ? String(email).toLowerCase() : undefined,
        phone: phone || undefined,
        password: hashed,
        role: ['user', 'admin', 'super_admin'].includes(role) ? role : 'user',
      });
      await newUser.save();
      return res.status(201).json({ ok: true, user: { _id: newUser._id, email: newUser.email, phone: newUser.phone, role: newUser.role, lastLoginAt: newUser.lastLoginAt, createdAt: newUser.createdAt } });
    } catch (error) {
      console.error('POST /admin/users error:', error);
      return res.status(500).json({ ok: false, error: 'INTERNAL_ERROR', message: error.message });
    }
  });

  /**
   * PUT /api/v1/admin/users/:id
   * Update user fields (super admin only)
   */
  router.put('/users/:id', requireRole('super_admin'), async (req, res) => {
    try {
      const { id } = req.params;
      const { email, phone, role, password } = req.body || {};

      const update = {};
      if (email) update.email = String(email).toLowerCase();
      if (phone !== undefined) update.phone = phone || null;
      if (role && ['user', 'admin', 'super_admin'].includes(role)) update.role = role;
      if (password) update.password = await bcrypt.hash(password, 12);
      update.updatedAt = new Date();

      const user = await User.findByIdAndUpdate(id, { $set: update }, { new: true, select: 'email phone role lastLoginAt createdAt' });
      if (!user) return res.status(404).json({ ok: false, error: 'USER_NOT_FOUND' });
      res.json({ ok: true, user });
    } catch (error) {
      console.error('PUT /admin/users/:id error:', error);
      res.status(500).json({ ok: false, error: 'INTERNAL_ERROR', message: error.message });
    }
  });

  /**
   * DELETE /api/v1/admin/users/:id
   * Delete a user (super admin only)
   */
  router.delete('/users/:id', requireRole('super_admin'), async (req, res) => {
    try {
      const { id } = req.params;
      const doc = await User.findByIdAndDelete(id);
      if (!doc) return res.status(404).json({ ok: false, error: 'USER_NOT_FOUND' });
      res.json({ ok: true });
    } catch (error) {
      console.error('DELETE /admin/users/:id error:', error);
      res.status(500).json({ ok: false, error: 'INTERNAL_ERROR', message: error.message });
    }
  });

  return router;
};

export default adminRouterFactory;
