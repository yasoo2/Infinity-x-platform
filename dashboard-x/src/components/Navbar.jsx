import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import React from 'react';
import { useSessionToken } from '../hooks/useSessionToken';
import apiClient from '../api/client';

export default function Navbar({ onToggleJoeScreen }) {
  const { clearToken } = useSessionToken();
  const navigate = useNavigate();
  const [lang, setLang] = React.useState(() => {
    try { return localStorage.getItem('lang') === 'ar' ? 'ar' : 'en'; } catch { return 'en'; }
  });
  const [offlineReady, setOfflineReady] = React.useState(false);

  const [factoryMode, setFactoryMode] = React.useState('online');

  React.useEffect(() => {
    (async () => {
      try {
        const { data } = await apiClient.get('/api/v1/runtime-mode/status');
        if (data?.success && data?.mode) setFactoryMode(data.mode);
        setOfflineReady(Boolean(data?.offlineReady));
      } catch { /* ignore */ }
    })();
  }, []);

  const toggleFactoryMode = async () => {
    try {
      if (factoryMode !== 'offline' && !offlineReady) {
        alert('الوضع الأوفلاين غير جاهز: لم يتم تحميل النموذج المحلي');
        return;
      }
      const { data } = await apiClient.post('/api/v1/runtime-mode/toggle');
      if (data?.success) setFactoryMode(data.mode);
    } catch { /* ignore */ }
  };

  const handleLogout = () => {
    clearToken();
    navigate("/login");
  };

  const handleExitToHome = () => {
    clearToken();
    // Redirect to the root of the domain, which is the public site
    window.location.href = "/";
  };

  const toggleLang = () => {
    const next = lang === 'ar' ? 'en' : 'ar';
    try { localStorage.setItem('lang', next); } catch { void 0; }
    setLang(next);
    try { window.dispatchEvent(new CustomEvent('joe:lang', { detail: { lang: next } })); } catch { void 0; }
  };

  

  return (
    <nav className="bg-gradient-to-r from-gray-900 via-gray-950 to-gray-900 border-b border-gray-800/60 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex w-full">
            <div className="flex-shrink-0 flex items-center">
              <h1 className="text-2xl font-bold">
                <span className="text-neonGreen">Infinity</span>
                <span className="text-neonBlue">X</span>
                <span className="text-textDim text-sm ml-2">Dashboard</span>
              </h1>
            </div>
            {/* قائمة التنقل تم حذفها بناءً على طلب المستخدم */}
          </div>
          <div className="flex items-center space-x-4 ml-auto">
            <button
              onClick={toggleFactoryMode}
              className={`btn-ghost px-4 py-2 text-sm font-medium ${factoryMode==='offline' ? 'bg-green-600 text-white hover:bg-green-700 border-0' : ''} ${(!offlineReady && factoryMode!=='offline') ? 'opacity-60 cursor-not-allowed' : ''}`}
              title={factoryMode==='offline' ? 'وضع المصنع الذاتي مفعل' : 'الوضع السحابي'}
              disabled={!offlineReady && factoryMode!=='offline'}
            >
              {factoryMode==='offline' ? 'مصنع ذاتي' : 'الوضع السحابي'}
            </button>
            <button
              onClick={onToggleJoeScreen}
              className="p-2 text-xl text-neonGreen hover:text-white hover:bg-neonGreen/20 rounded-full transition-all duration-200"
              title="Toggle Joe Screen"
            >
              💻
            </button>
            <button
              onClick={handleExitToHome}
              className="btn-primary px-4 py-2 text-sm font-semibold"
              title="Exit to Home"
            >
              Exit
            </button>
            <button
              onClick={handleLogout}
              className="btn-ghost px-4 py-2 text-sm font-semibold"
            >
              Logout
            </button>
            <button
              onClick={toggleLang}
              className="btn-ghost px-3 py-2 text-sm font-semibold"
              title={lang === 'ar' ? 'AR' : 'EN'}
            >
              {lang === 'ar' ? 'AR' : 'EN'}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

Navbar.propTypes = {
  onToggleJoeScreen: PropTypes.func.isRequired,
};
