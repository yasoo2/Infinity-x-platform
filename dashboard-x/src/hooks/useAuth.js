import { useState, useEffect, useCallback } from 'react';
import apiClient from '../api/client';

// Placeholder for a real authentication hook
const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('sessionToken');
    if (token) {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  const login = async (email, password, remember = false) => {
    try {
      const { data } = await apiClient.post('/api/v1/auth/login', { email, password });
      if (data?.token) {
        try {
          localStorage.setItem('sessionToken', data.token);
        } catch { void 0; }
        const usr = { email: data.user?.email, role: data.user?.role, id: data.user?.id };
        setUser(usr);
        setIsAuthenticated(true);
        if (remember) {
          try {
            const identifier = usr.email || email || usr.id || '';
            const mapRaw = localStorage.getItem('rememberedSessions');
            const map = mapRaw ? JSON.parse(mapRaw) : {};
            map[String(identifier).toLowerCase()] = data.token;
            localStorage.setItem('rememberedSessions', JSON.stringify(map));
          } catch { void 0; }
        }
        return true;
      }
    } catch {
      void 0;
    }
    return false;
  };

  const listRemembered = useCallback(() => {
    try {
      const raw = localStorage.getItem('rememberedSessions');
      const map = raw ? JSON.parse(raw) : {};
      return Object.keys(map);
    } catch {
      return [];
    }
  }, []);

  const loginWithRemembered = useCallback((identifier) => {
    try {
      const raw = localStorage.getItem('rememberedSessions');
      const map = raw ? JSON.parse(raw) : {};
      const key = String(identifier).toLowerCase();
      const tok = map[key];
      if (!tok) return false;
      localStorage.setItem('sessionToken', tok);
      setIsAuthenticated(true);
      setUser({ email: identifier });
      return true;
    } catch {
      return false;
    }
  }, []);

  const removeRemembered = useCallback((identifier) => {
    try {
      const raw = localStorage.getItem('rememberedSessions');
      const map = raw ? JSON.parse(raw) : {};
      const key = String(identifier).toLowerCase();
      if (map[key]) {
        delete map[key];
        localStorage.setItem('rememberedSessions', JSON.stringify(map));
      }
      return true;
    } catch {
      return false;
    }
  }, []);

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
    listRemembered,
    loginWithRemembered,
    removeRemembered,
    // logout, // Removed as per user request
  };
};

export default useAuth;
