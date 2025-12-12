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
      try {
        const host = typeof window !== 'undefined' ? String(window.location.hostname || '') : '';
        if (/xelitesolutions\.com$/i.test(host)) { try { localStorage.removeItem('apiOffline'); } catch { /* noop */ } }
      } catch { /* noop */ }
      const safeEmail = String(email || '').trim().toLowerCase().replace(/[.\s]+$/, '');
      const safePassword = String(password || '');
      let data;
      try {
        data = (await apiClient.post('/api/v1/auth/login', { email: safeEmail, password: safePassword })).data;
      } catch (err) {
        const status = err?.response?.status || err?.status;
        if (status === 404 || status === 405) {
          const params = new URLSearchParams({ email: safeEmail, password: safePassword });
          data = (await apiClient.get(`/api/v1/auth/login?${params.toString()}`)).data;
        } else {
          throw err;
        }
      }
      const token = data?.token || data?.sessionToken || data?.jwt || data?.access_token;
      if (token) {
        try {
          localStorage.setItem('sessionToken', token);
        } catch { void 0; }
        const usr = { email: data.user?.email || safeEmail, role: data.user?.role, id: data.user?.id };
        setUser(usr);
        setIsAuthenticated(true);
        if (remember) {
          try {
            const identifier = usr.email || safeEmail || usr.id || '';
            const mapRaw = localStorage.getItem('rememberedSessions');
            const map = mapRaw ? JSON.parse(mapRaw) : {};
            map[String(identifier).toLowerCase()] = token;
            localStorage.setItem('rememberedSessions', JSON.stringify(map));
          } catch { void 0; }
        }
        return true;
      }
      if (data?.ok === false && typeof data?.message === 'string') {
        throw new Error(data.message);
      }
    } catch {
      return false;
    }
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
