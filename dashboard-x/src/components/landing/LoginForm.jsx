import React, { useState } from 'react';
import useAuth from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const [remember, setRemember] = useState(true);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const success = await login(email, password, remember);
      if (success) {
        navigate('/dashboard/joe');
      } else {
        try {
          const offline = localStorage.getItem('apiOffline') === '1';
          if (offline) setError('الخادم غير متاح حاليًا. يرجى المحاولة لاحقًا.');
          else setError('فشل تسجيل الدخول. تحقق من بيانات الاعتماد.');
        } catch {
          setError('Login failed. Please check your credentials.');
        }
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred.');
    }
  };

  return (
    <div className="flex justify-center items-center h-screen bg-gray-900">
      <form onSubmit={handleSubmit} className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-sm">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">Login</h2>
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
        <div className="mb-4">
          <label className="block text-gray-300 mb-2" htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-blue-500"
            required
          />
        </div>
        <div className="mb-6">
          <label className="block text-gray-300 mb-2" htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-blue-500"
            required
          />
        </div>
        <div className="flex items-center mb-6">
          <input id="remember" type="checkbox" checked={remember} onChange={(e)=>setRemember(e.target.checked)} className="mr-2 accent-blue-600" />
          <label htmlFor="remember" className="text-gray-300 text-sm">تذكر هذا المستخدم</label>
        </div>
        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
        >
          تسجيل الدخول
        </button>
      </form>
    </div>
  );
};

export default LoginForm;
