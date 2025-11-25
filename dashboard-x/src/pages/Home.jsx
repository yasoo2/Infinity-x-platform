import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LandingPage from '../components/landing/LandingPage';
import LoginModal from '../components/landing/LoginModal';

export default function Home() {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const navigate = useNavigate();

  const handleLoginClick = () => {
    setIsLoginModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsLoginModalOpen(false);
  };

  const handleLoginSuccess = () => {
    setIsLoginModalOpen(false);
    navigate('/joe');
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
