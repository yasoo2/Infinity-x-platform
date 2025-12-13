-- نظام المصادقة الشامل - مخطط قاعدة البيانات

-- إنشاء مخطط خاص بالمصادقة
CREATE SCHEMA IF NOT EXISTS auth_schema;

-- أنواع الأدوار
CREATE TYPE user_role AS ENUM ('USER', 'ADMIN', 'SUPER_ADMIN');

-- حالة المستخدم
CREATE TYPE user_status AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING');

-- نوع تسجيل الدخول
CREATE TYPE login_type AS ENUM ('PASSWORD', 'OAUTH', 'MAGIC_LINK');

-- جدول المستخدمين الرئيسي
CREATE TABLE auth_schema.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    full_name VARCHAR(255) NOT NULL,
    role user_role DEFAULT 'USER',
    status user_status DEFAULT 'PENDING',
    email_verified BOOLEAN DEFAULT FALSE,
    phone VARCHAR(20),
    avatar_url TEXT,
    last_login_at TIMESTAMP WITH TIME ZONE,
    login_count INTEGER DEFAULT 0,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    remember_me_token VARCHAR(255),
    remember_me_expires_at TIMESTAMP WITH TIME ZONE,
    password_reset_token VARCHAR(255),
    password_reset_expires_at TIMESTAMP WITH TIME ZONE,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(255),
    preferences JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth_schema.users(id),
    updated_by UUID REFERENCES auth_schema.users(id)
);

-- جدول الأدوار والصلاحيات
CREATE TABLE auth_schema.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول جلسات تسجيل الدخول
CREATE TABLE auth_schema.user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth_schema.users(id) ON DELETE CASCADE,
    session_token VARCHAR(500) UNIQUE NOT NULL,
    refresh_token VARCHAR(500),
    ip_address INET,
    user_agent TEXT,
    login_type login_type DEFAULT 'PASSWORD',
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    refresh_expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول سجلات التدقيق
CREATE TABLE auth_schema.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth_schema.users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول محاولات تسجيل الدخول الفاشلة
CREATE TABLE auth_schema.failed_login_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    reason VARCHAR(100),
    attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول إعدادات النظام
CREATE TABLE auth_schema.system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT,
    data_type VARCHAR(20) DEFAULT 'string',
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء فهارس للأداء
CREATE INDEX idx_users_email ON auth_schema.users(email);
CREATE INDEX idx_users_status ON auth_schema.users(status);
CREATE INDEX idx_users_role ON auth_schema.users(role);
CREATE INDEX idx_sessions_user_id ON auth_schema.user_sessions(user_id);
CREATE INDEX idx_sessions_token ON auth_schema.user_sessions(session_token);
CREATE INDEX idx_sessions_active ON auth_schema.user_sessions(is_active);
CREATE INDEX idx_audit_user_id ON auth_schema.audit_logs(user_id);
CREATE INDEX idx_audit_action ON auth_schema.audit_logs(action);
CREATE INDEX idx_audit_created_at ON auth_schema.audit_logs(created_at);
CREATE INDEX idx_failed_attempts_email ON auth_schema.failed_login_attempts(email);
CREATE INDEX idx_failed_attempts_ip ON auth_schema.failed_login_attempts(ip_address);
CREATE INDEX idx_failed_attempts_time ON auth_schema.failed_login_attempts(attempted_at);

-- إضافة بيانات الأدوار الافتراضية
INSERT INTO auth_schema.roles (name, description, permissions) VALUES
('USER', 'مستخدم عادي', '["read:own_profile", "update:own_profile"]'),
('ADMIN', 'مدير النظام', '["read:users", "create:users", "update:users", "delete:users", "read:settings", "update:settings"]'),
('SUPER_ADMIN', 'مدير فائق', '["*"]');

-- إضافة إعدادات النظام الافتراضية
INSERT INTO auth_schema.system_settings (key, value, data_type, description, is_public) VALUES
('password_min_length', '8', 'integer', 'الحد الأدنى لطول كلمة المرور', true),
('password_require_uppercase', 'true', 'boolean', 'مطلوب أحرف كبيرة في كلمة المرور', true),
('password_require_lowercase', 'true', 'boolean', 'مطلوب أحرف صغيرة في كلمة المرور', true),
('password_require_numbers', 'true', 'boolean', 'مطلوب أرقام في كلمة المرور', true),
('password_require_symbols', 'true', 'boolean', 'مطلوب رموز خاصة في كلمة المرور', true),
('max_login_attempts', '5', 'integer', 'الحد الأقصى لمحاولات تسجيل الدخول الفاشلة', false),
('lockout_duration_minutes', '15', 'integer', 'مدة الحجب بعد المحاولات الفاشلة (بالدقائق)', false),
('session_timeout_hours', '24', 'integer', 'مدة انتهاء الجلسة (بالساعات)', false),
('remember_me_days', '30', 'integer', 'مدة تذكرني (بالأيام)', false),
('enable_2fa', 'false', 'boolean', 'تمكين المصادقة الثنائية', false),
('require_email_verification', 'false', 'boolean', 'مطلوب التحقق من البريد الإلكتروني', false);

-- دالة لتحديث عمود updated_at تلقائياً
CREATE OR REPLACE FUNCTION auth_schema.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- إنشاء triggers للتحديث التلقائي
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON auth_schema.users
    FOR EACH ROW EXECUTE FUNCTION auth_schema.update_updated_at_column();

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON auth_schema.roles
    FOR EACH ROW EXECUTE FUNCTION auth_schema.update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON auth_schema.system_settings
    FOR EACH ROW EXECUTE FUNCTION auth_schema.update_updated_at_column();

-- منح الصلاحيات للأدوار العامة
GRANT USAGE ON SCHEMA auth_schema TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA auth_schema TO authenticated;
GRANT SELECT ON auth_schema.system_settings TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA auth_schema TO authenticated;

-- تمكين RLS (Row Level Security)
ALTER TABLE auth_schema.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_schema.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_schema.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_schema.failed_login_attempts ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان للمستخدمين
CREATE POLICY "Users can view own profile" ON auth_schema.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON auth_schema.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON auth_schema.users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth_schema.users u
            WHERE u.id = auth.uid() AND u.role IN ('ADMIN', 'SUPER_ADMIN')
        )
    );

CREATE POLICY "Admins can manage users" ON auth_schema.users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth_schema.users u
            WHERE u.id = auth.uid() AND u.role IN ('ADMIN', 'SUPER_ADMIN')
        )
    );

-- سياسات الأمان للجلسات
CREATE POLICY "Users can manage own sessions" ON auth_schema.user_sessions
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Admins can view all sessions" ON auth_schema.user_sessions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth_schema.users u
            WHERE u.id = auth.uid() AND u.role IN ('ADMIN', 'SUPER_ADMIN')
        )
    );

-- سياسات الأمان لسجلات التدقيق
CREATE POLICY "Admins can view audit logs" ON auth_schema.audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth_schema.users u
            WHERE u.id = auth.uid() AND u.role IN ('ADMIN', 'SUPER_ADMIN')
        )
    );

-- إنشاء مستخدم سوبر أدمن افتراضي (سيتم تغيير كلمة المرور لاحقاً)
INSERT INTO auth_schema.users (
    email, password_hash, full_name, role, status, email_verified, created_by
) VALUES (
    'admin@system.com',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password: password
    'System Administrator',
    'SUPER_ADMIN',
    'ACTIVE',
    true,
    NULL
);