
import React from 'react';
import { Linkedin, Twitter, Github } from 'lucide-react';

const Footer = () => {
  return (
    <footer id="contact" className="bg-gray-900 border-t border-gray-800">
      <div className="max-w-7xl mx-auto py-20 px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-4xl font-extrabold text-white leading-tight">Ready to Build the Future?</h2>
            <p className="mt-4 text-lg text-gray-400">Let&apos;s connect. We&apos;re here to help you achieve your technology goals. Fill out the form or send us an email to start the conversation.</p>
            <a href="mailto:contact@infinity-x.com" className="mt-8 inline-block bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold py-4 px-10 rounded-full hover:scale-105 transition-transform duration-300 shadow-lg shadow-blue-500/20">
              Contact Us
            </a>
          </div>
          <div className="bg-gray-800/50 backdrop-blur-sm p-8 rounded-lg border border-gray-700/60">
            <form>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="sr-only">Name</label>
                  <input type="text" name="name" id="name" placeholder="Your Name" className="w-full bg-gray-700/50 border-gray-600 rounded-md py-3 px-4 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" />
                </div>
                <div>
                  <label htmlFor="email-footer" className="sr-only">Email</label>
                  <input type="email" name="email" id="email-footer" placeholder="Your Email" className="w-full bg-gray-700/50 border-gray-600 rounded-md py-3 px-4 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" />
                </div>
              </div>
              <div className="mt-4">
                <label htmlFor="message" className="sr-only">Message</label>
                <textarea name="message" id="message" rows="4" placeholder="Your Message" className="w-full bg-gray-700/50 border-gray-600 rounded-md py-3 px-4 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"></textarea>
              </div>
              <div className="mt-6">
                <button type="submit" className="w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 transition-all duration-300 transform hover:scale-105">
                  Send Message
                </button>
              </div>
            </form>
          </div>
        </div>
        <div className="mt-20 pt-8 border-t border-gray-800 flex flex-col sm:flex-row justify-between items-center text-gray-500">
          <p>&copy; {new Date().getFullYear()} Infinity-X. All rights reserved.</p>
          <div className="flex space-x-6 mt-4 sm:mt-0">
            <a href="#" className="hover:text-white transition-colors"><Twitter /></a>
            <a href="#" className="hover:text-white transition-colors"><Github /></a>
            <a href="#" className="hover:text-white transition-colors"><Linkedin /></a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
