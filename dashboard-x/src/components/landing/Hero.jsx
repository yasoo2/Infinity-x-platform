
import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import Hero3D from './Hero3D';

const Hero = () => {
  return (
    <section className="relative h-screen flex items-center justify-center text-center overflow-hidden">
      <Hero3D />
      <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-gray-900/80 to-gray-900"></div>

      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.5 }}
        className="relative z-10 px-4"
      >
        <motion.h1
          className="text-5xl md:text-7xl font-extrabold tracking-tight text-white"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.8 }}
        >
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">Transforming Ideas</span>
          <br />
          into Digital Realities
        </motion.h1>
        <motion.p
          className="mt-6 max-w-3xl mx-auto text-lg md:text-xl text-gray-300"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.2 }}
        >
          We are a collective of elite software engineers and AI specialists dedicated to building the next generation of digital products for startups and enterprises that dare to be great.
        </motion.p>
        <motion.div
          className="mt-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.5 }}
        >
          <a href="#contact" className="bg-white text-gray-900 font-bold py-4 px-8 rounded-full text-lg hover:bg-gray-200 transition-all duration-300 transform hover:scale-105 inline-flex items-center">
            Start Your Project <ArrowRight className="ml-2" />
          </a>
        </motion.div>
      </motion.div>
    </section>
  );
};

export default Hero;
