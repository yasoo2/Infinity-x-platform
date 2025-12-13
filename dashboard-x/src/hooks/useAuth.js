import { useState, useEffect, useCallback, useMemo } from 'react';
import config from '../config';

// API configuration
const INITIAL_API_BASE = (() => {
    try {
        const ls = localStorage.getItem('apiBaseUrl');
        return ls && ls.trim().length > 0 ? ls : config.apiBaseUrl;
    } catch {
        return config.apiBaseUrl;
    }
})();

function normalizeUrl(base, endpoint) {
    const b = String(base).replace(/\/+$/, '');
    let e = String(endpoint);
    if (!e.startsWith('/')) e = `/${e}`;
    const hasV1InBase = /\/api\/v1$/i.test(b);
    const startsWithV1 = /^\/api\/v1\//i.test(e);
    if (hasV1InBase && startsWithV1) {
        e = e.replace(/^\/api\/v1/, '');
    }
    return `${b}${e}`;
}

// Token storage keys
const TOKEN_KEYS = {
    ACCESS_TOKEN: 'auth_access_token',
    REFRESH_TOKEN: 'auth_refresh_token',
    SESSION_TOKEN: 'auth_session_token',
    USER_DATA: 'auth_user_data',
    REMEMBER_ME: 'auth_remember_me',
    REMEMBERED_SESSIONS: 'auth_remembered_sessions'
};

// Error messages
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

// Helper functions
const clearAllTokens = () => {
    Object.values(TOKEN_KEYS).forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
    });
};

const setToken = (key, value, persistent = false) => {
    if (persistent) {
        localStorage.setItem(key, value);
    } else {
        sessionStorage.setItem(key, value);
    }
};

const getToken = (key) => {
    return localStorage.getItem(key) || sessionStorage.getItem(key);
};

const removeToken = (key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
};

// API helper function
async function apiRequest(endpoint, options = {}) {
    const token = getToken(TOKEN_KEYS.ACCESS_TOKEN);
    
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }
    
    try {
        const baseCandidates = (() => {
            const candidates = [];
            const current = INITIAL_API_BASE;
            candidates.push(current);
            try {
                const origin = typeof window !== 'undefined' ? window.location.origin : '';
                if (origin) candidates.push(`${origin.replace(/\/+$/, '')}/api/v1`);
            } catch { /* noop */ }
            candidates.push('http://localhost:4000/api/v1');
            candidates.push('http://localhost:3001/api/v1');
            const unique = Array.from(new Set(candidates.filter(Boolean)));
            return unique;
        })();

        let lastError = null;
        for (const base of baseCandidates) {
            const fullUrl = normalizeUrl(base, endpoint);
            try {
                const response = await fetch(fullUrl, {
                    ...options,
                    headers,
                    credentials: 'include'
                });
        
                // Handle rate limiting
                if (response.status === 429) {
                    const retryAfter = response.headers.get('Retry-After');
                    throw new Error(`${ERROR_MESSAGES.RATE_LIMITED}${retryAfter ? ` Retry after ${retryAfter} seconds.` : ''}`);
                }
        
                // Handle maintenance mode
                if (response.status === 503) {
                    throw new Error(ERROR_MESSAGES.MAINTENANCE);
                }
        
                // Handle network/server errors
                if (response.status >= 500) {
                    throw new Error(ERROR_MESSAGES.SERVER_ERROR);
                }
        
                // Handle unauthorized
                if (response.status === 401) {
                    throw new Error(ERROR_MESSAGES.SESSION_EXPIRED);
                }
        
                const data = await response.json();
        
                if (!response.ok) {
                    const msg = data && (data.error || data.message);
                    // If NOT_FOUND, try next base candidate
                    if (response.status === 404) {
                        lastError = new Error(msg || 'HTTP 404');
                        continue;
                    }
                    throw new Error(msg || `HTTP ${response.status}`);
                }
        
                return data;
            } catch (err) {
                lastError = err;
                continue;
            }
        }
        if (lastError) throw lastError;
        throw new Error(ERROR_MESSAGES.NETWORK_ERROR);

    } catch (error) {
        // Handle network errors
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            throw new Error(ERROR_MESSAGES.NETWORK_ERROR);
        }

        throw error;
    }
}

// Main authentication hook
export function useAuth() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Load user data from storage on mount
    useEffect(() => {
        const loadStoredUser = async () => {
            try {
                setLoading(true);
                setError(null);
                
                const storedUser = getToken(TOKEN_KEYS.USER_DATA);
                const accessToken = getToken(TOKEN_KEYS.ACCESS_TOKEN);
                const rememberMe = localStorage.getItem(TOKEN_KEYS.REMEMBER_ME) === 'true';
                
                if (!storedUser && !accessToken) {
                    setLoading(false);
                    return;
                }
                
                // Try to validate existing session
                if (accessToken) {
                    try {
                        const userData = await validateToken();
                        setUser(userData);
                        setIsAuthenticated(true);
                    } catch (error) {
                        console.warn('Token validation failed:', error);
                        clearAllTokens();
                    }
                } else if (storedUser) {
                    // Fallback to stored user data
                    setUser(JSON.parse(storedUser));
                    setIsAuthenticated(true);
                }
                
            } catch (error) {
                console.error('Failed to load stored user:', error);
                clearAllTokens();
            } finally {
                setLoading(false);
            }
        };
        
        loadStoredUser();
    }, []);

    // Validate current token
    const validateToken = useCallback(async () => {
        try {
            const data = await apiRequest('/api/v1/auth/profile');
            return data.user;
        } catch (error) {
            throw error;
        }
    }, []);

    // Refresh access token
    const refreshAccessToken = useCallback(async () => {
        try {
            const refreshToken = getToken(TOKEN_KEYS.REFRESH_TOKEN);
            if (!refreshToken) {
                throw new Error('No refresh token available');
            }
            
            const data = await apiRequest('/api/v1/auth/refresh', {
                method: 'POST',
                body: JSON.stringify({ refreshToken })
            });
            
            // Store new tokens
            const rememberMe = localStorage.getItem(TOKEN_KEYS.REMEMBER_ME) === 'true';
            setToken(TOKEN_KEYS.ACCESS_TOKEN, data.accessToken, rememberMe);
            setToken(TOKEN_KEYS.REFRESH_TOKEN, data.refreshToken, rememberMe);
            
            return data;
        } catch (error) {
            console.error('Token refresh failed:', error);
            clearAllTokens();
            throw error;
        }
    }, []);

    // Login with credentials
    const login = useCallback(async (email, password, rememberMe = false) => {
        try {
            setLoading(true);
            setError(null);
            
            // Basic validation
            if (!email || !password) {
                throw new Error('Email and password are required');
            }
            
            // Attempt login with multiple endpoint fallbacks
            let loginData = null;
            const endpoints = [
                '/api/v1/auth/simple-login',
                '/api/auth/simple-login',
                '/v1/auth/simple-login',
                '/auth/simple-login'
            ];
            
            for (const endpoint of endpoints) {
                try {
                    loginData = await apiRequest(endpoint, {
                        method: 'POST',
                        body: JSON.stringify({ email, password, rememberMe })
                    });
                    break; // Success, exit loop
                } catch (error) {
                    console.warn(`Login failed for ${endpoint}:`, error.message);
                    if (error.message.includes('Network error')) {
                        continue; // Try next endpoint
                    }
                    throw error; // Re-throw non-network errors
                }
            }
            
            if (!loginData) {
                throw new Error('All login endpoints failed');
            }
            
            // Store user data and tokens
            const userData = {
                id: loginData.user.id,
                email: loginData.user.email,
                fullName: loginData.user.fullName || 'Super Admin',
                role: loginData.user.role || 'super_admin'
            };
            
            setUser(userData);
            setIsAuthenticated(true);
            
            // Store tokens
            setToken(TOKEN_KEYS.ACCESS_TOKEN, loginData.token || loginData.accessToken, rememberMe);
            if (loginData.refreshToken) setToken(TOKEN_KEYS.REFRESH_TOKEN, loginData.refreshToken, rememberMe);
            setToken(TOKEN_KEYS.USER_DATA, JSON.stringify(userData), rememberMe);
            
            if (rememberMe && (loginData.sessionToken || loginData.token)) {
                const sess = loginData.sessionToken || loginData.token;
                setToken(TOKEN_KEYS.SESSION_TOKEN, sess, true);
                localStorage.setItem(TOKEN_KEYS.REMEMBER_ME, 'true');
                try {
                    const existing = JSON.parse(localStorage.getItem(TOKEN_KEYS.REMEMBERED_SESSIONS) || '{}');
                    existing[userData.id] = {
                        token: sess,
                        email: userData.email,
                        fullName: userData.fullName
                    };
                    localStorage.setItem(TOKEN_KEYS.REMEMBERED_SESSIONS, JSON.stringify(existing));
                } catch {}
            }
            
            return { success: true, user: userData };
            
        } catch (error) {
            setError(error.message);
            throw error;
        } finally {
            setLoading(false);
        }
    }, []);

    // Login with session token
    const loginWithSession = useCallback(async (sessionToken) => {
        try {
            setLoading(true);
            setError(null);
            
            const data = await apiRequest('/api/v1/auth/session', {
                method: 'POST',
                body: JSON.stringify({ sessionToken })
            });
            
            // Store user data and tokens
            const userData = {
                id: data.user.id,
                email: data.user.email,
                fullName: data.user.fullName,
                role: data.user.role
            };
            
            setUser(userData);
            setIsAuthenticated(true);
            
            // Store tokens
            setToken(TOKEN_KEYS.ACCESS_TOKEN, data.accessToken, true);
            setToken(TOKEN_KEYS.REFRESH_TOKEN, data.refreshToken, true);
            setToken(TOKEN_KEYS.USER_DATA, JSON.stringify(userData), true);
            
            return { success: true, user: userData };
            
        } catch (error) {
            // Session failed, remove it
            removeToken(TOKEN_KEYS.SESSION_TOKEN);
            setError(error.message);
            throw error;
        } finally {
            setLoading(false);
        }
    }, []);

    const listRemembered = useCallback(() => {
        try {
            const obj = JSON.parse(localStorage.getItem(TOKEN_KEYS.REMEMBERED_SESSIONS) || '{}');
            return Object.keys(obj);
        } catch {
            return [];
        }
    }, []);

    const loginWithRemembered = useCallback(async (id) => {
        try {
            const obj = JSON.parse(localStorage.getItem(TOKEN_KEYS.REMEMBERED_SESSIONS) || '{}');
            const entry = obj[id];
            if (!entry || !entry.token) {
                throw new Error('No saved session');
            }
            const result = await loginWithSession(entry.token);
            return result;
        } catch (error) {
            throw error;
        }
    }, [loginWithSession]);

    const removeRemembered = useCallback((id) => {
        try {
            const obj = JSON.parse(localStorage.getItem(TOKEN_KEYS.REMEMBERED_SESSIONS) || '{}');
            if (obj[id]) {
                delete obj[id];
                localStorage.setItem(TOKEN_KEYS.REMEMBERED_SESSIONS, JSON.stringify(obj));
            }
        } catch {
        }
    }, []);

    // Register new user
    const register = useCallback(async (email, password, fullName) => {
        try {
            setLoading(true);
            setError(null);
            
            // Basic validation
            if (!email || !password || !fullName) {
                throw new Error('Email, password, and full name are required');
            }
            
            const data = await apiRequest('/api/v1/auth/register', {
                method: 'POST',
                body: JSON.stringify({ email, password, fullName })
            });
            
            // Store user data and tokens
            const userData = {
                id: data.user.id,
                email: data.user.email,
                fullName: data.user.fullName,
                role: data.user.role
            };
            
            setUser(userData);
            setIsAuthenticated(true);
            
            // Store tokens
            setToken(TOKEN_KEYS.ACCESS_TOKEN, data.accessToken, false);
            setToken(TOKEN_KEYS.REFRESH_TOKEN, data.refreshToken, false);
            setToken(TOKEN_KEYS.USER_DATA, JSON.stringify(userData), false);
            
            return { success: true, user: userData };
            
        } catch (error) {
            setError(error.message);
            throw error;
        } finally {
            setLoading(false);
        }
    }, []);

    // Logout
    const logout = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            
            const sessionToken = getToken(TOKEN_KEYS.SESSION_TOKEN);
            
            try {
                await apiRequest('/api/v1/auth/logout', {
                    method: 'POST',
                    body: JSON.stringify({ sessionToken })
                });
            } catch (error) {
                console.warn('Logout API call failed:', error);
            }
            
            // Clear all data
            clearAllTokens();
            setUser(null);
            setIsAuthenticated(false);
            
            return { success: true };
            
        } catch (error) {
            setError(error.message);
            throw error;
        } finally {
            setLoading(false);
        }
    }, []);

    // Request password reset
    const requestPasswordReset = useCallback(async (email) => {
        try {
            setLoading(true);
            setError(null);
            
            await apiRequest('/api/v1/auth/reset-request', {
                method: 'POST',
                body: JSON.stringify({ email })
            });
            
            return { success: true };
            
        } catch (error) {
            setError(error.message);
            throw error;
        } finally {
            setLoading(false);
        }
    }, []);

    // Reset password
    const resetPassword = useCallback(async (token, newPassword) => {
        try {
            setLoading(true);
            setError(null);
            
            await apiRequest('/api/v1/auth/reset', {
                method: 'POST',
                body: JSON.stringify({ token, newPassword })
            });
            
            return { success: true };
            
        } catch (error) {
            setError(error.message);
            throw error;
        } finally {
            setLoading(false);
        }
    }, []);

    // Update user profile
    const updateProfile = useCallback(async (updates) => {
        try {
            setLoading(true);
            setError(null);
            
            // This would typically be a separate API endpoint
            // For now, just update local state
            const updatedUser = { ...user, ...updates };
            setUser(updatedUser);
            setToken(TOKEN_KEYS.USER_DATA, JSON.stringify(updatedUser), true);
            
            return { success: true, user: updatedUser };
            
        } catch (error) {
            setError(error.message);
            throw error;
        } finally {
            setLoading(false);
        }
    }, [user]);

    // Check if user has a specific role
    const hasRole = useCallback((role) => {
        return user?.role === role;
    }, [user]);

    // Check if user has any of the specified roles
    const hasAnyRole = useCallback((roles) => {
        return roles.includes(user?.role);
    }, [user]);

    // Update API base URL
    const updateApiBaseUrl = useCallback((newUrl) => {
        localStorage.setItem('apiBaseUrl', newUrl);
        // You might want to reload the page or reinitialize API calls here
        window.location.reload();
    }, []);

    // Memoized values
    const authContext = useMemo(() => ({
        user,
        loading,
        error,
        isAuthenticated,
        login,
        logout,
        updateProfile,
        hasRole,
        hasAnyRole,
        updateApiBaseUrl,
        validateToken
    }), [
        user,
        loading,
        error,
        isAuthenticated,
        login,
        logout,
        updateProfile,
        hasRole,
        hasAnyRole,
        updateApiBaseUrl,
        validateToken
    ]);

    return authContext;
}

export default useAuth;
