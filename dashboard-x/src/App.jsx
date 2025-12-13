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
      const isLocal = /^(http:\/\/localhost|http:\/\/127\.0\.0\.1|ws:\/\/localhost|ws:\/\/127\.0\.0\.1)/.test(origin);
      const current = localStorage.getItem('apiBaseUrl');
      const currentIsLocal = current && /localhost|127\.0\.0\.1/.test(String(current));
      if (!isLocal && (!current || currentIsLocal)) {
        localStorage.setItem('apiBaseUrl', 'http://localhost:4000');
      }
      const host = typeof window !== 'undefined' ? window.location.hostname : '';
      if (host === 'localhost' || host === '127.0.0.1') {
        apiClient.defaults.baseURL = 'http://localhost:4000';
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
