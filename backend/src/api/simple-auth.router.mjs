import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

const simpleAuthRouterFactory = ({ db }) => {
    const router = express.Router();
    
    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL || 'https://nzwkeusxrrdncjjdqasj.supabase.co';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56d2tldXN4cnJkbmNqamRxYXNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTE4MzQzMSwiZXhwIjoyMDc0NzU5NDMxfQ.-9VfzrwGHHq1MwqdqqF9XvD9VSkt6qsweafw8L3E8jA';
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    /**
     * @route POST /api/v1/auth/simple-login
     * @description Simple login for super admin
     * @access Public
     */
    router.post('/simple-login', async (req, res) => {
        try {
            const { email, password, rememberMe } = req.body;

            // Validation
            if (!email || !password) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Email and password are required.' 
                });
            }

            // Check for super admin user
            const { data: user, error: userError } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('email', email.toLowerCase())
                .eq('role', 'SUPER_ADMIN')
                .single();

            if (userError || !user) {
                return res.status(401).json({ 
                    success: false, 
                    error: 'Invalid credentials.' 
                });
            }

            // Get auth user for password verification
            const { data: authUser, error: authError } = await supabase
                .from('users')
                .select('id, email, encrypted_password')
                .eq('email', email.toLowerCase())
                .single();

            if (authError || !authUser) {
                return res.status(401).json({ 
                    success: false, 
                    error: 'Invalid credentials.' 
                });
            }

            // Verify password (using bcrypt hash)
            const isPasswordValid = await bcrypt.compare(password, authUser.encrypted_password);
            
            if (!isPasswordValid) {
                return res.status(401).json({ 
                    success: false, 
                    error: 'Invalid credentials.' 
                });
            }

            // Generate JWT token
            const token = jwt.sign(
                { 
                    userId: user.id, 
                    email: user.email, 
                    role: user.role 
                },
                process.env.JWT_SECRET || 'your-secret-key',
                { expiresIn: rememberMe ? '30d' : '24h' }
            );

            // Create session
            const expiresAt = rememberMe 
                ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
                : new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

            const { error: sessionError } = await supabase
                .from('user_sessions')
                .insert({
                    user_id: user.id,
                    session_token: token,
                    expires_at: expiresAt.toISOString(),
                    remember_me: rememberMe || false
                });

            if (sessionError) {
                console.error('Session creation error:', sessionError);
            }

            // Update last login
            await supabase
                .from('user_profiles')
                .update({ last_login_at: new Date().toISOString() })
                .eq('id', user.id);

            res.json({
                success: true,
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.full_name || 'Super Admin',
                    role: user.role
                },
                expires: expiresAt.getTime()
            });

        } catch (error) {
            console.error('Simple login error:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Server error. Please try again later.' 
            });
        }
    });

    /**
     * @route POST /api/v1/auth/validate
     * @description Validate authentication token
     * @access Public
     */
    router.get('/validate', async (req, res) => {
        try {
            const token = req.headers.authorization?.replace('Bearer ', '');
            
            if (!token) {
                return res.status(401).json({ 
                    success: false, 
                    error: 'No token provided.' 
                });
            }

            // Verify JWT token
            let decoded;
            try {
                decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
            } catch (error) {
                return res.status(401).json({ 
                    success: false, 
                    error: 'Invalid token.' 
                });
            }

            // Check if session exists and is not expired
            const { data: session, error: sessionError } = await supabase
                .from('user_sessions')
                .select('*')
                .eq('session_token', token)
                .gt('expires_at', new Date().toISOString())
                .single();

            if (sessionError || !session) {
                return res.status(401).json({ 
                    success: false, 
                    error: 'Session expired or invalid.' 
                });
            }

            // Get user data
            const { data: user, error: userError } = await supabase
                .from('user_profiles')
                .select('id, email, full_name, role')
                .eq('id', decoded.userId)
                .single();

            if (userError || !user) {
                return res.status(401).json({ 
                    success: false, 
                    error: 'User not found.' 
                });
            }

            res.json({
                success: true,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.full_name || 'Super Admin',
                    role: user.role
                }
            });

        } catch (error) {
            console.error('Token validation error:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Server error.' 
            });
        }
    });

    /**
     * @route POST /api/v1/auth/logout
     * @description Logout user and invalidate session
     * @access Private
     */
    router.post('/logout', async (req, res) => {
        try {
            const token = req.headers.authorization?.replace('Bearer ', '');
            
            if (token) {
                // Delete session
                await supabase
                    .from('user_sessions')
                    .delete()
                    .eq('session_token', token);
            }

            res.json({
                success: true,
                message: 'Logged out successfully.'
            });

        } catch (error) {
            console.error('Logout error:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Server error.' 
            });
        }
    });

    return router;
};

export default simpleAuthRouterFactory;