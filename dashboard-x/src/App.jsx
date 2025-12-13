import React, { useEffect } from 'react';
import apiClient from './api/client';
import AppRoutes from './Routes';
import { SimpleAuthProvider } from './context/SimpleAuthContext';

/**
 * App Component
 * ------------------
 * This is the main entry point for the React application.
 * Now includes simple authentication context provider for global auth state.
 */
const App = () => {
  useEffect(() => {
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const host = typeof window !== 'undefined' ? window.location.hostname : '';
      const current = localStorage.getItem('apiBaseUrl');
      const setBase = (u) => { try { localStorage.setItem('apiBaseUrl', String(u).replace(/\/+$/,'')); } catch { /* noop */ } };
      if (host === 'localhost' || host === '127.0.0.1') {
        setBase('http://localhost:4000/api/v1');
        apiClient.defaults.baseURL = 'http://localhost:4000';
      } else if (host === 'www.xelitesolutions.com' || host === 'xelitesolutions.com') {
        setBase('https://api.xelitesolutions.com/api/v1');
      } else if (!current) {
        setBase(origin + '/api/v1');
      }
      const oldKeys = ['auth_access_token','auth_refresh_token','auth_session_token','auth_user_data','auth_remember_me','auth_remembered_sessions'];
      oldKeys.forEach(k=>{ try { localStorage.removeItem(k); sessionStorage.removeItem(k); } catch { /* noop */ } });
    } catch { void 0; }
  }, []);
  
  return (
    <SimpleAuthProvider>
      <AppRoutes />
    </SimpleAuthProvider>
  );
};

export default App;
