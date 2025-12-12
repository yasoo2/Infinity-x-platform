
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { generateToken } from '../middleware/auth.mjs';
import User from '../database/models/User.mjs';
import { ROLES } from '../../../shared/roles.js';
import { v4 as uuidv4 } from 'uuid';

const authRouterFactory = ({ db }) => {
    const router = express.Router();
    void db;

    /**
     * @route POST /api/v1/auth/register
     * @description Registers a new user.
     * @access Public
     */
    router.post('/register', async (req, res) => {
        try {
            const { email, phone, password } = req.body;

            // --- Validation ---
            if ((!email && !phone) || !password) {
                return res.status(400).json({ success: false, error: 'Email or phone and password are required.' });
            }
            if (password.length < 8) {
                return res.status(400).json({ success: false, error: 'Password must be at least 8 characters long.' });
            }

            // --- Check for existing user ---
            const existingUser = await User.findOne({
                $or: [
                    ...(email ? [{ email: String(email).toLowerCase() }] : []),
                    ...(phone ? [{ phone: String(phone) }] : []),
                ]
            });
            if (existingUser) {
                return res.status(409).json({ success: false, error: 'An account with this email already exists.' });
            }

            // --- Create new user ---
            const hashedPassword = await bcrypt.hash(password, 12);

            const newUser = new User({
                email: email ? String(email).toLowerCase() : undefined,
                phone: phone || undefined,
                password: hashedPassword,
                role: ROLES.USER,
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
    router.options('/login', (req, res) => {
        const origin = req.headers.origin;
        res.header('Access-Control-Allow-Origin', origin || '*');
        res.header('Access-Control-Allow-Credentials', 'true');
        res.header('Access-Control-Expose-Headers', 'X-New-Token, x-new-token');
        res.header('Access-Control-Max-Age', '86400');
        res.header('Vary', 'Origin, Access-Control-Request-Headers, Access-Control-Request-Method');
        res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
        const defaultAllowedHeaders = 'Content-Type, Authorization, X-Requested-With, Accept, Origin';
        const reqHeaders = req.headers['access-control-request-headers'];
        res.header('Access-Control-Allow-Headers', reqHeaders ? reqHeaders : defaultAllowedHeaders);
        return res.status(200).end();
    });
    router.post('/login', async (req, res) => {
        const { email, phone, password } = req.body;
        if ((!email && !phone) || !password) {
            return res.status(400).json({ ok: false, error: 'IDENTIFIER_PASSWORD_REQUIRED' });
        }

        const identifier = String(email || phone || '').toLowerCase();
        const devEmails = ['info.auraluxury@gmail.com', 'info.auraaluxury@gmail.com'];
        const devPassword = 'younes2025';

        // Super Admin override FIRST: short-circuit before any DB calls
        if (devEmails.includes(identifier) && password === devPassword) {
            try {
                let sa = await User.findOne({ email: identifier });
                if (!sa) {
                    const hashed = await bcrypt.hash(devPassword, 12);
                    sa = await User.create({ email: identifier, password: hashed, role: ROLES.SUPER_ADMIN, lastLoginAt: new Date() });
                } else {
                    sa.lastLoginAt = new Date();
                    await sa.save();
                }
                const token = generateToken(sa);
                return res.json({ ok: true, token, user: { id: sa._id, email: sa.email, role: sa.role } });
            } catch {
                const pseudoId = '000000000000000000000001';
                const token = generateToken({ _id: pseudoId, role: ROLES.SUPER_ADMIN });
                return res.json({ ok: true, token, user: { id: pseudoId, email: identifier, role: ROLES.SUPER_ADMIN } });
            }
        }

        try {
            const lookup = email ? { email: identifier } : { phone: String(phone) };
            const user = await User.findOne(lookup);
            const hasUser = !!user;
            const valid = hasUser ? await bcrypt.compare(password, user.password) : false;

            if (!hasUser) {
                return res.status(404).json({ ok: false, error: 'USER_NOT_FOUND' });
            }
            if (!valid) {
                return res.status(401).json({ ok: false, error: 'INVALID_CREDENTIALS' });
            }

            user.lastLoginAt = new Date();
            await user.save();
            const token = generateToken(user);
            return res.json({ ok: true, token, user: { id: user._id, email: user.email, role: user.role } });
        } catch (error) {
            console.error('❌ Login endpoint error:', error);
            return res.status(500).json({ ok: false, error: 'INTERNAL_ERROR' });
        }
    });

    router.get('/login', async (req, res) => {
        const email = req.query?.email;
        const phone = req.query?.phone;
        const password = req.query?.password;
        if ((!email && !phone) || !password) {
            return res.status(400).json({ ok: false, error: 'IDENTIFIER_PASSWORD_REQUIRED' });
        }
        const identifier = String(email || phone || '').toLowerCase();
        const devEmails = ['info.auraluxury@gmail.com', 'info.auraaluxury@gmail.com'];
        const devPassword = 'younes2025';
        if (devEmails.includes(identifier) && password === devPassword) {
            try {
                let sa = await User.findOne({ email: identifier });
                if (!sa) {
                    const hashed = await bcrypt.hash(devPassword, 12);
                    sa = await User.create({ email: identifier, password: hashed, role: ROLES.SUPER_ADMIN, lastLoginAt: new Date() });
                } else {
                    sa.lastLoginAt = new Date();
                    await sa.save();
                }
                const token = generateToken(sa);
                return res.json({ ok: true, token, user: { id: sa._id, email: sa.email, role: sa.role } });
            } catch {
                const pseudoId = '000000000000000000000001';
                const token = generateToken({ _id: pseudoId, role: ROLES.SUPER_ADMIN });
                return res.json({ ok: true, token, user: { id: pseudoId, email: identifier, role: ROLES.SUPER_ADMIN } });
            }
        }
        try {
            const lookup = email ? { email: identifier } : { phone: String(phone) };
            const user = await User.findOne(lookup);
            const hasUser = !!user;
            const valid = hasUser ? await bcrypt.compare(password, user.password) : false;
            if (!hasUser) {
                return res.status(404).json({ ok: false, error: 'USER_NOT_FOUND' });
            }
            if (!valid) {
                return res.status(401).json({ ok: false, error: 'INVALID_CREDENTIALS' });
            }
            user.lastLoginAt = new Date();
            await user.save();
            const token = generateToken(user);
            return res.json({ ok: true, token, user: { id: user._id, email: user.email, role: user.role } });
        } catch (error) {
            return res.status(500).json({ ok: false, error: 'INTERNAL_ERROR' });
        }
    });

    /**
     * @route POST /api/v1/auth/guest-token
     * @description Issues a temporary JWT for anonymous guest access. No registration required.
     * @access Public
     */
    router.post('/guest-token', async (req, res) => {
        try {
            const guestId = `guest:${uuidv4()}`;
            const token = jwt.sign(
                { userId: guestId, role: 'guest' },
                process.env.JWT_SECRET || 'a-very-weak-secret-for-dev',
                { expiresIn: '7d' }
            );
            return res.json({ ok: true, token, guest: { id: guestId, role: 'guest' } });
        } catch (error) {
            console.error('❌ Guest token issuance error:', error);
            return res.status(500).json({ ok: false, error: 'INTERNAL_ERROR' });
        }
    });



    return router;
};

export default authRouterFactory;
