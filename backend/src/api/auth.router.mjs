
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
     * @description Logs in a user.
     * @access Public
     */
    router.post('/login', async (req, res) => {
        try {
            const { email, password } = req.body;

            // --- Validation ---
            if (!email || !password) {
                return res.status(400).json({ success: false, error: 'Email and password are required.' });
            }

            // --- Find user using Mongoose ---
            const user = await User.findOne({ email: email.toLowerCase() });
            if (!user) {
                return res.status(401).json({ success: false, message: 'Invalid credentials.' });
            }

            // --- Check password ---
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                // Return the same generic error for security reasons
                return res.status(401).json({ success: false, message: 'Invalid credentials.' });
            }

            // --- Generate JWT ---
            if (!process.env.JWT_SECRET) {
                console.error('❌ JWT_SECRET is not defined in environment variables!');
                return res.status(500).json({ success: false, error: 'Server configuration error.' });
            }

            const token = generateToken(user);
            
            // --- Update last login timestamp ---
            user.lastLoginAt = new Date();
            await user.save();

            res.status(200).json({
                success: true,
                message: 'Login successful.',
                redirectTo: '/dashboard',
                token: token
            });

        } catch (error) {
            console.error('❌ Login endpoint error:', error);
            res.status(500).json({ success: false, error: 'An internal server error occurred.' });
        }
    });

    return router;
};

export default authRouterFactory;
