
import React from 'react';
import Header from '../components/landing/Header';
import Hero from '../components/landing/Hero';
import Services from '../components/landing/Services';
import TechStack from '../components/landing/TechStack';
import Process from '../components/landing/Process';
import Testimonials from '../components/landing/Testimonials';
import Footer from '../components/landing/Footer';

const LandingPage = () => {
  return (
    <div className="bg-gray-900 text-white font-sans">
      <Header />
      <main>
        <Hero />
        <Services />
        <TechStack />
        <Process />
        <Testimonials />
      </main>
      <Footer />
    </div>
  );
};

export default LandingPage;
