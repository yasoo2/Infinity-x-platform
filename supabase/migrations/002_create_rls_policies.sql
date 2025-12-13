-- User Profiles RLS Policies
-- Users can only view their own profile
CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = id);

-- Users can only update their own profile
CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles" ON public.user_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN')
        )
    );

-- Super admins can update any profile
CREATE POLICY "Super admins can update any profile" ON public.user_profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND role = 'SUPER_ADMIN'
        )
    );

-- Super admins can delete profiles
CREATE POLICY "Super admins can delete profiles" ON public.user_profiles
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND role = 'SUPER_ADMIN'
        )
    );

-- User Sessions RLS Policies
-- Users can only view their own sessions
CREATE POLICY "Users can view own sessions" ON public.user_sessions
    FOR SELECT USING (auth.uid() = user_id);

-- Users can only delete their own sessions
CREATE POLICY "Users can delete own sessions" ON public.user_sessions
    FOR DELETE USING (auth.uid() = user_id);

-- Login Attempts RLS Policies
-- Only admins can view login attempts
CREATE POLICY "Admins can view login attempts" ON public.login_attempts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN')
        )
    );

-- Admins can insert login attempts (for tracking)
CREATE POLICY "Admins can insert login attempts" ON public.login_attempts
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN')
        )
    );

-- Password Reset Tokens RLS Policies
-- Users can only view their own reset tokens
CREATE POLICY "Users can view own reset tokens" ON public.password_reset_tokens
    FOR SELECT USING (auth.uid() = user_id);

-- Users can only create tokens for themselves (through function)
CREATE POLICY "Users can create own reset tokens" ON public.password_reset_tokens
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update their own tokens
CREATE POLICY "Users can update own reset tokens" ON public.password_reset_tokens
    FOR UPDATE USING (auth.uid() = user_id);

-- Audit Logs RLS Policies
-- Users can only view their own audit logs
CREATE POLICY "Users can view own audit logs" ON public.audit_logs
    FOR SELECT USING (auth.uid() = user_id);

-- Admins can view all audit logs
CREATE POLICY "Admins can view all audit logs" ON public.audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN')
        )
    );

-- Admins can insert audit logs
CREATE POLICY "Admins can insert audit logs" ON public.audit_logs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN')
        )
    );

-- Grant permissions to anon and authenticated roles
GRANT SELECT ON public.user_profiles TO anon, authenticated;
GRANT UPDATE ON public.user_profiles TO authenticated;
GRANT INSERT ON public.user_profiles TO anon;

GRANT SELECT ON public.user_sessions TO authenticated;
GRANT INSERT ON public.user_sessions TO authenticated;
GRANT DELETE ON public.user_sessions TO authenticated;

GRANT SELECT ON public.login_attempts TO authenticated;
GRANT INSERT ON public.login_attempts TO authenticated;

GRANT SELECT ON public.password_reset_tokens TO authenticated;
GRANT INSERT ON public.password_reset_tokens TO authenticated;
GRANT UPDATE ON public.password_reset_tokens TO authenticated;

GRANT SELECT ON public.audit_logs TO authenticated;
GRANT INSERT ON public.audit_logs TO authenticated;

-- Create function to log login attempts
CREATE OR REPLACE FUNCTION public.log_login_attempt(
    p_email TEXT,
    p_success BOOLEAN,
    p_error_message TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.login_attempts (email, ip_address, user_agent, success, error_message)
    VALUES (
        p_email,
        inet_client_addr(),
        current_setting('request.headers', true)::json->>'user-agent',
        p_success,
        p_error_message
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to create password reset token
CREATE OR REPLACE FUNCTION public.create_password_reset_token(
    p_user_id UUID,
    p_expires_hours INTEGER DEFAULT 24
)
RETURNS TEXT AS $$
DECLARE
    v_token TEXT;
BEGIN
    -- Generate secure random token
    v_token := encode(gen_random_bytes(32), 'hex');
    
    -- Insert token with expiration
    INSERT INTO public.password_reset_tokens (user_id, token, expires_at)
    VALUES (p_user_id, v_token, NOW() + INTERVAL '1 hour' * p_expires_hours);
    
    RETURN v_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to validate password reset token
CREATE OR REPLACE FUNCTION public.validate_password_reset_token(
    p_token TEXT
)
RETURNS TABLE (
    user_id UUID,
    is_valid BOOLEAN,
    error_message TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        prt.user_id,
        CASE 
            WHEN prt.expires_at > NOW() AND prt.used = false THEN true
            ELSE false
        END AS is_valid,
        CASE 
            WHEN prt.expires_at <= NOW() THEN 'Token has expired'
            WHEN prt.used = true THEN 'Token has already been used'
            ELSE NULL
        END AS error_message
    FROM public.password_reset_tokens prt
    WHERE prt.token = p_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to mark password reset token as used
CREATE OR REPLACE FUNCTION public.mark_reset_token_used(
    p_token TEXT
)
RETURNS VOID AS $$
BEGIN
    UPDATE public.password_reset_tokens
    SET used = true, updated_at = NOW()
    WHERE token = p_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to create user session for remember me
CREATE OR REPLACE FUNCTION public.create_user_session(
    p_user_id UUID,
    p_days_valid INTEGER DEFAULT 30
)
RETURNS TEXT AS $$
DECLARE
    v_session_token TEXT;
BEGIN
    -- Generate secure session token
    v_session_token := encode(gen_random_bytes(32), 'hex');
    
    -- Insert session with expiration
    INSERT INTO public.user_sessions (user_id, session_token, expires_at)
    VALUES (p_user_id, v_session_token, NOW() + INTERVAL '1 day' * p_days_valid);
    
    RETURN v_session_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to validate user session
CREATE OR REPLACE FUNCTION public.validate_user_session(
    p_session_token TEXT
)
RETURNS TABLE (
    user_id UUID,
    is_valid BOOLEAN,
    error_message TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        us.user_id,
        CASE 
            WHEN us.expires_at > NOW() THEN true
            ELSE false
        END AS is_valid,
        CASE 
            WHEN us.expires_at <= NOW() THEN 'Session has expired'
            ELSE NULL
        END AS error_message
    FROM public.user_sessions us
    WHERE us.session_token = p_session_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;