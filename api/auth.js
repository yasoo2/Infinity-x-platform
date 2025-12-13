// نظام المصادقة الشامل - API المصادقة
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

// تهيئة Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://nzwkeusxrrdncjjdqasj.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56d2tldXN4cnJkbmNqamRxYXNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTE4MzQzMSwiZXhwIjoyMDc0NzU5NDMxfQ.-9VfzrwGHHq1MwqdqqF9XvD9VSkt6qsweafw8L3E8jA';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

// إعدادات الأمان
const SECURITY_CONFIG = {
  BCRYPT_ROUNDS: 12,
  JWT_SECRET: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
  JWT_EXPIRES_IN: '24h',
  REFRESH_TOKEN_EXPIRES_IN: '30d',
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION_MINUTES: 15,
  SESSION_TIMEOUT_HOURS: 24,
  REMEMBER_ME_DAYS: 30
};

// دوال مساعدة
function generateToken(payload, expiresIn = SECURITY_CONFIG.JWT_EXPIRES_IN) {
  return jwt.sign(payload, SECURITY_CONFIG.JWT_SECRET, { expiresIn });
}

function generateSessionToken() {
  return jwt.sign(
    { sessionId: Math.random().toString(36).substring(2) + Date.now().toString(36) },
    SECURITY_CONFIG.JWT_SECRET,
    { expiresIn: SECURITY_CONFIG.SESSION_TIMEOUT_HOURS + 'h' }
  );
}

function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validatePassword(password) {
  const settings = {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSymbols: true
  };

  if (password.length < settings.minLength) {
    return { valid: false, message: `كلمة المرور يجب أن تكون ${settings.minLength} أحرف على الأقل` };
  }

  if (settings.requireUppercase && !/[A-Z]/.test(password)) {
    return { valid: false, message: 'كلمة المرور يجب أن تحتوي على أحرف كبيرة' };
  }

  if (settings.requireLowercase && !/[a-z]/.test(password)) {
    return { valid: false, message: 'كلمة المرور يجب أن تحتوي على أحرف صغيرة' };
  }

  if (settings.requireNumbers && !/\d/.test(password)) {
    return { valid: false, message: 'كلمة المرور يجب أن تحتوي على أرقام' };
  }

  if (settings.requireSymbols && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return { valid: false, message: 'كلمة المرور يجب أن تحتوي على رموز خاصة' };
  }

  return { valid: true };
}

async function checkLoginAttempts(email, ipAddress) {
  try {
    // التحقق من المحاولات الفاشلة الأخيرة
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    
    const { data: failedAttempts, error } = await supabase
      .from('failed_login_attempts')
      .select('*')
      .or(`email.eq.${email},ip_address.eq.${ipAddress}`)
      .gte('attempted_at', fifteenMinutesAgo)
      .order('attempted_at', { ascending: false });

    if (error) throw error;

    if (failedAttempts.length >= SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS) {
      return {
        blocked: true,
        message: 'تم حجب الحساب مؤقتاً بسبب محاولات تسجيل دخول فاشلة متعددة. يرجى المحاولة لاحقاً.'
      };
    }

    return { blocked: false, attempts: failedAttempts.length };
  } catch (error) {
    console.error('Error checking login attempts:', error);
    return { blocked: false, attempts: 0 };
  }
}

async function logFailedAttempt(email, ipAddress, userAgent, reason) {
  try {
    await supabase.from('failed_login_attempts').insert([
      {
        email,
        ip_address: ipAddress,
        user_agent: userAgent,
        reason,
        attempted_at: new Date().toISOString()
      }
    ]);
  } catch (error) {
    console.error('Error logging failed attempt:', error);
  }
}

async function logAuditLog(userId, action, resourceType, resourceId, oldValues, newValues, success, errorMessage, ipAddress, userAgent) {
  try {
    await supabase.from('audit_logs').insert([
      {
        user_id: userId,
        action,
        resource_type: resourceType,
        resource_id: resourceId,
        old_values: oldValues,
        new_values: newValues,
        success,
        error_message: errorMessage,
        ip_address: ipAddress,
        user_agent: userAgent,
        created_at: new Date().toISOString()
      }
    ]);
  } catch (error) {
    console.error('Error logging audit log:', error);
  }
}

// API Endpoints
export async function registerUser(req, res) {
  try {
    const { email, password, fullName, phone } = req.body;
    const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    // التحقق من صحة البيانات
    if (!email || !password || !fullName) {
      return res.status(400).json({
        success: false,
        message: 'البريد الإلكتروني، كلمة المرور، والاسم الكامل مطلوبة'
      });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'البريد الإلكتروني غير صالح'
      });
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        message: passwordValidation.message
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
    const passwordHash = await bcrypt.hash(password, SECURITY_CONFIG.BCRYPT_ROUNDS);

    // إنشاء المستخدم
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([
        {
          email,
          password_hash: passwordHash,
          full_name: fullName,
          phone,
          status: 'ACTIVE',
          email_verified: true, // يمكن تغييره لاحقاً لإرسال بريد تأكيد
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (insertError) throw insertError;

    // تسجيل التدقيق
    await logAuditLog(
      newUser.id,
      'USER_REGISTERED',
      'users',
      newUser.id,
      null,
      { email, fullName, role: 'USER' },
      true,
      null,
      ipAddress,
      userAgent
    );

    // إنشاء token لتسجيل الدخول التلقائي
    const token = generateToken({
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role,
      fullName: newUser.full_name
    });

    const sessionToken = generateSessionToken();

    // إنشاء جلسة
    await supabase.from('user_sessions').insert([
      {
        user_id: newUser.id,
        session_token: sessionToken,
        login_type: 'PASSWORD',
        expires_at: new Date(Date.now() + SECURITY_CONFIG.SESSION_TIMEOUT_HOURS * 60 * 60 * 1000).toISOString(),
        ip_address: ipAddress,
        user_agent: userAgent
      }
    ]);

    // تحديث عدد تسجيلات الدخول
    await supabase
      .from('users')
      .update({ 
        last_login_at: new Date().toISOString(),
        login_count: 1
      })
      .eq('id', newUser.id);

    res.status(201).json({
      success: true,
      message: 'تم إنشاء الحساب بنجاح',
      data: {
        user: {
          id: newUser.id,
          email: newUser.email,
          fullName: newUser.full_name,
          role: newUser.role,
          status: newUser.status
        },
        token,
        sessionToken
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء إنشاء الحساب'
    });
  }
}

export async function loginUser(req, res) {
  try {
    const { email, password, rememberMe } = req.body;
    const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'البريد الإلكتروني وكلمة المرور مطلوبة'
      });
    }

    // التحقق من محاولات تسجيل الدخول الفاشلة
    const attemptCheck = await checkLoginAttempts(email, ipAddress);
    if (attemptCheck.blocked) {
      await logFailedAttempt(email, ipAddress, userAgent, 'ACCOUNT_LOCKED');
      return res.status(429).json({
        success: false,
        message: attemptCheck.message
      });
    }

    // البحث عن المستخدم
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (userError || !user) {
      await logFailedAttempt(email, ipAddress, userAgent, 'USER_NOT_FOUND');
      return res.status(401).json({
        success: false,
        message: 'بيانات تسجيل الدخول غير صحيحة'
      });
    }

    // التحقق من حالة المستخدم
    if (user.status === 'INACTIVE' || user.status === 'SUSPENDED') {
      await logFailedAttempt(email, ipAddress, userAgent, 'ACCOUNT_DISABLED');
      return res.status(403).json({
        success: false,
        message: 'الحساب غير مفعل أو موقوف'
      });
    }

    // التحقق من الحجب المؤقت
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      await logFailedAttempt(email, ipAddress, userAgent, 'TEMPORARILY_LOCKED');
      return res.status(423).json({
        success: false,
        message: 'الحساب موقوف مؤقتاً بسبب محاولات فاشلة متعددة'
      });
    }

    // التحقق من كلمة المرور
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      await logFailedAttempt(email, ipAddress, userAgent, 'INVALID_PASSWORD');
      
      // تحديث عدد المحاولات الفاشلة
      const failedAttempts = user.failed_login_attempts + 1;
      const updateData = { failed_login_attempts: failedAttempts };

      if (failedAttempts >= SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS) {
        updateData.locked_until = new Date(Date.now() + SECURITY_CONFIG.LOCKOUT_DURATION_MINUTES * 60 * 1000).toISOString();
      }

      await supabase.from('users').update(updateData).eq('id', user.id);

      return res.status(401).json({
        success: false,
        message: 'بيانات تسجيل الدخول غير صحيحة'
      });
    }

    // إعادة تعيين عدد المحاولات الفاشلة
    await supabase.from('users').update({ 
      failed_login_attempts: 0,
      locked_until: null
    }).eq('id', user.id);

    // إنشاء التوكنات
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      fullName: user.full_name
    }, rememberMe ? SECURITY_CONFIG.REFRESH_TOKEN_EXPIRES_IN : SECURITY_CONFIG.JWT_EXPIRES_IN);

    const sessionToken = generateSessionToken();

    // إنشاء جلسة
    const sessionData = {
      user_id: user.id,
      session_token: sessionToken,
      login_type: 'PASSWORD',
      expires_at: new Date(Date.now() + (rememberMe ? 
        SECURITY_CONFIG.REMEMBER_ME_DAYS * 24 * 60 * 60 * 1000 : 
        SECURITY_CONFIG.SESSION_TIMEOUT_HOURS * 60 * 60 * 1000)).toISOString(),
      ip_address: ipAddress,
      user_agent: userAgent
    };

    if (rememberMe) {
      sessionData.refresh_expires_at = new Date(Date.now() + SECURITY_CONFIG.REMEMBER_ME_DAYS * 24 * 60 * 60 * 1000).toISOString();
    }

    await supabase.from('user_sessions').insert([sessionData]);

    // تحديث بيانات تسجيل الدخول
    await supabase.from('users').update({ 
      last_login_at: new Date().toISOString(),
      login_count: (user.login_count || 0) + 1
    }).eq('id', user.id);

    // تسجيل التدقيق
    await logAuditLog(
      user.id,
      'USER_LOGIN',
      'users',
      user.id,
      null,
      { ipAddress, userAgent, rememberMe },
      true,
      null,
      ipAddress,
      userAgent
    );

    res.json({
      success: true,
      message: 'تم تسجيل الدخول بنجاح',
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          role: user.role,
          status: user.status,
          avatarUrl: user.avatar_url
        },
        token,
        sessionToken,
        rememberMe: rememberMe || false
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء تسجيل الدخول'
    });
  }
}

export async function logoutUser(req, res) {
  try {
    const { sessionToken } = req.body;
    const userId = req.user?.userId;
    const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    if (sessionToken) {
      // إنهاء الجلسة
      await supabase
        .from('user_sessions')
        .update({ is_active: false })
        .eq('session_token', sessionToken);
    }

    // تسجيل التدقيق
    if (userId) {
      await logAuditLog(
        userId,
        'USER_LOGOUT',
        'sessions',
        null,
        null,
        { sessionToken },
        true,
        null,
        ipAddress,
        userAgent
      );
    }

    res.json({
      success: true,
      message: 'تم تسجيل الخروج بنجاح'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء تسجيل الخروج'
    });
  }
}

export async function getCurrentUser(req, res) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'غير مصرح'
      });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, full_name, role, status, avatar_url, created_at')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          role: user.role,
          status: user.status,
          avatarUrl: user.avatar_url,
          createdAt: user.created_at
        }
      }
    });

  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء استرجاع بيانات المستخدم'
    });
  }
}

export async function updateUserProfile(req, res) {
  try {
    const userId = req.user?.userId;
    const { fullName, phone, avatarUrl } = req.body;
    const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'غير مصرح'
      });
    }

    // الحصول على البيانات القديمة
    const { data: oldUser } = await supabase
      .from('users')
      .select('full_name, phone, avatar_url')
      .eq('id', userId)
      .single();

    const updateData = {};
    if (fullName) updateData.full_name = fullName;
    if (phone !== undefined) updateData.phone = phone;
    if (avatarUrl !== undefined) updateData.avatar_url = avatarUrl;

    const { data: updatedUser, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select('id, email, full_name, role, status, avatar_url, phone, updated_at')
      .single();

    if (error) throw error;

    // تسجيل التدقيق
    await logAuditLog(
      userId,
      'USER_PROFILE_UPDATED',
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
      message: 'تم تحديث الملف الشخصي بنجاح',
      data: {
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          fullName: updatedUser.full_name,
          role: updatedUser.role,
          status: updatedUser.status,
          avatarUrl: updatedUser.avatar_url,
          phone: updatedUser.phone,
          updatedAt: updatedUser.updated_at
        }
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء تحديث الملف الشخصي'
    });
  }
}

// دالة middleware للتحقق من التوكن
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'توكن المصادقة مطلوب'
    });
  }

  jwt.verify(token, SECURITY_CONFIG.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: 'توكن غير صالح أو منتهي'
      });
    }

    req.user = user;
    next();
  });
}

// دالة middleware للتحقق من الأدوار
export function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'غير مصرح'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'ليس لديك الصلاحية للوصول إلى هذا المورد'
      });
    }

    next();
  };
}

export default {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  updateUserProfile,
  authenticateToken,
  requireRole
};