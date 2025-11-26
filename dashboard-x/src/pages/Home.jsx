import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LandingPage from '../components/landing/LandingPage';
import LoginModal from '../components/landing/LoginModal';

export default function Home() {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const navigate = useNavigate();

  // Check if user is already logged in
  useEffect(() => {
    const token = localStorage.getItem('sessionToken');
    if (token) {
      // User is already logged in, redirect to Joe page
      navigate('/dashboard/joe');
    }
  }, [navigate]);

  const handleLoginClick = () => {
    setIsLoginModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsLoginModalOpen(false);
  };

  const handleLoginSuccess = () => {
    setIsLoginModalOpen(false);
    navigate('/dashboard/joe');
  };

  return (
    <>
      <LandingPage onLoginClick={handleLoginClick} />
      {isLoginModalOpen && (
        <LoginModal 
          onClose={handleCloseModal} 
          onLoginSuccess={handleLoginSuccess} 
        />
      )}
    </>
  );
}
