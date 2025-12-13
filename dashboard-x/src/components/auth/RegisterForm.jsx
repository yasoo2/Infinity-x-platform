import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Mail, Lock, User, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const RegisterForm = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard/joe', { replace: true });
    }
  }, [isAuthenticated, navigate]);
  
  // Validate form data
  const validateForm = () => {
    const errors = {};
    
    // Full name validation
    if (!formData.fullName.trim()) {
      errors.fullName = 'Full name is required';
    } else if (formData.fullName.trim().length < 2) {
      errors.fullName = 'Full name must be at least 2 characters long';
    } else if (formData.fullName.trim().length > 100) {
      errors.fullName = 'Full name is too long';
    } else if (!/^[a-zA-Z\s\-'\.]+$/.test(formData.fullName.trim())) {
      errors.fullName = 'Full name can only contain letters, spaces, hyphens, and apostrophes';
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email.trim())) {
      errors.email = 'Please enter a valid email address';
    } else if (formData.email.trim().length > 254) {
      errors.email = 'Email is too long';
    }
    
    // Password validation
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters long';
    } else if (formData.password.length > 128) {
      errors.password = 'Password must be no more than 128 characters long';
    } else {
      // Check password requirements
      const requirements = [];
      if (!/[A-Z]/.test(formData.password)) requirements.push('uppercase letter');
      if (!/[a-z]/.test(formData.password)) requirements.push('lowercase letter');
      if (!/\d/.test(formData.password)) requirements.push('number');
      if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>?]/.test(formData.password)) requirements.push('special character');
      
      if (requirements.length > 0) {
        errors.password = `Password must contain at least one ${requirements.join(', ')}`;
      }
      
      // Check for common weak passwords
      const weakPasswords = ['password', '12345678', 'qwerty', 'admin', 'letmein', 'welcome'];
      if (weakPasswords.some(weak => formData.password.toLowerCase().includes(weak))) {
        errors.password = 'Password is too common, please choose a stronger password';
      }
    }
    
    // Confirm password validation
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: '' }));
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      const result = await register(
        formData.email.trim(),
        formData.password,
        formData.fullName.trim()
      );
      
      if (result.success) {
        setSuccess('Account created successfully! Redirecting to dashboard...');
        setTimeout(() => {
          navigate('/dashboard/joe', { replace: true });
        }, 2000);
      }
      
    } catch (err) {
      console.error('Registration error:', err);
      
      // Handle specific error cases
      if (err.message.includes('already exists')) {
        setError('An account with this email already exists. Please sign in instead.');
      } else if (err.message.includes('rate limit')) {
        setError('Too many registration attempts. Please try again later.');
      } else {
        setError(err.message || 'Registration failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Password strength indicator
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
  
  const passwordStrength = getPasswordStrength(formData.password);
  
  // Password requirements checklist
  const passwordRequirements = [
    { test: formData.password.length >= 8, label: 'At least 8 characters' },
    { test: /[A-Z]/.test(formData.password), label: 'One uppercase letter' },
    { test: /[a-z]/.test(formData.password), label: 'One lowercase letter' },
    { test: /\d/.test(formData.password), label: 'One number' },
    { test: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>?]/.test(formData.password), label: 'One special character' }
  ];
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-green-500 to-blue-600 rounded-xl mb-4">
            <User className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Create Account</h1>
          <p className="text-gray-300">Join us and start building amazing things</p>
        </div>
        
        {/* Registration Form */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Full Name Field */}
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-300 mb-2">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-4 py-3 bg-white/10 border rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                    validationErrors.fullName ? 'border-red-500' : 'border-white/20'
                  }`}
                  placeholder="Enter your full name"
                  disabled={isLoading}
                  autoComplete="name"
                />
              </div>
              {validationErrors.fullName && (
                <p className="mt-1 text-sm text-red-400">{validationErrors.fullName}</p>
              )}
            </div>
            
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
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-4 py-3 bg-white/10 border rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                    validationErrors.email ? 'border-red-500' : 'border-white/20'
                  }`}
                  placeholder="Enter your email"
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>
              {validationErrors.email && (
                <p className="mt-1 text-sm text-red-400">{validationErrors.email}</p>
              )}
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
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-12 py-3 bg-white/10 border rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                    validationErrors.password ? 'border-red-500' : 'border-white/20'
                  }`}
                  placeholder="Create a strong password"
                  disabled={isLoading}
                  autoComplete="new-password"
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
              {formData.password && (
                <div className="mt-2">
                  <div className="flex items-center space-x-2 mb-2">
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
                  
                  {/* Password Requirements */}
                  <div className="space-y-1">
                    {passwordRequirements.map((req, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${
                          req.test ? 'bg-green-500' : 'bg-gray-600'
                        }`} />
                        <span className={`text-xs ${
                          req.test ? 'text-green-400' : 'text-gray-400'
                        }`}>
                          {req.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {validationErrors.password && (
                <p className="mt-1 text-sm text-red-400">{validationErrors.password}</p>
              )}
            </div>
            
            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-12 py-3 bg-white/10 border rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                    validationErrors.confirmPassword ? 'border-red-500' : 'border-white/20'
                  }`}
                  placeholder="Confirm your password"
                  disabled={isLoading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white transition-colors duration-200"
                  disabled={isLoading}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {validationErrors.confirmPassword && (
                <p className="mt-1 text-sm text-red-400">{validationErrors.confirmPassword}</p>
              )}
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
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 disabled:transform-none"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                  Creating account...
                </div>
              ) : (
                'Create Account'
              )}
            </button>
          </form>
          
          {/* Sign In Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-300">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="text-blue-400 hover:text-blue-300 font-medium transition-colors duration-200"
              >
                Sign in here
              </button>
            </p>
          </div>
        </div>
        
        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-xs text-gray-400">
            By creating an account, you agree to our{' '}
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

export default RegisterForm;