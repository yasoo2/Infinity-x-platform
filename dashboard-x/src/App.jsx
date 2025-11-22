
import React, { useState } from 'react';
import LandingPage from './components/landing/LandingPage';
import LoginModal from './components/landing/LoginModal';
import JoeDashboard from './components/JoeDashboard';

// --------- CONFIG ----------
const ADMIN_EMAIL = "info.auraaluxury@gmail.com";
const ADMIN_PASS  = "younes2025";

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginError, setLoginError] = useState('');

  const handleLogin = (email, password) => {
    if (email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase() && password === ADMIN_PASS) {
      setIsLoggedIn(true);
      setIsLoginModalOpen(false);
      setLoginError('');
    } else {
      setLoginError('Invalid credentials. Please try again.');
    }
  };

  if (isLoggedIn) {
    return <JoeDashboard />;
  }

  return (
    <>
      <LandingPage onLoginClick={() => setIsLoginModalOpen(true)} />
      {isLoginModalOpen && (
        <LoginModal
          onLogin={handleLogin}
          onClose={() => setIsLoginModalOpen(false)}
          error={loginError}
        />
      )}
    </>
  );
};

export default App;
