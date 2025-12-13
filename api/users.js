// إدارة المستخدمين - API للمديرين
import bcrypt from 'bcrypt';
import { createClient } from '@supabase/supabase-js';
import { authenticateToken, requireRole, logAuditLog } from './auth.js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://nzwkeusxrrdncjjdqasj.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56d2tldXN4cnJkbmNqamRxYXNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTE4MzQzMSwiZXhwIjoyMDc0NzU5NDMxfQ.-9VfzrwGHHq1MwqdqqF9XvD9VSkt6qsweafw8L3E8jA';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

// الحصول على قائمة المستخدمين
export async function getUsers(req, res) {
  try {
    const { page = 1, limit = 10, search = '', role = '', status = '' } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('users')
      .select('*', { count: 'exact' });

    // فلترة حسب البحث
    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    // فلترة حسب الدور
    if (role) {
      query = query.eq('role', role);
    }

    // فلترة حسب الحالة
    if (status) {
      query = query.eq('status', status);
    }

    // الترتيب والترقيم
    const { data: users, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // إخفاء البيانات الحساسة
    const sanitizedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      status: user.status,
      avatarUrl: user.avatar_url,
      phone: user.phone,
      lastLoginAt: user.last_login_at,
      loginCount: user.login_count,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    }));

    res.json({
      success: true,
      data: {
        users: sanitizedUsers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء استرجاع قائمة المستخدمين'
    });
  }
}

// الحصول على مستخدم محدد
export async function getUserById(req, res) {
  try {
    const { userId } = req.params;

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }

    // إخفاء البيانات الحساسة
    const sanitizedUser = {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      status: user.status,
      avatarUrl: user.avatar_url,
      phone: user.phone,
      lastLoginAt: user.last_login_at,
      loginCount: user.login_count,
      failedLoginAttempts: user.failed_login_attempts,
      lockedUntil: user.locked_until,
      emailVerified: user.email_verified,
      twoFactorEnabled: user.two_factor_enabled,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    };

    res.json({
      success: true,
      data: { user: sanitizedUser }
    });

  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء استرجاع بيانات المستخدم'
    });
  }
}

// إنشاء مستخدم جديد من لوحة التحكم
export async function createUser(req, res) {
  try {
    const { email, password, fullName, phone, role = 'USER', status = 'ACTIVE' } = req.body;
    const currentUserId = req.user?.userId;
    const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    // التحقق من صحة البيانات
    if (!email || !password || !fullName) {
      return res.status(400).json({
        success: false,
        message: 'البريد الإلكتروني، كلمة المرور، والاسم الكامل مطلوبة'
      });
    }

    // التحقق من البريد الإلكتروني
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'البريد الإلكتروني غير صالح'
      });
    }

    // التحقق من كلمة المرور
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'
      });
    }

    // التحقق من وجود المستخدم
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'البريد الإلكتروني مستخدم بالفعل'
      });
    }

    // تشفير كلمة المرور
    const passwordHash = await bcrypt.hash(password, 12);

    // إنشاء المستخدم
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([
        {
          email,
          password_hash: passwordHash,
          full_name: fullName,
          phone,
          role,
          status,
          email_verified: true,
          created_by: currentUserId,
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (insertError) throw insertError;

    // تسجيل التدقيق
    await logAuditLog(
      currentUserId,
      'USER_CREATED',
      'users',
      newUser.id,
      null,
      { email, fullName, role, status },
      true,
      null,
      ipAddress,
      userAgent
    );

    res.status(201).json({
      success: true,
      message: 'تم إنشاء المستخدم بنجاح',
      data: {
        user: {
          id: newUser.id,
          email: newUser.email,
          fullName: newUser.full_name,
          role: newUser.role,
          status: newUser.status,
          phone: newUser.phone,
          createdAt: newUser.created_at
        }
      }
    });

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء إنشاء المستخدم'
    });
  }
}

// تحديث بيانات مستخدم
export async function updateUser(req, res) {
  try {
    const { userId } = req.params;
    const { fullName, phone, role, status, avatarUrl } = req.body;
    const currentUserId = req.user?.userId;
    const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    // الحصول على البيانات القديمة
    const { data: oldUser, error: oldError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (oldError || !oldUser) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }

    // منع تعديل المستخدمين ذوي الصلاحيات الأعلى
    if (oldUser.role === 'SUPER_ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'غير مسموح بتعديل بيانات المدير الفائق'
      });
    }

    const updateData = {};
    if (fullName) updateData.full_name = fullName;
    if (phone !== undefined) updateData.phone = phone;
    if (role) updateData.role = role;
    if (status) updateData.status = status;
    if (avatarUrl !== undefined) updateData.avatar_url = avatarUrl;
    updateData.updated_by = currentUserId;

    const { data: updatedUser, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    // تسجيل التدقيق
    await logAuditLog(
      currentUserId,
      'USER_UPDATED',
      'users',
      userId,
      oldUser,
      updatedUser,
      true,
      null,
      ipAddress,
      userAgent
    );

    res.json({
      success: true,
      message: 'تم تحديث بيانات المستخدم بنجاح',
      data: {
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          fullName: updatedUser.full_name,
          role: updatedUser.role,
          status: updatedUser.status,
          phone: updatedUser.phone,
          avatarUrl: updatedUser.avatar_url,
          updatedAt: updatedUser.updated_at
        }
      }
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء تحديث بيانات المستخدم'
    });
  }
}

// حذف مستخدم
export async function deleteUser(req, res) {
  try {
    const { userId } = req.params;
    const currentUserId = req.user?.userId;
    const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    // منع حذف المستخدم الحالي
    if (userId === currentUserId) {
      return res.status(400).json({
        success: false,
        message: 'لا يمكنك حذف حسابك الخاص'
      });
    }

    // الحصول على بيانات المستخدم
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }

    // منع حذف المديرين الفائقين
    if (user.role === 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'غير مسموح بحذف المدير الفائق'
      });
    }

    // حذف الجلسات المرتبطة
    await supabase
      .from('user_sessions')
      .delete()
      .eq('user_id', userId);

    // حذف المستخدم
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (deleteError) throw deleteError;

    // تسجيل التدقيق
    await logAuditLog(
      currentUserId,
      'USER_DELETED',
      'users',
      userId,
      user,
      null,
      true,
      null,
      ipAddress,
      userAgent
    );

    res.json({
      success: true,
      message: 'تم حذف المستخدم بنجاح'
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء حذف المستخدم'
    });
  }
}

// إعادة تعيين كلمة مرور المستخدم
export async function resetUserPassword(req, res) {
  try {
    const { userId } = req.params;
    const { newPassword } = req.body;
    const currentUserId = req.user?.userId;
    const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل'
      });
    }

    // التحقق من وجود المستخدم
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }

    // تشفير كلمة المرور الجديدة
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // تحديث كلمة المرور
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        password_hash: passwordHash,
        password_reset_token: null,
        password_reset_expires_at: null
      })
      .eq('id', userId);

    if (updateError) throw updateError;

    // إنهاء جميع الجلسات الحالية
    await supabase
      .from('user_sessions')
      .update({ is_active: false })
      .eq('user_id', userId);

    // تسجيل التدقيق
    await logAuditLog(
      currentUserId,
      'USER_PASSWORD_RESET',
      'users',
      userId,
      null,
      { passwordReset: true },
      true,
      null,
      ipAddress,
      userAgent
    );

    res.json({
      success: true,
      message: 'تم إعادة تعيين كلمة المرور بنجاح'
    });

  } catch (error) {
    console.error('Reset user password error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء إعادة تعيين كلمة المرور'
    });
  }
}

// الحصول على سجلات تسجيل الدخول
export async function getUserSessions(req, res) {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // التحقق من وجود المستخدم
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }

    const { data: sessions, error, count } = await supabase
      .from('user_sessions')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const sanitizedSessions = sessions.map(session => ({
      id: session.id,
      loginType: session.login_type,
      ipAddress: session.ip_address,
      userAgent: session.user_agent,
      isActive: session.is_active,
      lastActivityAt: session.last_activity_at,
      createdAt: session.created_at,
      expiresAt: session.expires_at
    }));

    res.json({
      success: true,
      data: {
        sessions: sanitizedSessions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get user sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء استرجاع سجلات تسجيل الدخول'
    });
  }
}

// الحصول على سجلات التدقيق
export async function getAuditLogs(req, res) {
  try {
    const { page = 1, limit = 50, userId = '', action = '' } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (action) {
      query = query.eq('action', action);
    }

    const { data: logs, error, count } = await query
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const sanitizedLogs = logs.map(log => ({
      id: log.id,
      userId: log.user_id,
      action: log.action,
      resourceType: log.resource_type,
      resourceId: log.resource_id,
      success: log.success,
      errorMessage: log.error_message,
      ipAddress: log.ip_address,
      createdAt: log.created_at
    }));

    res.json({
      success: true,
      data: {
        logs: sanitizedLogs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء استرجاع سجلات التدقيق'
    });
  }
}

export default {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  resetUserPassword,
  getUserSessions,
  getAuditLogs
};