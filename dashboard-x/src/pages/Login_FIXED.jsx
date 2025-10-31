import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessionToken } from '../hooks/useSessionToken';
import apiClient from '../api/client';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { saveToken } = useSessionToken();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password');
      return;
    }
    
    setLoading(true);
    
    try {
      // استدعاء API للمصادقة
      const response = await apiClient.post('/api/auth/login', {
        emailOrPhone: email,
        password: password
      });
      
      if (response.data.ok && response.data.sessionToken) {
        // حفظ الـ token
        saveToken(response.data.sessionToken);
        
        // التوجيه إلى Dashboard
        navigate('/overview');
      } else {
        setError('Login failed. Please try again.');
      }
    } catch (err) {
      console.error('Login error:', err);
      
      if (err.response?.data?.error === 'BAD_CREDENTIALS') {
        setError('Invalid email or password');
      } else if (err.response?.status === 500) {
        setError('Server error. Please try again later.');
      } else {
        setError('Login failed. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bgDark px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">
            <span className="text-neonGreen">Infinity</span>
            <span className="text-neonBlue">X</span>
          </h1>
          <p className="text-textDim">Dashboard X - Mission Control</p>
        </div>

        <div className="card">
          <h2 className="text-2xl font-bold mb-6 text-center">
            Admin Login
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-textDim mb-2">
                Email or Phone
              </label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field w-full"
                placeholder="Enter your email or phone..."
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-textDim mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field w-full"
                placeholder="Enter your password..."
                required
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              className="btn-primary w-full"
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Access Dashboard'}
            </button>
          </form>
        </div>

        <div className="mt-6 text-center text-xs text-textDim">
          <p>InfinityX Platform © 2025</p>
          <p className="mt-1">Powered by JOEngine</p>
        </div>
      </div>
    </div>
  );
}
