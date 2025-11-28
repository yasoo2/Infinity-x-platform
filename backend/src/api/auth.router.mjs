
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { generateToken } from '../middleware/auth.mjs';
import User from '../database/models/User.mjs';
import {ROLES} from '../../../shared/roles.js'

const authRouterFactory = ({ db }) => {
    const router = express.Router();

    /**
     * @route POST /api/v1/auth/register
     * @description Registers a new user.
     * @access Public
     */
    router.post('/register', async (req, res) => {
        try {
            const { email, phone, password } = req.body;

            // --- Validation ---
            if (!email || !password) {
                return res.status(400).json({ success: false, error: 'Email and password are required.' });
            }
            if (password.length < 8) {
                return res.status(400).json({ success: false, error: 'Password must be at least 8 characters long.' });
            }

            // --- Check for existing user ---
            const existingUser = await User.findOne({ email: email.toLowerCase() });
            if (existingUser) {
                return res.status(409).json({ success: false, error: 'An account with this email already exists.' });
            }

            // --- Create new user ---
            const hashedPassword = await bcrypt.hash(password, 12);

            const newUser = new User({
                email: email.toLowerCase(),
                phone: phone || null,
                password: hashedPassword,
                role: ROLES.USER, // Standard user role
            });

            await newUser.save();

            res.status(201).json({
                success: true,
                message: 'User created successfully.',
                userId: newUser._id,
            });

        } catch (error) {
            console.error('❌ Register endpoint error:', error);
            res.status(500).json({ success: false, error: 'An internal server error occurred.' });
        }
    });

    /**
     * @route POST /api/v1/auth/login
     * @description Authenticates a user and returns a JWT token
     * @access Public
     */
    router.post('/login', async (req, res) => {
        try {
            const { email, password } = req.body;
            if (!email || !password) {
                return res.status(400).json({ ok: false, error: 'EMAIL_PASSWORD_REQUIRED' });
            }
            const user = await User.findOne({ email: email.toLowerCase() });
            if (!user) {
                return res.status(404).json({ ok: false, error: 'USER_NOT_FOUND' });
            }
            const valid = await bcrypt.compare(password, user.password);
            if (!valid) {
                return res.status(401).json({ ok: false, error: 'INVALID_CREDENTIALS' });
            }
            user.lastLoginAt = new Date();
            await user.save();
            const token = generateToken(user);
            res.json({ ok: true, token, user: { id: user._id, email: user.email, role: user.role } });
        } catch (error) {
            console.error('❌ Login endpoint error:', error);
            res.status(500).json({ ok: false, error: 'INTERNAL_ERROR' });
        }
    });



    return router;
};

export default authRouterFactory;
