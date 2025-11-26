import { useState, useEffect } from 'react';
import { ROLES } from '../pages/constants';

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
    // Placeholder for API call to /api/v1/auth/login
    // On success:
    // localStorage.setItem('sessionToken', response.token);
    // setUser(response.user);
    // setIsAuthenticated(true);
    // return true;
    
    // For now, we simulate success for the super admin
    if (email === 'info.auraaluxury@gmail.com' && password === 'younes2025') {
        localStorage.setItem('sessionToken', 'simulated-super-admin-token');
        setUser({
            email: 'info.auraaluxury@gmail.com',
            role: ROLES.SUPER_ADMIN,
            id: 'super-admin-id-123'
        });
        setIsAuthenticated(true);
        return true;
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
