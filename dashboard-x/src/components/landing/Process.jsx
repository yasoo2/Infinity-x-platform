
import React from 'react';
import { motion } from 'framer-motion';
import { Search, PenTool, Code, Rocket } from 'lucide-react';

const processSteps = [
  {
    icon: <Search size={28} className="text-white" />,
    title: '1. Discovery & Strategy',
    description: 'We start by understanding your vision, goals, and challenges. This phase includes market research, requirements gathering, and creating a strategic roadmap for success.',
  },
  {
    icon: <PenTool size={28} className="text-white" />,
    title: '2. Design & Architecture',
    description: 'Our team designs intuitive user interfaces (UI) and user experiences (UX), combined with a robust and scalable system architecture to ensure long-term performance and maintainability.',
  },
  {
    icon: <Code size={28} className="text-white" />,
    title: '3. Agile Development',
    description: 'We use agile methodologies to develop your product in iterative sprints. This allows for flexibility, continuous feedback, and ensures the final product is aligned with your vision.',
  },
  {
    icon: <Rocket size={28} className="text-white" />,
    title: '4. Deployment & Growth',
    description: 'We handle the deployment process and provide ongoing support and maintenance. We also work with you to identify future opportunities for growth and enhancement.',
  },
];

const Process = () => {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.3,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, x: -50 },
    show: { opacity: 1, x: 0, transition: { duration: 0.5 } },
  };

  return (
    <section id="process" className="py-24 bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-20">
          <h2 className="text-base font-semibold text-blue-400 tracking-wider uppercase">Our Approach</h2>
          <p className="mt-2 text-4xl font-extrabold text-white tracking-tight sm:text-5xl">
            A Structured Path to Excellence
          </p>
        </div>
        <motion.div
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-10"
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.5 }}
        >
          {processSteps.map((step, index) => (
            <motion.div key={index} variants={item} className="bg-gray-800/20 p-6 rounded-lg border border-transparent hover:border-blue-500/50 transition-colors duration-300">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 w-16 h-16 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30">
                {step.icon}
              </div>
              <h3 className="mt-6 text-xl font-bold text-white">{step.title}</h3>
              <p className="mt-2 text-gray-400">{step.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Process;
