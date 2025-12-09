import React, { useEffect, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
const LandingPage = React.lazy(() => import('../components/landing/LandingPage'));

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
      <Suspense fallback={<div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}><div style={{ color: '#0ea5e9', fontWeight: 700 }}>Loading...</div></div>}>
        <LandingPage />
      </Suspense>
    </>
  );
}
