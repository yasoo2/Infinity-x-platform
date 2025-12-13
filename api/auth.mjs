import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';

// Environment variables
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://nzwkeusxrrdncjjdqasj.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56d2tldXN4cnJkbmNqamRxYXNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTE4MzQzMSwiZXhwIjoyMDc0NzU5NDMxfQ.-9VfzrwGHHq1MwqdqqF9XvD9VSkt6qsweafw8L3E8jA';
const JWT_SECRET = process.env.JWT_SECRET || randomBytes(64).toString('hex');

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Password validation rules
const PASSWORD_REQUIREMENTS = {
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?'
};

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Rate limiting storage
const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_ATTEMPTS = 5;

// Helper functions
function validateEmail(email) {
    if (!email || typeof email !== 'string') {
        return { valid: false, error: 'Email is required' };
    }
    
    email = email.trim().toLowerCase();
    
    if (email.length > 254) {
        return { valid: false, error: 'Email is too long' };
    }
    
    if (!EMAIL_REGEX.test(email)) {
        return { valid: false, error: 'Invalid email format' };
    }
    
    return { valid: true, email };
}

function validatePassword(password) {
    if (!password || typeof password !== 'string') {
        return { valid: false, error: 'Password is required' };
    }
    
    if (password.length < PASSWORD_REQUIREMENTS.minLength) {
        return { valid: false, error: `Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters long` };
    }
    
    if (password.length > PASSWORD_REQUIREMENTS.maxLength) {
        return { valid: false, error: `Password must be no more than ${PASSWORD_REQUIREMENTS.maxLength} characters long` };
    }
    
    const errors = [];
    
    if (PASSWORD_REQUIREMENTS.requireUppercase && !/[A-Z]/.test(password)) {
        errors.push('at least one uppercase letter');
    }
    
    if (PASSWORD_REQUIREMENTS.requireLowercase && !/[a-z]/.test(password)) {
        errors.push('at least one lowercase letter');
    }
    
    if (PASSWORD_REQUIREMENTS.requireNumbers && !/\d/.test(password)) {
        errors.push('at least one number');
    }
    
    if (PASSWORD_REQUIREMENTS.requireSpecialChars && !new RegExp(`[${PASSWORD_REQUIREMENTS.specialChars.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`).test(password)) {
        errors.push('at least one special character');
    }
    
    if (errors.length > 0) {
        return { valid: false, error: `Password must contain ${errors.join(', ')}` };
    }
    
    // Check for common weak passwords
    const weakPasswords = ['password', '12345678', 'qwerty', 'admin', 'letmein', 'welcome'];
    if (weakPasswords.some(weak => password.toLowerCase().includes(weak))) {
        return { valid: false, error: 'Password is too common, please choose a stronger password' };
    }
    
    return { valid: true };
}

function validateFullName(fullName) {
    if (!fullName || typeof fullName !== 'string') {
        return { valid: false, error: 'Full name is required' };
    }
    
    fullName = fullName.trim();
    
    if (fullName.length < 2) {
        return { valid: false, error: 'Full name must be at least 2 characters long' };
    }
    
    if (fullName.length > 100) {
        return { valid: false, error: 'Full name is too long' };
    }
    
    if (!/^[a-zA-Z\s\-'\.]+$/.test(fullName)) {
        return { valid: false, error: 'Full name can only contain letters, spaces, hyphens, and apostrophes' };
    }
    
    return { valid: true, fullName };
}

function checkRateLimit(identifier) {
    const now = Date.now();
    const key = identifier;
    
    if (!rateLimitStore.has(key)) {
        rateLimitStore.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
        return { allowed: true };
    }
    
    const data = rateLimitStore.get(key);
    
    if (now > data.resetTime) {
        // Reset the counter
        rateLimitStore.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
        return { allowed: true };
    }
    
    if (data.count >= RATE_LIMIT_MAX_ATTEMPTS) {
        return { 
            allowed: false, 
            error: 'Too many attempts. Please try again later.',
            retryAfter: Math.ceil((data.resetTime - now) / 1000)
        };
    }
    
    data.count++;
    return { allowed: true };
}

function generateTokens(user) {
    const accessToken = jwt.sign(
        { 
            userId: user.id, 
            email: user.email, 
            role: user.role || 'USER' 
        },
        JWT_SECRET,
        { expiresIn: '15m' }
    );
    
    const refreshToken = jwt.sign(
        { userId: user.id },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
    
    return { accessToken, refreshToken };
}

async function logAuthEvent(userId, action, resourceType, resourceId, changes = {}, req) {
    try {
        const ipAddress = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown';
        const userAgent = req.headers['user-agent'] || 'unknown';
        
        await supabase.from('audit_logs').insert({
            user_id: userId,
            action,
            resource_type: resourceType,
            resource_id: resourceId,
            changes,
            ip_address: ipAddress,
            user_agent: userAgent
        });
    } catch (error) {
        console.error('Failed to log auth event:', error);
    }
}

// API Routes
export async function handleRegister(req, res) {
    try {
        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        
        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }
        
        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method not allowed' });
        }
        
        const { email, password, fullName } = req.body;
        
        // Validate input
        const emailValidation = validateEmail(email);
        if (!emailValidation.valid) {
            return res.status(400).json({ error: emailValidation.error });
        }
        
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.valid) {
            return res.status(400).json({ error: passwordValidation.error });
        }
        
        const nameValidation = validateFullName(fullName);
        if (!nameValidation.valid) {
            return res.status(400).json({ error: nameValidation.error });
        }
        
        // Check rate limit
        const rateLimit = checkRateLimit(`register_${emailValidation.email}`);
        if (!rateLimit.allowed) {
            return res.status(429).json({ 
                error: rateLimit.error,
                retryAfter: rateLimit.retryAfter
            });
        }
        
        // Check if user already exists
        const { data: existingUser } = await supabase
            .from('user_profiles')
            .select('email')
            .eq('email', emailValidation.email)
            .single();
        
        if (existingUser) {
            return res.status(409).json({ error: 'User already exists with this email' });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);
        
        // Create user in Supabase Auth
        const { data: authUser, error: authError } = await supabase.auth.signUp({
            email: emailValidation.email,
            password: hashedPassword,
            options: {
                data: {
                    full_name: nameValidation.fullName
                }
            }
        });
        
        if (authError) {
            console.error('Auth signup error:', authError);
            return res.status(400).json({ error: authError.message });
        }
        
        if (!authUser.user) {
            return res.status(500).json({ error: 'Failed to create user' });
        }
        
        // Generate tokens
        const { accessToken, refreshToken } = generateTokens({
            id: authUser.user.id,
            email: authUser.user.email,
            role: 'USER'
        });
        
        // Log the registration event
        await logAuthEvent(authUser.user.id, 'USER_REGISTERED', 'auth.users', authUser.user.id, {
            email: emailValidation.email,
            fullName: nameValidation.fullName
        }, req);
        
        return res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: authUser.user.id,
                email: authUser.user.email,
                fullName: nameValidation.fullName,
                role: 'USER'
            },
            accessToken,
            refreshToken
        });
        
    } catch (error) {
        console.error('Registration error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

export async function handleLogin(req, res) {
    try {
        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        
        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }
        
        if (req.method === 'GET') {
            return res.status(200).json({ 
                message: 'Login endpoint is working',
                timestamp: new Date().toISOString()
            });
        }
        
        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method not allowed' });
        }
        
        const { email, password, rememberMe = false } = req.body;
        
        // Validate input
        const emailValidation = validateEmail(email);
        if (!emailValidation.valid) {
            return res.status(400).json({ error: emailValidation.error });
        }
        
        if (!password || typeof password !== 'string') {
            return res.status(400).json({ error: 'Password is required' });
        }
        
        // Check rate limit
        const rateLimit = checkRateLimit(`login_${emailValidation.email}`);
        if (!rateLimit.allowed) {
            return res.status(429).json({ 
                error: rateLimit.error,
                retryAfter: rateLimit.retryAfter
            });
        }
        
        // Log login attempt
        await supabase.rpc('log_login_attempt', {
            p_email: emailValidation.email,
            p_success: false,
            p_error_message: 'Attempt initiated'
        });
        
        // Sign in with Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: emailValidation.email,
            password: password
        });
        
        if (authError) {
            // Log failed login attempt
            await supabase.rpc('log_login_attempt', {
                p_email: emailValidation.email,
                p_success: false,
                p_error_message: authError.message
            });
            
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        if (!authData.user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        // Get user profile with role
        const { data: userProfile } = await supabase
            .from('user_profiles')
            .select('id, email, full_name, role, is_active')
            .eq('id', authData.user.id)
            .single();
        
        if (!userProfile) {
            return res.status(404).json({ error: 'User profile not found' });
        }
        
        if (!userProfile.is_active) {
            return res.status(403).json({ error: 'Account is deactivated' });
        }
        
        // Generate tokens
        const { accessToken, refreshToken } = generateTokens(userProfile);
        
        let sessionToken = null;
        if (rememberMe) {
            // Create persistent session for remember me
            const { data: sessionData } = await supabase.rpc('create_user_session', {
                p_user_id: userProfile.id,
                p_days_valid: 30
            });
            
            if (sessionData) {
                sessionToken = sessionData;
            }
        }
        
        // Update last login time
        await supabase
            .from('user_profiles')
            .update({ last_login_at: new Date().toISOString() })
            .eq('id', userProfile.id);
        
        // Log successful login
        await logAuthEvent(userProfile.id, 'USER_LOGIN', 'auth.users', userProfile.id, {
            rememberMe,
            sessionToken: sessionToken ? 'created' : 'none'
        }, req);
        
        // Log successful login attempt
        await supabase.rpc('log_login_attempt', {
            p_email: emailValidation.email,
            p_success: true,
            p_error_message: NULL
        });
        
        return res.status(200).json({
            message: 'Login successful',
            user: {
                id: userProfile.id,
                email: userProfile.email,
                fullName: userProfile.full_name,
                role: userProfile.role
            },
            accessToken,
            refreshToken,
            sessionToken: sessionToken || undefined
        });
        
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

export async function handleLogout(req, res) {
    try {
        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        
        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }
        
        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method not allowed' });
        }
        
        const { sessionToken } = req.body;
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }
        
        const token = authHeader.substring(7);
        
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            
            // Log logout event
            await logAuthEvent(decoded.userId, 'USER_LOGOUT', 'auth.users', decoded.userId, {
                sessionToken: sessionToken ? 'provided' : 'none'
            }, req);
            
            // If session token provided, delete it
            if (sessionToken) {
                await supabase
                    .from('user_sessions')
                    .delete()
                    .eq('session_token', sessionToken);
            }
            
            return res.status(200).json({ message: 'Logout successful' });
            
        } catch (error) {
            return res.status(401).json({ error: 'Invalid token' });
        }
        
    } catch (error) {
        console.error('Logout error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

export async function handleRefreshToken(req, res) {
    try {
        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        
        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }
        
        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method not allowed' });
        }
        
        const { refreshToken } = req.body;
        
        if (!refreshToken) {
            return res.status(400).json({ error: 'Refresh token is required' });
        }
        
        try {
            const decoded = jwt.verify(refreshToken, JWT_SECRET);
            
            // Get user profile
            const { data: userProfile } = await supabase
                .from('user_profiles')
                .select('id, email, full_name, role, is_active')
                .eq('id', decoded.userId)
                .single();
            
            if (!userProfile) {
                return res.status(404).json({ error: 'User not found' });
            }
            
            if (!userProfile.is_active) {
                return res.status(403).json({ error: 'Account is deactivated' });
            }
            
            // Generate new tokens
            const { accessToken, refreshToken: newRefreshToken } = generateTokens(userProfile);
            
            // Log token refresh
            await logAuthEvent(userProfile.id, 'TOKEN_REFRESHED', 'auth.tokens', userProfile.id, {}, req);
            
            return res.status(200).json({
                accessToken,
                refreshToken: newRefreshToken
            });
            
        } catch (error) {
            return res.status(401).json({ error: 'Invalid refresh token' });
        }
        
    } catch (error) {
        console.error('Refresh token error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

export async function handleSessionLogin(req, res) {
    try {
        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        
        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }
        
        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method not allowed' });
        }
        
        const { sessionToken } = req.body;
        
        if (!sessionToken) {
            return res.status(400).json({ error: 'Session token is required' });
        }
        
        // Validate session token
        const { data: sessionData } = await supabase.rpc('validate_user_session', {
            p_session_token: sessionToken
        });
        
        if (!sessionData || !sessionData.is_valid) {
            return res.status(401).json({ 
                error: sessionData?.error_message || 'Invalid session token' 
            });
        }
        
        // Get user profile
        const { data: userProfile } = await supabase
            .from('user_profiles')
            .select('id, email, full_name, role, is_active')
            .eq('id', sessionData.user_id)
            .single();
        
        if (!userProfile) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        if (!userProfile.is_active) {
            return res.status(403).json({ error: 'Account is deactivated' });
        }
        
        // Generate tokens
        const { accessToken, refreshToken } = generateTokens(userProfile);
        
        // Update last login time
        await supabase
            .from('user_profiles')
            .update({ last_login_at: new Date().toISOString() })
            .eq('id', userProfile.id);
        
        // Log session login
        await logAuthEvent(userProfile.id, 'SESSION_LOGIN', 'auth.users', userProfile.id, {
            sessionToken: 'used'
        }, req);
        
        return res.status(200).json({
            message: 'Session login successful',
            user: {
                id: userProfile.id,
                email: userProfile.email,
                fullName: userProfile.full_name,
                role: userProfile.role
            },
            accessToken,
            refreshToken
        });
        
    } catch (error) {
        console.error('Session login error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

export async function handlePasswordResetRequest(req, res) {
    try {
        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        
        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }
        
        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method not allowed' });
        }
        
        const { email } = req.body;
        
        // Validate email
        const emailValidation = validateEmail(email);
        if (!emailValidation.valid) {
            return res.status(400).json({ error: emailValidation.error });
        }
        
        // Check rate limit
        const rateLimit = checkRateLimit(`reset_${emailValidation.email}`);
        if (!rateLimit.allowed) {
            return res.status(429).json({ 
                error: rateLimit.error,
                retryAfter: rateLimit.retryAfter
            });
        }
        
        // Find user by email
        const { data: userProfile } = await supabase
            .from('user_profiles')
            .select('id, email, full_name')
            .eq('email', emailValidation.email)
            .single();
        
        if (!userProfile) {
            // Don't reveal whether email exists
            return res.status(200).json({ 
                message: 'If the email exists, a password reset link has been sent' 
            });
        }
        
        // Create password reset token
        const { data: tokenData } = await supabase.rpc('create_password_reset_token', {
            p_user_id: userProfile.id,
            p_expires_hours: 1
        });
        
        if (!tokenData) {
            return res.status(500).json({ error: 'Failed to create reset token' });
        }
        
        // Log password reset request
        await logAuthEvent(userProfile.id, 'PASSWORD_RESET_REQUESTED', 'password_reset_tokens', tokenData, {
            email: emailValidation.email
        }, req);
        
        // In a real implementation, you would send an email here
        // For now, we'll return the token for testing purposes
        return res.status(200).json({
            message: 'Password reset link sent successfully',
            resetToken: tokenData // Remove this in production, only for testing
        });
        
    } catch (error) {
        console.error('Password reset request error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

export async function handlePasswordReset(req, res) {
    try {
        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        
        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }
        
        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method not allowed' });
        }
        
        const { token, newPassword } = req.body;
        
        if (!token || !newPassword) {
            return res.status(400).json({ error: 'Token and new password are required' });
        }
        
        // Validate new password
        const passwordValidation = validatePassword(newPassword);
        if (!passwordValidation.valid) {
            return res.status(400).json({ error: passwordValidation.error });
        }
        
        // Validate reset token
        const { data: tokenData } = await supabase.rpc('validate_password_reset_token', {
            p_token: token
        });
        
        if (!tokenData || !tokenData.is_valid) {
            return res.status(400).json({ 
                error: tokenData?.error_message || 'Invalid or expired reset token' 
            });
        }
        
        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        
        // Update user password in Supabase Auth
        const { error: updateError } = await supabase.auth.admin.updateUserById(
            tokenData.user_id,
            { password: hashedPassword }
        );
        
        if (updateError) {
            return res.status(500).json({ error: 'Failed to update password' });
        }
        
        // Mark reset token as used
        await supabase.rpc('mark_reset_token_used', {
            p_token: token
        });
        
        // Log password reset completion
        await logAuthEvent(tokenData.user_id, 'PASSWORD_RESET_COMPLETED', 'auth.users', tokenData.user_id, {}, req);
        
        return res.status(200).json({ message: 'Password reset successfully' });
        
    } catch (error) {
        console.error('Password reset error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

export async function handleGetUserProfile(req, res) {
    try {
        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        
        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }
        
        if (req.method !== 'GET') {
            return res.status(405).json({ error: 'Method not allowed' });
        }
        
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }
        
        const token = authHeader.substring(7);
        
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            
            // Get user profile
            const { data: userProfile } = await supabase
                .from('user_profiles')
                .select('id, email, full_name, role, is_active, last_login_at, created_at')
                .eq('id', decoded.userId)
                .single();
            
            if (!userProfile) {
                return res.status(404).json({ error: 'User not found' });
            }
            
            return res.status(200).json({
                user: userProfile
            });
            
        } catch (error) {
            return res.status(401).json({ error: 'Invalid token' });
        }
        
    } catch (error) {
        console.error('Get user profile error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

// Export all handlers
export default {
    handleRegister,
    handleLogin,
    handleLogout,
    handleRefreshToken,
    handleSessionLogin,
    handlePasswordResetRequest,
    handlePasswordReset,
    handleGetUserProfile
};