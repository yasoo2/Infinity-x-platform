
import React, { useEffect } from 'react';
import apiClient from './api/client';
import AppRoutes from './Routes';
import { AuthProvider } from './context/AuthContext';

/**
 * App Component
 * ------------------
 * This is the main entry point for the React application.
 * Now includes authentication context provider for global auth state.
 */
const App = () => {
  useEffect(() => {
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const isLocal = /^(http:\/\/localhost|http:\/\/127\.0\.0\.1|ws:\/\/localhost|ws:\/\/127\.0\.0\.1)/.test(origin);
      const current = localStorage.getItem('apiBaseUrl');
      const currentIsLocal = current && /localhost|127\.0\.0\.1/.test(String(current));
      if (!isLocal && (!current || currentIsLocal)) {
        localStorage.setItem('apiBaseUrl', origin);
      }
      const host = typeof window !== 'undefined' ? window.location.hostname : '';
      if (host === 'localhost' || host === '127.0.0.1') {
        apiClient.defaults.baseURL = 'http://localhost:4000';
      }
    } catch { void 0; }
  }, []);
  
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
};

export default App;
