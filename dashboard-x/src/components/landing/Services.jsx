
import React from 'react';
import { motion } from 'framer-motion';
import { Code2, BrainCircuit, DatabaseZap, UserCheck } from 'lucide-react';

const servicesData = [
  {
    icon: <Code2 size={32} className="text-cyan-400" />,
    title: 'Software Development',
    description: 'We build scalable and robust web and mobile applications using cutting-edge technologies. From concept to deployment, we deliver solutions that perform.',
  },
  {
    icon: <BrainCircuit size={32} className="text-purple-400" />,
    title: 'Artificial Intelligence',
    description: 'Leverage the power of AI to automate processes, gain insights from data, and create intelligent products. We specialize in machine learning and LLM integration.',
  },
  {
    icon: <DatabaseZap size={32} className="text-green-400" />,
    title: 'Data Engineering',
    description: 'Transform your data into a strategic asset. We design and build data pipelines, warehousing solutions, and analytics platforms to drive business intelligence.',
  },
  {
    icon: <UserCheck size={32} className="text-red-400" />,
    title: 'Elite Talent Placement',
    description: 'Access our network of pre-vetted, top-tier software engineers and AI specialists. We connect you with the talent you need to succeed.',
  },
];

const cardVariants = {
  offscreen: {
    y: 100,
    opacity: 0,
  },
  onscreen: {
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      bounce: 0.4,
      duration: 0.8,
    },
  },
};

const Services = () => {
  return (
    <section id="services" className="py-24 bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-base font-semibold text-blue-400 tracking-wider uppercase">Our Expertise</h2>
          <p className="mt-2 text-4xl font-extrabold text-white tracking-tight sm:text-5xl">
            High-Impact Technology Services
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {servicesData.map((service, index) => (
            <motion.div
              key={index}
              className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 shadow-2xl shadow-blue-500/10 border border-gray-700 hover:border-blue-500 hover:scale-105 transition-all duration-300"
              initial="offscreen"
              whileInView="onscreen"
              viewport={{ once: true, amount: 0.5 }}
              variants={cardVariants}
            >
              <div className="mb-6">{service.icon}</div>
              <h3 className="text-xl font-bold text-white mb-3">{service.title}</h3>
              <p className="text-gray-400 leading-relaxed">{service.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;

