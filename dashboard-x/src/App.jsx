
import React from 'react';
import Joe from './Joe'; // The primary Agent Interface

/**
 * App Component
 * ------------------
 * This is the main entry point for the React application.
 *
 * As per the user's request for a direct and sophisticated interface,
 * we are bypassing the old login system and rendering the core "Joe" agent UI directly.
 * The previous components (LandingPage, LoginModal) were missing, causing the build to fail.
 * This streamlined approach immediately presents the user with the functional AI interface.
 */
const App = () => {
  // Render the core agent interface directly.
  return <Joe />;
};

export default App;
