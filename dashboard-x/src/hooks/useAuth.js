import { useState, useEffect } from 'react';
import { ROLES } from '../pages/constants';
import { login as apiLogin } from '../api/auth';

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
      const { success, token, user } = await apiLogin(email, password);
      if (success) {
        localStorage.setItem('sessionToken', token);
        setUser(user);
        setIsAuthenticated(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
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
