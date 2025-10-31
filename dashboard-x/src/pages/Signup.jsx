import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import apiClient from '../api/client';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState('+90'); // Default to Turkey
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Popular country codes
  const countryCodes = [
    { code: '+1', country: 'USA/Canada' },
    { code: '+20', country: 'Egypt' },
    { code: '+44', country: 'UK' },
    { code: '+49', country: 'Germany' },
    { code: '+90', country: 'Turkey' },
    { code: '+91', country: 'India' },
    { code: '+212', country: 'Morocco' },
    { code: '+213', country: 'Algeria' },
    { code: '+216', country: 'Tunisia' },
    { code: '+218', country: 'Libya' },
    { code: '+249', country: 'Sudan' },
    { code: '+966', country: 'Saudi Arabia' },
    { code: '+971', country: 'UAE' },
    { code: '+974', country: 'Qatar' },
    { code: '+962', country: 'Jordan' },
    { code: '+961', country: 'Lebanon' },
    { code: '+963', country: 'Syria' },
    { code: '+964', code: 'Iraq' },
    { code: '+965', country: 'Kuwait' },
    { code: '+968', country: 'Oman' },
    { code: '+973', country: 'Bahrain' },
    { code: '+967', country: 'Yemen' },
  ];
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    
    // التحقق من المدخلات
    if (!email.trim() || !password.trim()) {
      setError('Email and password are required');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    
    setLoading(true);
    
    try {
      // استدعاء API للتسجيل
      const response = await apiClient.post('/api/auth/register', {
        email: email,
        phone: phone ? `${countryCode}${phone}` : null,
        password: password
      });
      
      if (response.data.ok) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setError('Registration failed. Please try again.');
      }
    } catch (err) {
      console.error('Signup error:', err);
      
      if (err.response?.data?.error === 'EMAIL_EXISTS') {
        setError('This email is already registered');
      } else if (err.response?.status === 500) {
        setError('Server error. Please try again later.');
      } else {
        setError('Registration failed. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bgDark px-4 py-12">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">
            <span className="text-neonGreen">Infinity</span>
            <span className="text-neonBlue">X</span>
          </h1>
          <p className="text-textDim">Create Your Account</p>
        </div>

        <div className="card">
          <h2 className="text-2xl font-bold mb-6 text-center">
            Sign Up
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded text-red-400 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-500/10 border border-green-500/50 rounded text-green-400 text-sm">
              Account created successfully! Redirecting to login...
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-textDim mb-2">
                Email *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field w-full"
                placeholder="your@email.com"
                required
                disabled={loading || success}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-textDim mb-2">
                Phone (Optional)
              </label>
              <div className="flex gap-2">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="input-field w-32"
                  disabled={loading || success}
                >
                  {countryCodes.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.code} {item.country}
                    </option>
                  ))}
                </select>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="input-field flex-1"
                  placeholder="5013715391"
                  disabled={loading || success}
                />
              </div>
              <p className="text-xs text-textDim mt-1">
                Example: Select +90 and enter 5013715391
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-textDim mb-2">
                Password *
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field w-full"
                placeholder="At least 8 characters"
                required
                disabled={loading || success}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-textDim mb-2">
                Confirm Password *
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-field w-full"
                placeholder="Re-enter your password"
                required
                disabled={loading || success}
              />
            </div>

            <button
              type="submit"
              className="btn-primary w-full"
              disabled={loading || success}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-textDim">
            Already have an account?{' '}
            <Link to="/login" className="text-neonBlue hover:text-white transition-colors">
              Login here
            </Link>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-textDim">
          <p>InfinityX Platform © 2025</p>
          <p className="mt-1">Powered by JOEngine</p>
        </div>
      </div>
    </div>
  );
}
