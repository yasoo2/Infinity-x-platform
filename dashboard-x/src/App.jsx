
import React from 'react';
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
  // Render the core application routes.
  return <AppRoutes />;
};

export default App;
