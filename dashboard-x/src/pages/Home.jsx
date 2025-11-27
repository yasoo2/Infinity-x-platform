import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LandingPage from '../components/landing/LandingPage';

export default function Home() {
  const navigate = useNavigate();

  // Check if user is already logged in
  useEffect(() => {
    const token = localStorage.getItem('sessionToken');
    if (token) {
      // User is already logged in, redirect to Joe page
      navigate('/dashboard/joe');
    }
  }, [navigate]);

  return (
    <>
      <LandingPage />
    </>
  );
}
