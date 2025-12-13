// خادم API المصادقة الشامل
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import dotenv from 'dotenv';

import {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  updateUserProfile,
  authenticateToken
} from './auth.js';

import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  resetUserPassword,
  getUserSessions,
  getAuditLogs
} from './users.js';

import { requireRole } from './auth.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// إعدادات الأمان
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || ['http://localhost:3000', 'http://localhost:5173', 'https://xelitesolutions.com'],
  credentials: true
}));

// حدود معدل الطلبات
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 100, // 100 طلب لكل IP
  message: {
    success: false,
    message: 'تم تجاوز الحد الأقصى لعدد الطلبات، يرجى المحاولة لاحقاً'
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 5, // 5 محاولات لكل IP
  message: {
    success: false,
    message: 'تم تجاوز الحد الأقصى لمحاولات تسجيل الدخول، يرجى المحاولة لاحقاً'
  }
});

app.use(limiter);
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware للتعامل مع الأخطاء
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'حدث خطأ في الخادم',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ==== API ROUTES ====

// صحة الخادم
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'خادم المصادقة يعمل بنجاح',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// ==== AUTH ROUTES ====

// تسجيل مستخدم جديد
app.post('/api/auth/register', authLimiter, registerUser);

// تسجيل دخول
app.post('/api/auth/login', authLimiter, loginUser);

// تسجيل خروج
app.post('/api/auth/logout', authenticateToken, logoutUser);

// الحصول على المستخدم الحالي
app.get('/api/auth/me', authenticateToken, getCurrentUser);

// تحديث الملف الشخصي
app.put('/api/auth/profile', authenticateToken, updateUserProfile);

// ==== USER MANAGEMENT ROUTES ====

// الحصول على قائمة المستخدمين (للمديرين فقط)
app.get('/api/users', authenticateToken, requireRole(['ADMIN', 'SUPER_ADMIN']), getUsers);

// الحصول على مستخدم محدد
app.get('/api/users/:userId', authenticateToken, requireRole(['ADMIN', 'SUPER_ADMIN']), getUserById);

// إنشاء مستخدم جديد (للمديرين فقط)
app.post('/api/users', authenticateToken, requireRole(['ADMIN', 'SUPER_ADMIN']), createUser);

// تحديث بيانات مستخدم
app.put('/api/users/:userId', authenticateToken, requireRole(['ADMIN', 'SUPER_ADMIN']), updateUser);

// حذف مستخدم
app.delete('/api/users/:userId', authenticateToken, requireRole(['ADMIN', 'SUPER_ADMIN']), deleteUser);

// إعادة تعيين كلمة مرور المستخدم
app.post('/api/users/:userId/reset-password', authenticateToken, requireRole(['ADMIN', 'SUPER_ADMIN']), resetUserPassword);

// الحصول على سجلات تسجيل دخول المستخدم
app.get('/api/users/:userId/sessions', authenticateToken, requireRole(['ADMIN', 'SUPER_ADMIN']), getUserSessions);

// ==== AUDIT ROUTES ====

// الحصول على سجلات التدقيق (للمديرين فقط)
app.get('/api/audit-logs', authenticateToken, requireRole(['ADMIN', 'SUPER_ADMIN']), getAuditLogs);

// ==== SYSTEM ROUTES ====

// الحصول على إحصائيات النظام (للمديرين فقط)
app.get('/api/system/stats', authenticateToken, requireRole(['ADMIN', 'SUPER_ADMIN']), async (req, res) => {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    
    const supabaseUrl = process.env.SUPABASE_URL || 'https://nzwkeusxrrdncjjdqasj.supabase.co';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56d2tldXN4cnJkbmNqamRxYXNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTE4MzQzMSwiZXhwIjoyMDc0NzU5NDMxfQ.-9VfzrwGHHq1MwqdqqF9XvD9VSkt6qsweafw8L3E8jA';

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // جمع الإحصائيات
    const [
      { count: totalUsers },
      { count: activeUsers },
      { count: activeSessions },
      { count: todayLoginAttempts },
      { count: failedLoginAttempts }
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
      supabase.from('user_sessions').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('user_sessions').select('*', { count: 'exact', head: true }).gte('created_at', new Date().toISOString().split('T')[0]),
      supabase.from('failed_login_attempts').select('*', { count: 'exact', head: true }).gte('attempted_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        activeSessions,
        todayLoginAttempts,
        failedLoginAttempts,
        systemStatus: 'healthy',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('System stats error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء استرجاع إحصائيات النظام'
    });
  }
});

// ==== 404 HANDLER ====

app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'الواجهة المطلوبة غير موجودة',
    path: req.originalUrl
  });
});

// ==== START SERVER ====

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 خادم المصادقة يعمل على المنفذ ${PORT}`);
  console.log(`📋 صحة الخادم: http://localhost:${PORT}/api/health`);
  console.log(`🔐 نقاط نهاية المصادقة جاهزة`);
  console.log(`👥 إدارة المستخدمين جاهزة`);
  console.log(`📊 نظام التدقيق والمراقبة جاهز`);
});

export default app;