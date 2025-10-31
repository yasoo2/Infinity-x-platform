import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSessionToken } from '../hooks/useSessionToken';
import apiClient from '../api/client';

export default function GoogleCallback() {
  const [searchParams] = useSearchParams();
  const [error, setError] = useState('');
  const { saveToken } = useSessionToken();
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const errorParam = searchParams.get('error');

      if (errorParam) {
        setError('Google login was cancelled or failed');
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      if (!code) {
        setError('No authorization code received');
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      try {
        // Send code to backend
        const response = await apiClient.post('/api/auth/google/callback', {
          code,
          redirectUri: `${window.location.origin}/auth/google/callback`
        });

        if (response.data.ok && response.data.sessionToken) {
          saveToken(response.data.sessionToken);
          navigate('/overview');
        } else {
          setError('Login failed. Please try again.');
          setTimeout(() => navigate('/login'), 3000);
        }
      } catch (err) {
        console.error('Google OAuth error:', err);
        setError('Authentication failed. Please try again.');
        setTimeout(() => navigate('/login'), 3000);
      }
    };

    handleCallback();
  }, [searchParams, navigate, saveToken]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-bgDark px-4">
      <div className="max-w-md w-full text-center">
        <div className="card">
          {error ? (
            <>
              <div className="text-red-400 text-6xl mb-4">⚠️</div>
              <h2 className="text-2xl font-bold mb-4 text-red-400">Authentication Failed</h2>
              <p className="text-textDim mb-4">{error}</p>
              <p className="text-sm text-textDim">Redirecting to login...</p>
            </>
          ) : (
            <>
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-neonBlue border-t-transparent mx-auto mb-4"></div>
              <h2 className="text-2xl font-bold mb-4">Authenticating...</h2>
              <p className="text-textDim">Please wait while we complete your login</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
