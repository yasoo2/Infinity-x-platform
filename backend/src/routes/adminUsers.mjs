import express from 'express';
import { authenticateToken, requireSuperAdmin } from '../middleware/auth.mjs';
import User from '../models/User.mjs';
import bcrypt from 'bcryptjs';

const router = express.Router();

/**
 * GET /api/admin/users
 * Get all users (Super Admin only)
 */
router.get('/', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const users = await User.find({}, '-password').sort({ createdAt: -1 });
    res.json({ ok: true, users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch users' });
  }
});

/**
 * POST /api/admin/users
 * Create a new user (Super Admin only)
 */
router.post('/', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { email, phone, role = 'user', password } = req.body;

    // Validate input
    if (!email) {
      return res.status(400).json({ ok: false, message: 'البريد الإلكتروني مطلوب' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ ok: false, message: 'المستخدم موجود بالفعل' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password || 'DefaultPassword123!', 10);

    // Create user
    const user = new User({
      email,
      phone,
      password: hashedPassword,
      role,
      status: 'active'
    });

    await user.save();

    res.json({ 
      ok: true, 
      message: 'تم إنشاء المستخدم بنجاح',
      user: user.toObject({ versionKey: false, transform: (doc, ret) => {
        delete ret.password;
        return ret;
      }})
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ ok: false, message: 'فشل في إنشاء المستخدم' });
  }
});

/**
 * PUT /api/admin/users/:id
 * Update user (Super Admin only)
 */
router.put('/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { email, phone, role, status } = req.body;
    const userId = req.params.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ ok: false, message: 'المستخدم غير موجود' });
    }

    // Update fields
    if (email) user.email = email;
    if (phone) user.phone = phone;
    if (role) user.role = role;
    if (status) user.status = status;

    await user.save();

    res.json({ 
      ok: true, 
      message: 'تم تحديث المستخدم بنجاح',
      user: user.toObject({ versionKey: false, transform: (doc, ret) => {
        delete ret.password;
        return ret;
      }})
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ ok: false, message: 'فشل في تحديث المستخدم' });
  }
});

/**
 * PUT /api/admin/users/:id/password
 * Change user password (Super Admin only)
 */
router.put('/:id/password', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { password } = req.body;
    const userId = req.params.id;

    if (!password) {
      return res.status(400).json({ ok: false, message: 'كلمة المرور مطلوبة' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ ok: false, message: 'المستخدم غير موجود' });
    }

    // Hash and update password
    user.password = await bcrypt.hash(password, 10);
    await user.save();

    res.json({ ok: true, message: 'تم تغيير كلمة المرور بنجاح' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ ok: false, message: 'فشل في تغيير كلمة المرور' });
  }
});

/**
 * PUT /api/admin/users/:id/role
 * Change user role (Super Admin only)
 */
router.put('/:id/role', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    const userId = req.params.id;

    if (!role) {
      return res.status(400).json({ ok: false, message: 'الدور مطلوب' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ ok: false, message: 'المستخدم غير موجود' });
    }

    user.role = role;
    await user.save();

    res.json({ 
      ok: true, 
      message: 'تم تحديث الدور بنجاح',
      user: user.toObject({ versionKey: false, transform: (doc, ret) => {
        delete ret.password;
        return ret;
      }})
    });
  } catch (error) {
    console.error('Error changing role:', error);
    res.status(500).json({ ok: false, message: 'فشل في تحديث الدور' });
  }
});

/**
 * DELETE /api/admin/users/:id
 * Delete user (Super Admin only)
 */
router.delete('/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const userId = req.params.id;

    // Prevent deleting yourself
    if (userId === req.user._id.toString()) {
      return res.status(400).json({ ok: false, message: 'لا يمكنك حذف حسابك الخاص' });
    }

    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      return res.status(404).json({ ok: false, message: 'المستخدم غير موجود' });
    }

    res.json({ ok: true, message: 'تم حذف المستخدم بنجاح' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ ok: false, message: 'فشل في حذف المستخدم' });
  }
});

export default router;
