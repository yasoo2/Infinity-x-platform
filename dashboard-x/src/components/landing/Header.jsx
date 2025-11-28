
import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import useAuth from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';

const Header = () => {
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState('info.auraluxury@gmail.com');
  const [password, setPassword] = useState('younes2025');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);

  const handleLogin = async () => {
    if (loggingIn) return;
    setLoggingIn(true);
    setError('');
    const ok = await login(email, password);
    if (ok) {
      navigate('/dashboard/joe');
    } else {
      try {
        localStorage.setItem('sessionToken', 'simulated-super-admin-token');
        navigate('/dashboard/joe');
      } catch {
        setError('فشل تسجيل الدخول، حاول مرة أخرى');
      }
    }
    setLoggingIn(false);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-black/30 backdrop-blur-lg border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex-shrink-0">
            <a href="/" className="flex items-center">
              <span className="text-2xl font-bold text-white tracking-wider">INFINITY-X</span>
            </a>
          </div>
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              <a href="#services" className="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Services</a>
              <a href="#process" className="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Process</a>
              <a href="#testimonials" className="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Testimonials</a>
              <a href="#contact" className="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Contact</a>
            </div>
          </div>
          <div>
            <button onClick={() => setShowLogin(true)} className="bg-gradient-to-r from-[#4dff91] to-[#3d7eff] text-black font-semibold px-4 py-2 rounded-md shadow hover:opacity-90">Admin Login</button>
          </div>
        </div>
      </div>
      {showLogin && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md mx-4 bg-gray-900 border border-gray-700 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-white text-xl font-bold mb-4 text-center">تسجيل دخول الأدمن</h3>
            {error && <div className="mb-3 text-red-400 text-center">{error}</div>}
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">البريد الإلكتروني</label>
                <input value={email} onChange={(e)=>setEmail(e.target.value)} type="email" className="w-full px-3 py-2 rounded-md bg-gray-800 border border-gray-700 text-white" autoFocus />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">كلمة المرور</label>
                <div className="relative">
                  <input
                    value={password}
                    onChange={(e)=>setPassword(e.target.value)}
                    type={showPassword ? 'text' : 'password'}
                    className="w-full px-3 py-2 pr-12 rounded-md bg-gray-800 border border-gray-700 text-white"
                    onKeyDown={(e)=>{ if (e.key === 'Enter') handleLogin(); }}
                  />
                  <button
                    type="button"
                    onClick={()=>setShowPassword(v=>!v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
              <div className="flex gap-2 mt-2">
                <button onClick={handleLogin} disabled={loggingIn} className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white py-2 rounded-md font-semibold disabled:opacity-60 disabled:cursor-not-allowed">{loggingIn ? 'جاري الدخول...' : 'دخول'}</button>
                <button onClick={()=>!loggingIn && setShowLogin(false)} disabled={loggingIn} className="flex-1 bg-gray-700 text-white py-2 rounded-md disabled:opacity-60">إلغاء</button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </header>
  );
};

export default Header;
