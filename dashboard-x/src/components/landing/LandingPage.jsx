
import React from 'react';
import Header from './Header';
import Hero from './Hero';
import Services from './Services';
import Process from './Process';
import TechStack from './TechStack';
import Testimonials from './Testimonials';
import Footer from './Footer';

const LandingPage = ({ onLoginClick }) => {
  return (
    <div className="bg-gray-900">
      <Header onLoginClick={onLoginClick} />
      <main>
        <Hero />
        <Services />
        <Process />
        <TechStack />
        <Testimonials />
      </main>
      <Footer />
    </div>
  );
};

export default LandingPage;
