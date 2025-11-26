import React, { useState } from 'react';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import apiClient from '../../api/client';

const LoginModal = ({ onClose, onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Using the centralized API client instead of hardcoded URL

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
        const response = await apiClient.post('/api/v1/auth/login', {
            email,
            password
        });

        if (response.data.success) {
            // Use the token received from the backend
            const sessionToken = response.data.token;
            if (sessionToken) {
                localStorage.setItem('sessionToken', sessionToken);
                if (onLoginSuccess) {
                    onLoginSuccess(); // Trigger redirect or state change in parent
                }
            } else {
                setError('Login successful, but no session token was provided.');
            }
        } else {
            // Use the error message from the backend, or a default one
            setError(response.data.message || 'Invalid email or password');
        }
    } catch (err) {
        console.error('Login API Error:', err);
        setError(err.message || 'A network error occurred. Please try again later.');
    }

    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md">
      <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-8 max-w-sm w-full relative shadow-2xl shadow-blue-500/20">
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors text-3xl leading-none"
        >
          &times;
        </button>
        <h2 className="text-2xl font-bold text-white text-center mb-6">Admin Access</h2>
        {error && <p className="text-red-500 text-center mb-4 text-sm">{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-400 mb-2">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-700/50 border border-gray-600 rounded-md py-3 px-4 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              placeholder="Enter your email"
              required
              disabled={loading}
            />
          </div>
          <div className="mb-6 relative">
            <label htmlFor="password" className="block text-sm font-medium text-gray-400 mb-2">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-700/50 border border-gray-600 rounded-md py-3 px-4 pr-12 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                placeholder="Enter your password"
                required
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
              >
                {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
              </button>
            </div>
          </div>
          <button 
            type="submit" 
            className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginModal;
