import React from 'react';
import { useNavigate } from 'react-router-dom';
import LoginCard from '../components/auth/LoginCard';

const SimpleLogin = () => {
  const navigate = useNavigate();

  const handleLoginSuccess = (user) => {
    console.log('Login successful:', user);
    // Redirect to dashboard after successful login
    navigate('/dashboard');
  };

  const handleLoginError = (error) => {
    console.error('Login failed:', error);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <LoginCard 
        onSuccess={handleLoginSuccess}
        onError={handleLoginError}
      />
    </div>
  );
};

export default SimpleLogin;