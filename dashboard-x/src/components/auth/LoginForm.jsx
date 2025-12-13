import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Mail, Lock, User, AlertCircle, CheckCircle, Settings } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';

const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showApiConfig, setShowApiConfig] = useState(false);
  const [apiBaseUrl, setApiBaseUrl] = useState(localStorage.getItem('apiBaseUrl') || 'http://localhost:3001');
  
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from?.pathname || '/dashboard/joe';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);
  
  // Load remembered email
  useEffect(() => {
    const rememberedEmail = localStorage.getItem('remembered_email');
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
  }, []);
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);
    
    try {
      // Basic validation
      if (!email.trim()) {
        throw new Error('Please enter your email address');
      }
      
      if (!password.trim()) {
        throw new Error('Please enter your password');
      }
      
      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        throw new Error('Please enter a valid email address');
      }
      
      // Attempt login
      const result = await login(email.trim(), password, rememberMe);
      
      if (result.success) {
        setSuccess('Login successful! Redirecting...');
        
        // Handle remember me
        if (rememberMe) {
          localStorage.setItem('remembered_email', email.trim());
        } else {
          localStorage.removeItem('remembered_email');
        }
        
        // Redirect to dashboard
        setTimeout(() => {
          navigate('/dashboard/joe', { replace: true });
        }, 1000);
      }
      
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle API configuration
  const handleApiConfigSave = () => {
    localStorage.setItem('apiBaseUrl', apiBaseUrl);
    setShowApiConfig(false);
    window.location.reload(); // Reload to use new API URL
  };
  
  // Password requirements helper
  const getPasswordStrength = (password) => {
    if (!password) return { strength: 0, label: 'Enter a password', color: 'text-gray-500' };
    
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>?]/.test(password)) strength++;
    
    const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
    const colors = ['text-red-600', 'text-red-500', 'text-yellow-500', 'text-yellow-400', 'text-green-500', 'text-green-600'];
    
    return {
      strength,
      label: labels[strength] || 'Very Strong',
      color: colors[strength] || 'text-green-600'
    };
  };
  
  const passwordStrength = getPasswordStrength(password);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl mb-4">
            <User className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
          <p className="text-gray-300">Sign in to access your dashboard</p>
        </div>
        
        {/* Login Form */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="Enter your email"
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>
            </div>
            
            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="Enter your password"
                  disabled={isLoading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white transition-colors duration-200"
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              
              {/* Password Strength Indicator */}
              {password && (
                <div className="mt-2 flex items-center space-x-2">
                  <div className="flex-1 bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        passwordStrength.strength === 0 ? 'w-0' :
                        passwordStrength.strength === 1 ? 'w-1/5 bg-red-500' :
                        passwordStrength.strength === 2 ? 'w-2/5 bg-red-400' :
                        passwordStrength.strength === 3 ? 'w-3/5 bg-yellow-500' :
                        passwordStrength.strength === 4 ? 'w-4/5 bg-yellow-400' :
                        'w-full bg-green-500'
                      }`}
                    />
                  </div>
                  <span className={`text-xs ${passwordStrength.color}`}>
                    {passwordStrength.label}
                  </span>
                </div>
              )}
            </div>
            
            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-blue-600 bg-white/10 border-white/20 rounded focus:ring-blue-500"
                  disabled={isLoading}
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-300">
                  Remember me
                </label>
              </div>
              
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="text-sm text-blue-400 hover:text-blue-300 transition-colors duration-200"
                disabled={isLoading}
              >
                Forgot password?
              </button>
            </div>
            
            {/* Error/Success Messages */}
            {error && (
              <div className="flex items-center p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-400 mr-3 flex-shrink-0" />
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}
            
            {success && (
              <div className="flex items-center p-4 bg-green-500/20 border border-green-500/30 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-400 mr-3 flex-shrink-0" />
                <p className="text-sm text-green-300">{success}</p>
              </div>
            )}
            
            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 disabled:transform-none"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                  Signing in...
                </div>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
          
          {/* API Configuration */}
          <div className="mt-6 pt-6 border-t border-white/20">
            <button
              type="button"
              onClick={() => setShowApiConfig(!showApiConfig)}
              className="flex items-center text-sm text-gray-400 hover:text-white transition-colors duration-200"
            >
              <Settings className="h-4 w-4 mr-2" />
              API Configuration
            </button>
            
            {showApiConfig && (
              <div className="mt-4 p-4 bg-white/5 rounded-lg">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  API Base URL
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={apiBaseUrl}
                    onChange={(e) => setApiBaseUrl(e.target.value)}
                    className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="http://localhost:3001"
                  />
                  <button
                    type="button"
                    onClick={handleApiConfigSave}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors duration-200"
                  >
                    Save
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Current: {localStorage.getItem('apiBaseUrl') || 'http://localhost:3001'}
                </p>
              </div>
            )}
          </div>
          
          {/* Sign Up Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-300">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => navigate('/signup')}
                className="text-blue-400 hover:text-blue-300 font-medium transition-colors duration-200"
              >
                Sign up here
              </button>
            </p>
          </div>
        </div>
        
        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-xs text-gray-400">
            By signing in, you agree to our{' '}
            <button
              type="button"
              onClick={() => navigate('/terms')}
              className="text-blue-400 hover:text-blue-300"
            >
              Terms of Service
            </button>{' '}
            and{' '}
            <button
              type="button"
              onClick={() => navigate('/privacy')}
              className="text-blue-400 hover:text-blue-300"
            >
              Privacy Policy
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;