
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
      className={`sticky top-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-gray-900/80 backdrop-blur-lg border-b border-gray-700' : 'bg-transparent'}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex-shrink-0">
            <h1 className="text-2xl font-bold text-white tracking-wider">INFINITY-X</h1>
          </div>
          <nav className="hidden md:flex items-center space-x-10">
            <a href="#services" className="text-gray-300 hover:text-white transition-colors text-sm font-medium">Services</a>
            <a href="#process" className="text-gray-300 hover:text-white transition-colors text-sm font-medium">Process</a>
            <a href="#testimonials" className="text-gray-300 hover:text-white transition-colors text-sm font-medium">Testimonials</a>
            <a href="#contact" className="text-gray-300 hover:text-white transition-colors text-sm font-medium">Contact</a>
          </nav>
          <div className="flex items-center">
            <a href="/login" className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-5 py-2 rounded-md text-sm font-semibold hover:scale-105 transform transition-transform duration-300">
              Get Started
            </a>
          </div>
        </div>
      </div>
    </motion.header>
  );
};

export default Header;
