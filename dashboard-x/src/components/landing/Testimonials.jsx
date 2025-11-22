
import React from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

const testimonialsData = [
  {
    quote: 'Infinity-X transformed our vision into a reality. Their expertise in AI and software development is unmatched. The final product exceeded all our expectations.',
    author: 'John Doe',
    title: 'CEO, Tech Innovators',
    avatar: '/assets/images/avatar1.jpg',
  },
  {
    quote: 'The team at Infinity-X is not just a vendor, but a true partner. Their commitment to quality and their agile process made the development cycle smooth and efficient.',
    author: 'Jane Smith',
    title: 'CTO, Future Solutions',
    avatar: '/assets/images/avatar2.jpg',
  },
  {
    quote: 'We needed a complex data engineering solution, and Infinity-X delivered. Their insights and technical skills have been invaluable to our business.',
    author: 'Samuel Green',
    title: 'Head of Data, Analytics Corp',
    avatar: '/assets/images/avatar3.jpg',
  },
];

const Testimonials = () => {
  const cardVariants = {
    offscreen: {
      y: 50,
      opacity: 0
    },
    onscreen: {
      y: 0,
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  return (
    <section id="testimonials" className="py-24 bg-gray-800/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-extrabold text-white tracking-tight">Trusted by Industry Leaders</h2>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-gray-400">Our clients love our work, and we think you will too.</p>
        </div>
        <motion.div
          className="grid lg:grid-cols-3 gap-8"
          initial="offscreen"
          whileInView="onscreen"
          viewport={{ once: true, amount: 0.3 }}
          variants={cardVariants}
        >
          {testimonialsData.map((testimonial, index) => (
            <motion.div key={index} className="bg-gray-900/60 backdrop-blur-md p-8 rounded-xl shadow-lg border border-gray-700/50 flex flex-col">
                <div className="flex mb-4">
                    {[...Array(5)].map((_, i) => <Star key={i} className="text-yellow-400 fill-current"/>)}
                </div>
              <p className="text-gray-300 flex-grow"><em>"{testimonial.quote}"</em></p>
              <div className="mt-6 flex items-center">
                <img src={testimonial.avatar} alt={testimonial.author} className="w-12 h-12 rounded-full object-cover border-2 border-blue-400" />
                <div className="ml-4">
                  <p className="font-bold text-white">{testimonial.author}</p>
                  <p className="text-sm text-gray-400">{testimonial.title}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Testimonials;

