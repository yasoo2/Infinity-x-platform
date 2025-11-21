
import React from 'react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { ArrowRight, BrainCircuit, Code, Database, Users } from 'lucide-react';

const FeatureCard = ({ icon, title, description, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 50 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    className="bg-gray-800 p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow"
  >
    <div className="flex items-center mb-4">
      {icon}
      <h3 className="text-xl font-bold text-white ml-4">{title}</h3>
    </div>
    <p className="text-gray-400">{description}</p>
  </motion.div>
);

const LandingPage = () => {
  return (
    <div className="bg-gray-900 text-white min-h-screen">
      {/* Hero Section */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="relative text-center py-20 px-4"
        style={{
          backgroundImage: `url('/assets/images/hero-bg.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-black opacity-60"></div>
        <div className="relative z-10">
          <motion.h1
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-5xl md:text-7xl font-extrabold mb-4"
          >
            Pioneering Software Engineering & AI Solutions
          </motion.h1>
          <motion.p
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-lg md:text-xl max-w-3xl mx-auto text-gray-300"
          >
            We build robust software, leverage data-driven AI, and connect you with elite engineering talent to transform your startup into a market leader.
          </motion.p>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="mt-8"
          >
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg text-lg">
              Get in Touch <ArrowRight className="ml-2" />
            </Button>
          </motion.div>
        </div>
      </motion.section>

      {/* Services Section */}
      <section className="py-20 px-4 md:px-8">
        <h2 className="text-4xl font-bold text-center mb-12">Our Core Services</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
          <FeatureCard
            icon={<Code size={32} className="text-blue-500" />}
            title="Software Development"
            description="From sleek web applications to powerful mobile apps (Android & iOS), we deliver custom software solutions that are scalable, secure, and user-centric."
            delay={0.1}
          />
          <FeatureCard
            icon={<BrainCircuit size={32} className="text-purple-500" />}
            title="Artificial Intelligence Solutions"
            description="Integrate cutting-edge AI to automate processes, gain insights, and create intelligent products. We specialize in machine learning, NLP, and computer vision."
            delay={0.2}
          />
          <FeatureCard
            icon={<Database size={32} className="text-green-500" />}
            title="Data Engineering & Analytics"
            description="Transform raw data into a strategic asset. We design and build data pipelines, warehousing, and analytics platforms to unlock actionable insights."
            delay={0.3}
          />
          <FeatureCard
            icon={<Users size={32} className="text-red-500" />}
            title="Elite Talent Placement"
            description="Access our pool of pre-vetted, top-tier software engineers and developers. We rigorously test our talent to ensure they meet your company's high standards."
            delay={0.4}
          />
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="bg-gray-800 py-20 px-4 md:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4">Why Partner with Us?</h2>
          <p className="text-lg text-gray-400 max-w-3xl mx-auto mb-12">
            We are more than just developers; we are your strategic partners in innovation.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gray-900 p-6 rounded-lg">
              <h3 className="text-2xl font-bold text-blue-400 mb-2">Full-Cycle Development</h3>
              <p>From idea to deployment and beyond, we handle every stage of the product lifecycle.</p>
            </div>
            <div className="bg-gray-900 p-6 rounded-lg">
              <h3 className="text-2xl font-bold text-purple-400 mb-2">Rigorous Talent Vetting</h3>
              <p>Our engineers undergo extensive testing to guarantee technical excellence and cultural fit.</p>
            </div>
            <div className="bg-gray-900 p-6 rounded-lg">
              <h3 className="text-2xl font-bold text-green-400 mb-2">Future-Proof Technology</h3>
              <p>We leverage the latest advancements in AI and software engineering to build for the future.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 px-4 text-center">
        <h2 className="text-4xl font-bold mb-4">Ready to Build the Future?</h2>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-8">
          Let's discuss your project. Contact us for a free consultation and let's turn your vision into reality.
        </p>
        <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg text-lg">
          Schedule a Free Consultation
        </Button>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-gray-400 text-center py-6 px-4">
        <p>&copy; {new Date().getFullYear()} Infinity-X. All rights reserved.</p>
        <div className="flex justify-center space-x-4 mt-2">
          <a href="#" className="hover:text-white">Privacy Policy</a>
          <a href="#" className="hover:text-white">Terms of Service</a>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

