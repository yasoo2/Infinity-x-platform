import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import authHandlers from './auth.mjs';

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https://nzwkeusxrrdncjjdqasj.supabase.co"],
        },
    },
}));

// CORS configuration
app.use(cors({
    origin: [
        'http://localhost:3000',
        'http://localhost:5173',
        'https://xelitesolutions.com',
        'https://www.xelitesolutions.com'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use(morgan('combined'));

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Authentication endpoints
app.post('/api/v1/auth/register', authHandlers.handleRegister);
app.post('/api/v1/auth/login', authHandlers.handleLogin);
app.get('/api/v1/auth/login', authHandlers.handleLogin);
app.post('/api/v1/auth/logout', authHandlers.handleLogout);
app.post('/api/v1/auth/refresh', authHandlers.handleRefreshToken);
app.post('/api/v1/auth/session', authHandlers.handleSessionLogin);
app.post('/api/v1/auth/reset-request', authHandlers.handlePasswordResetRequest);
app.post('/api/v1/auth/reset', authHandlers.handlePasswordReset);
app.get('/api/v1/auth/profile', authHandlers.handleGetUserProfile);

// Legacy endpoints for compatibility
app.post('/api/auth/register', authHandlers.handleRegister);
app.post('/api/auth/login', authHandlers.handleLogin);
app.get('/api/auth/login', authHandlers.handleLogin);
app.post('/api/auth/logout', authHandlers.handleLogout);
app.post('/api/auth/refresh', authHandlers.handleRefreshToken);
app.post('/api/auth/session', authHandlers.handleSessionLogin);
app.post('/api/auth/reset-request', authHandlers.handlePasswordResetRequest);
app.post('/api/auth/reset', authHandlers.handlePasswordReset);
app.get('/api/auth/profile', authHandlers.handleGetUserProfile);

// Root endpoint
app.get('/', (req, res) => {
    res.status(200).json({
        message: 'Authentication API Server',
        version: '1.0.0',
        endpoints: {
            health: '/health',
            register: '/api/v1/auth/register',
            login: '/api/v1/auth/login',
            logout: '/api/v1/auth/logout',
            refresh: '/api/v1/auth/refresh',
            session: '/api/v1/auth/session',
            resetRequest: '/api/v1/auth/reset-request',
            reset: '/api/v1/auth/reset',
            profile: '/api/v1/auth/profile'
        }
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({
            error: 'Invalid JSON payload'
        });
    }
    
    if (err.code === 'ECONNREFUSED') {
        return res.status(503).json({
            error: 'Service temporarily unavailable'
        });
    }
    
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        path: req.path,
        method: req.method
    });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('Process terminated');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    server.close(() => {
        console.log('Process terminated');
        process.exit(0);
    });
});

// Start server
const server = app.listen(PORT, () => {
    console.log(`Authentication API server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;