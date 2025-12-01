
import React, { useEffect } from 'react';
// Corrected the import path again. Build tools like Vite often handle file extensions
// automatically, so we should import without the .jsx extension.
import AppRoutes from './Routes'; 

/**
 * App Component
 * ------------------
 * This is the main entry point for the React application.
 *
 * As per the user's request for a direct and sophisticated interface,
 * we are bypassing the old login system and rendering the core "Joe" agent UI directly.
 // The previous components (LandingPage, LoginModal) were missing, causing the build to fail. We now use React Router for proper navigation. * This streamlined approach immediately presents the user with the functional AI interface.
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
    } catch { void 0; }
  }, []);
  return <AppRoutes />;
};

export default App;
