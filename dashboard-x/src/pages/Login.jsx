import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessionToken } from '../hooks/useSessionToken';

export default function Login() {
  const [token, setToken] = useState('');
  const { saveToken } = useSessionToken();
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!token.trim()) return;
    
    saveToken(token);
    navigate('/overview');
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

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-textDim mb-2">
                Session Token
              </label>
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="input-field w-full"
                placeholder="Enter your session token..."
                required
              />
              <p className="mt-2 text-xs text-textDim">
                (Temporary until auth API is finalized)
              </p>
            </div>

            <button
              type="submit"
              className="btn-primary w-full"
            >
              Access Dashboard
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
