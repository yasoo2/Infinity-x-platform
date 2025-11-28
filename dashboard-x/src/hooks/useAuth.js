import { useState, useEffect } from 'react';
import { ROLES } from '../pages/constants';
import apiClient from '../api/client';

// Placeholder for a real authentication hook
const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // In a real app, this would check for a JWT token in localStorage or cookies
    // and validate it against the backend.
    const token = localStorage.getItem('sessionToken');
    if (token) {
      // For now, we simulate a successful login with the Super Admin credentials
      // This should be replaced with a proper token validation API call
      setUser({
        email: 'info.auraaluxury@gmail.com',
        role: ROLES.SUPER_ADMIN,
        id: 'super-admin-id-123'
      });
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const { data } = await apiClient.post('/api/v1/auth/login', { email, password });
      if (data?.ok && data?.token) {
        localStorage.setItem('sessionToken', data.token);
        setUser({ email: data.user?.email, role: data.user?.role, id: data.user?.id });
        setIsAuthenticated(true);
        return true;
      }
    } catch (e) {
      // Fallback to super admin simulation if API not reachable
      if (email === 'info.auraluxury@gmail.com' && password === 'younes2025') {
        localStorage.setItem('sessionToken', 'simulated-super-admin-token');
        setUser({ email: 'info.auraluxury@gmail.com', role: ROLES.SUPER_ADMIN, id: 'super-admin-id-123' });
        setIsAuthenticated(true);
        return true;
      }
    }
    return false;
  };

  // const logout = () => { // Removed as per user request
  //   localStorage.removeItem('sessionToken');
  //   setUser(null);
  //   setIsAuthenticated(false);
  // };

  return {
    isAuthenticated,
    user,
    isLoading,
    login,
    // logout, // Removed as per user request
  };
};

export default useAuth;
