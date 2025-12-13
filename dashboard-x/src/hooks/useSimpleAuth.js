import { useState, useEffect, useCallback } from 'react';

// Token storage keys
const TOKEN_KEYS = {
    ACCESS_TOKEN: 'simple_auth_token',
    USER_DATA: 'simple_user_data',
    REMEMBER_ME: 'simple_remember_me'
};

// Error messages
const ERROR_MESSAGES = {
    INVALID_CREDENTIALS: 'Invalid email or password.',
    NETWORK_ERROR: 'Network error. Please check your connection.',
    SERVER_ERROR: 'Server error. Please try again later.'
};

// API helper function
async function apiRequest(endpoint, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    try {
        // Try multiple base URLs
        const baseCandidates = [
            'http://localhost:4000/api/v1',
            'http://localhost:3001/api/v1'
        ];
        
        let lastError = null;
        for (const base of baseCandidates) {
            try {
                const response = await fetch(`${base}${endpoint}`, {
                    ...options,
                    headers,
                    credentials: 'include'
                });
                
                if (!response.ok) {
                    if (response.status === 401) {
                        throw new Error(ERROR_MESSAGES.INVALID_CREDENTIALS);
                    }
                    if (response.status === 404 || response.status === 405) {
                        lastError = new Error(`HTTP ${response.status}`);
                        continue;
                    }
                    if (response.status >= 500) {
                        throw new Error(ERROR_MESSAGES.SERVER_ERROR);
                    }
                    let errorMessage = ERROR_MESSAGES.SERVER_ERROR;
                    try { const errorData = await response.json(); errorMessage = errorData.message || errorMessage; } catch { /* noop */ }
                    throw new Error(errorMessage);
                }
                
                return await response.json();
            } catch (error) {
                lastError = error;
                continue;
            }
        }
        
        if (lastError) throw lastError;
        throw new Error(ERROR_MESSAGES.NETWORK_ERROR);
        
    } catch (error) {
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            throw new Error(ERROR_MESSAGES.NETWORK_ERROR);
        }
        throw error;
    }
}

// Simple authentication hook
export function useSimpleAuth() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Load stored authentication data on mount
    useEffect(() => {
        const loadStoredAuth = async () => {
            try {
                setLoading(true);
                setError(null);
                
                const token = localStorage.getItem(TOKEN_KEYS.ACCESS_TOKEN);
                const userData = localStorage.getItem(TOKEN_KEYS.USER_DATA);
                
                if (!token || !userData) {
                    setLoading(false);
                    return;
                }
                
                // Validate token
                try {
                    const data = await apiRequest('/auth/validate', {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    
                    setUser(data.user);
                    setIsAuthenticated(true);
                } catch (error) {
                    // Token invalid, clear storage
                    localStorage.removeItem(TOKEN_KEYS.ACCESS_TOKEN);
                    localStorage.removeItem(TOKEN_KEYS.USER_DATA);
                    localStorage.removeItem(TOKEN_KEYS.REMEMBER_ME);
                }
                
            } catch (error) {
                console.error('Failed to load stored auth:', error);
                setError(error.message);
            } finally {
                setLoading(false);
            }
        };
        
        loadStoredAuth();
    }, []);

    // Simple login function
    const login = useCallback(async (email, password, rememberMe = false) => {
        try {
            setLoading(true);
            setError(null);
            
            // Basic validation
            if (!email || !password) {
                throw new Error('Email and password are required');
            }
            
            // Attempt login
            const data = await apiRequest('/auth/simple-login', {
                method: 'POST',
                body: JSON.stringify({ email, password, rememberMe })
            });
            
            // Store user data and token
            const userData = {
                id: data.user.id,
                email: data.user.email,
                name: data.user.name || 'Super Admin',
                role: data.user.role || 'super_admin'
            };
            
            setUser(userData);
            setIsAuthenticated(true);
            
            // Store in localStorage (simple approach)
            localStorage.setItem(TOKEN_KEYS.ACCESS_TOKEN, data.token);
            localStorage.setItem(TOKEN_KEYS.USER_DATA, JSON.stringify(userData));
            try { localStorage.setItem('sessionToken', data.token); } catch { /* noop */ }
            if (rememberMe) {
                localStorage.setItem(TOKEN_KEYS.REMEMBER_ME, 'true');
            }
            
            return { success: true, user: userData };
            
        } catch (error) {
            setError(error.message);
            throw error;
        } finally {
            setLoading(false);
        }
    }, []);

    // Logout function
    const logout = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            
            const token = localStorage.getItem(TOKEN_KEYS.ACCESS_TOKEN);
            
            try {
                await apiRequest('/auth/logout', {
                    method: 'POST',
                    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
                });
            } catch (error) {
                console.warn('Logout API call failed:', error);
            }
            
            // Clear all data
            localStorage.removeItem(TOKEN_KEYS.ACCESS_TOKEN);
            localStorage.removeItem(TOKEN_KEYS.USER_DATA);
            localStorage.removeItem(TOKEN_KEYS.REMEMBER_ME);
            try { localStorage.removeItem('sessionToken'); } catch { /* noop */ }
            
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

    // Clear error
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    return {
        user,
        loading,
        error,
        isAuthenticated,
        login,
        logout,
        clearError
    };
}
