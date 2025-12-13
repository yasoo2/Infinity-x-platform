import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiLogIn, FiZap, FiGlobe, FiUsers, FiAward } from 'react-icons/fi';

const LandingPage = () => {
  const navigate = useNavigate();

  const handleLoginClick = () => {
    navigate('/login');
  };

  const features = [
    {
      icon: <FiZap className="w-8 h-8 text-blue-600" />,
      title: "Fast Performance",
      description: "Lightning-fast response times with optimized architecture"
    },
    {
      icon: <FiGlobe className="w-8 h-8 text-blue-600" />,
      title: "Global Access",
      description: "Access your dashboard from anywhere in the world"
    },
    {
      icon: <FiUsers className="w-8 h-8 text-blue-600" />,
      title: "Team Collaboration",
      description: "Work together seamlessly with your team members"
    },
    {
      icon: <FiAward className="w-8 h-8 text-blue-600" />,
      title: "Premium Features",
      description: "Advanced tools and capabilities for power users"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <header className="relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                <FiZap className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-white">XElite Solutions</span>
            </div>
            
            <button
              onClick={handleLoginClick}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 flex items-center space-x-2 focus:ring-4 focus:ring-blue-500 focus:ring-opacity-50"
            >
              <FiLogIn className="w-5 h-5" />
              <span>Login</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center space-y-8">
            <div className="space-y-4">
              <h1 className="text-5xl md:text-7xl font-bold text-white">
                Welcome to
                <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent"> Joe Dashboard</span>
              </h1>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
                Experience the next generation of dashboard management with our powerful, 
                intuitive, and beautifully designed interface. Built for professionals who demand excellence.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleLoginClick}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-4 rounded-lg font-medium text-lg transition-all duration-200 transform hover:scale-105 flex items-center justify-center space-x-2 focus:ring-4 focus:ring-blue-500 focus:ring-opacity-50"
              >
                <FiLogIn className="w-6 h-6" />
                <span>Get Started</span>
              </button>
              
              <button className="border-2 border-gray-600 hover:border-gray-500 text-gray-300 hover:text-white px-8 py-4 rounded-lg font-medium text-lg transition-all duration-200 transform hover:scale-105 focus:ring-4 focus:ring-gray-500 focus:ring-opacity-50">
                Learn More
              </button>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Premium Features</h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Everything you need to manage your projects efficiently and effectively
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 space-y-4 hover:bg-white/15 transition-all duration-300 transform hover:scale-105"
              >
                <div className="flex justify-center">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-white text-center">{feature.title}</h3>
                <p className="text-gray-300 text-center">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 backdrop-blur-sm border border-white/20 rounded-2xl p-12 text-center space-y-6">
            <h2 className="text-4xl font-bold text-white">Ready to Get Started?</h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Join thousands of professionals who trust our platform for their daily operations. 
              Experience the difference today.
            </p>
            <button
              onClick={handleLoginClick}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-4 rounded-lg font-medium text-lg transition-all duration-200 transform hover:scale-105 flex items-center justify-center space-x-2 mx-auto focus:ring-4 focus:ring-blue-500 focus:ring-opacity-50"
            >
              <FiLogIn className="w-6 h-6" />
              <span>Login to Dashboard</span>
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-400">
            <p>&copy; 2024 XElite Solutions. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-gradient-to-r from-blue-400/30 to-purple-400/30 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-gradient-to-r from-purple-400/30 to-pink-400/30 rounded-full mix-blend-multiply filter blur-3xl animate-pulse animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-gradient-to-r from-cyan-400/20 to-blue-400/20 rounded-full mix-blend-multiply filter blur-3xl animate-pulse animation-delay-4000"></div>
      </div>
    </div>
  );
};

export default Landing