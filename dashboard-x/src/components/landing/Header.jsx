
import React, { useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useSimpleAuthContext } from '../../context/SimpleAuthContext';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';

const Header = () => {
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useSimpleAuthContext();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [lang, setLang] = useState(() => {
    try { return localStorage.getItem('lang') === 'ar' ? 'ar' : 'en'; } catch { return 'en'; }
  });
  const [remember, setRemember] = useState(false);
  const [rememberedList, setRememberedList] = useState([]);

  const toggleLang = () => {
    const next = lang === 'ar' ? 'en' : 'ar';
    try { localStorage.setItem('lang', next); } catch { void 0; }
    setLang(next);
    try { window.dispatchEvent(new CustomEvent('joe:lang', { detail: { lang: next } })); } catch { void 0; }
  };

  const handleLogin = async () => {
    if (loggingIn) return;
    setLoggingIn(true);
    setError('');
    try {
      const normalizedEmail = String(email).trim().toLowerCase();
      const ok = await login(normalizedEmail, password, remember);
      if (ok) {
        navigate('/dashboard/joe');
      } else {
        setError(lang === 'ar' ? 'فشل تسجيل الدخول، حاول مرة أخرى' : 'Login failed, please try again');
      }
    } catch (err) {
      const msg = err?.message || (lang === 'ar' ? 'فشل تسجيل الدخول' : 'Login failed');
      setError(msg);
    } finally {
      setLoggingIn(false);
    }
  };

  const refreshRemembered = useCallback(() => {
    setRememberedList([]);
  }, []);

  const handleLoginRemembered = async () => {
    setError(lang === 'ar' ? 'الميزة غير متاحة في وضع المصادقة المبسط' : 'Feature not available in simple auth mode');
  };

  const handleRemoveRemembered = () => { refreshRemembered(); };

  React.useEffect(() => {
    if (showLogin) setRememberedList([]);
  }, [showLogin]);

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
          <div className="flex items-center gap-2">
            <button onClick={toggleLang} className="px-3 py-2 rounded-md bg-gray-800 text-white border border-gray-700 hover:bg-gray-700">
              {lang === 'ar' ? 'AR' : 'EN'}
            </button>
            <button onClick={() => setShowLogin(true)} className="bg-gradient-to-r from-[#4dff91] to-[#3d7eff] text-black font-semibold px-4 py-2 rounded-md shadow hover:opacity-90">{lang === 'ar' ? 'تسجيل دخول الأدمن' : 'Admin Login'}</button>
          </div>
        </div>
      </div>
      {/* Login modal removed; use /login route */}
    </header>
  );
};

export default Header;
