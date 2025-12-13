# Comprehensive Authentication System Guide

## Overview

This authentication system provides a complete, secure, and scalable solution for user management and authentication. It includes user registration, login with JWT tokens, password security, role-based access control, session management, and comprehensive audit logging.

## Features

### Core Authentication Features
- ✅ **User Registration** with email/password validation
- ✅ **Secure Login** with JWT tokens and refresh tokens
- ✅ **Password Visibility Toggle** for better UX
- ✅ **Remember Me** functionality with persistent sessions
- ✅ **Password Reset** with secure token generation
- ✅ **Role-Based Access Control** (USER, ADMIN, SUPER_ADMIN)
- ✅ **Session Management** with automatic expiration
- ✅ **Audit Logging** for all authentication events
- ✅ **Rate Limiting** to prevent brute force attacks
- ✅ **Comprehensive Error Handling** with user-friendly messages

### Security Features
- ✅ **Bcrypt Password Hashing** with salt rounds
- ✅ **JWT Token Authentication** with expiration
- ✅ **Row Level Security (RLS)** policies in Supabase
- ✅ **Input Validation** and sanitization
- ✅ **CORS Protection** and security headers
- ✅ **Rate Limiting** per IP and user
- ✅ **Password Strength Requirements**
- ✅ **Account Lockout Protection**
- ✅ **Audit Trail** for all user actions

## Architecture

### Database Schema

#### User Profiles Table
```sql
CREATE TABLE public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN', 'SUPER_ADMIN')),
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### User Sessions Table
```sql
CREATE TABLE public.user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Login Attempts Table
```sql
CREATE TABLE public.login_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN NOT NULL,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### API Endpoints

#### Authentication Endpoints
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `GET /api/v1/auth/login` - Health check
- `POST /api/v1/auth/logout` - User logout
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/session` - Session-based login
- `POST /api/v1/auth/reset-request` - Request password reset
- `POST /api/v1/auth/reset` - Reset password
- `GET /api/v1/auth/profile` - Get user profile

#### Admin Endpoints
- `GET /api/v1/auth/users` - List all users (Admin only)
- `POST /api/v1/auth/users` - Create user (Admin only)
- `PUT /api/v1/auth/users/:id` - Update user (Admin only)
- `DELETE /api/v1/auth/users/:id` - Delete user (Super Admin only)
- `POST /api/v1/auth/users/bulk-delete` - Bulk delete users
- `POST /api/v1/auth/users/bulk-status` - Bulk update user status

## Usage Guide

### 1. User Registration

```javascript
// Frontend registration
const { register } = useAuth();

try {
  const result = await register(
    'user@example.com',
    'SecurePassword123!',
    'John Doe'
  );
  
  if (result.success) {
    console.log('Registration successful:', result.user);
    // Redirect to dashboard
  }
} catch (error) {
  console.error('Registration failed:', error.message);
}
```

### 2. User Login

```javascript
// Frontend login with remember me
const { login } = useAuth();

try {
  const result = await login(
    'user@example.com',
    'SecurePassword123!',
    true // remember me
  );
  
  if (result.success) {
    console.log('Login successful:', result.user);
    // Redirect to dashboard
  }
} catch (error) {
  console.error('Login failed:', error.message);
}
```

### 3. Protected Routes

```javascript
// Frontend protected route
import ProtectedRoute from './components/auth/ProtectedRoute';

// Basic protected route
<ProtectedRoute>
  <Dashboard />
</ProtectedRoute>

// Role-based protected route
<ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
  <AdminPanel />
</ProtectedRoute>
```

### 4. User Management (Admin)

```javascript
// Backend user management
const users = await fetch('/api/v1/auth/users', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

// Create new user
const newUser = await fetch('/api/v1/auth/users', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`
  },
  body: JSON.stringify({
    email: 'newuser@example.com',
    fullName: 'New User',
    password: 'SecurePassword123!',
    role: 'USER',
    isActive: true
  })
});
```

## Security Configuration

### Password Requirements
- Minimum 8 characters
- Maximum 128 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character
- Cannot contain common weak passwords

### JWT Configuration
- Access Token: 15 minutes expiration
- Refresh Token: 7 days expiration
- Session Token: 30 days expiration (remember me)
- Secret Key: 64-byte random key

### Rate Limiting
- 5 login attempts per 15-minute window per email
- 100 requests per 15-minute window per IP
- Automatic account lockout after 5 failed attempts

### CORS Configuration
```javascript
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
```

## Error Handling

### Common Error Codes
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid credentials)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource not found)
- `409` - Conflict (user already exists)
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

### Error Messages
```javascript
const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  INVALID_CREDENTIALS: 'Invalid email or password.',
  ACCOUNT_LOCKED: 'Account is locked. Please contact support.',
  SERVER_ERROR: 'Server error. Please try again later.',
  SESSION_EXPIRED: 'Session expired. Please log in again.',
  INVALID_TOKEN: 'Invalid authentication token.',
  RATE_LIMITED: 'Too many attempts. Please try again later.',
  MAINTENANCE: 'System is under maintenance. Please try again later.'
};
```

## Deployment

### Environment Variables
```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key

# JWT Configuration
JWT_SECRET=your-64-byte-secret-key

# Server Configuration
PORT=3001
NODE_ENV=production
```

### Database Migration
```bash
# Apply migrations to Supabase
npx supabase db push

# Or apply specific migration
supabase_apply_migration --file supabase/migrations/001_create_auth_schema.sql
```

### Server Startup
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Start production server
npm start
```

## Testing

### Run Authentication Tests
```bash
# Run comprehensive test suite
node scripts/test-auth-system.mjs

# Test specific components
npm test -- --testNamePattern="authentication"
```

### Test Coverage
- ✅ Database schema validation
- ✅ User registration flow
- ✅ User login flow
- ✅ JWT token generation and validation
- ✅ Session management
- ✅ Password reset functionality
- ✅ Role-based access control
- ✅ Audit logging
- ✅ Rate limiting
- ✅ Error handling

## Monitoring and Maintenance

### Audit Logs
All authentication events are logged with:
- User ID
- Action type
- IP address
- User agent
- Timestamp
- Resource affected

### Health Checks
```bash
# Check server health
curl http://localhost:3001/health

# Check database connection
curl http://localhost:3001/api/v1/auth/login
```

### Performance Monitoring
- Response times < 200ms for auth operations
- Database query optimization with indexes
- Rate limiting to prevent abuse
- Connection pooling for database

## Troubleshooting

### Common Issues

1. **Login fails with 404 error**
   - Check API base URL configuration
   - Verify backend server is running
   - Check CORS configuration

2. **Registration fails with validation error**
   - Verify password meets requirements
   - Check email format validation
   - Ensure user doesn't already exist

3. **JWT token expired**
   - Implement automatic token refresh
   - Check token expiration settings
   - Verify JWT secret configuration

4. **Database connection issues**
   - Verify Supabase connection string
   - Check network connectivity
   - Verify RLS policies are enabled

5. **Rate limiting errors**
   - Check rate limit configuration
   - Implement exponential backoff
   - Monitor login attempt patterns

### Debug Mode
```bash
# Enable debug logging
DEBUG=auth:* npm start

# Check Supabase logs
supabase logs --project your-project-id
```

## Support and Maintenance

### Regular Maintenance Tasks
- Monitor audit logs for suspicious activity
- Review failed login attempts
- Update password requirements as needed
- Rotate JWT secrets periodically
- Backup user data regularly

### Security Updates
- Keep dependencies updated
- Monitor security advisories
- Review and update RLS policies
- Test authentication flows regularly
- Conduct security audits

## Conclusion

This authentication system provides a robust, secure, and scalable foundation for user management. It includes comprehensive security features, detailed audit logging, and flexible role-based access control. The system is designed to be maintainable, testable, and extensible for future requirements.

For additional support or custom requirements, refer to the API documentation or contact the development team.