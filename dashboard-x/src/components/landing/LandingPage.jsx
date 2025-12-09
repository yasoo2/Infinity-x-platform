
import React, { Suspense, useEffect, useState } from 'react';
const Header = React.lazy(() => import('./Header'));
const Hero = React.lazy(() => import('./Hero'));
const Services = React.lazy(() => import('./Services'));
const Process = React.lazy(() => import('./Process'));
const TechStack = React.lazy(() => import('./TechStack'));
const Testimonials = React.lazy(() => import('./Testimonials'));
const Footer = React.lazy(() => import('./Footer'));

const LandingPage = () => {
  const [showTech, setShowTech] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShowTech(true), 1200);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="bg-gray-900">
      <Suspense fallback={<div className="h-14" />}>
        <Header />
      </Suspense>
      <main>
        <Suspense fallback={<div className="h-64" />}>
          <Hero />
        </Suspense>
        <Suspense fallback={<div className="h-48" />}>
          <Services />
        </Suspense>
        <Suspense fallback={<div className="h-48" />}>
          <Process />
        </Suspense>
        {showTech && (
          <Suspense fallback={<div className="h-screen" />}>
            <TechStack />
          </Suspense>
        )}
        <Suspense fallback={<div className="h-48" />}>
          <Testimonials />
        </Suspense>
      </main>
      <Suspense fallback={<div className="h-20" />}>
        <Footer />
      </Suspense>
    </div>
  );
};

export default LandingPage;
