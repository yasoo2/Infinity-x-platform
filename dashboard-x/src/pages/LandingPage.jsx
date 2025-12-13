import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LoginCard from '../components/auth/LoginCard';
import { FiLogIn, FiZap, FiGlobe, FiUsers, FiAward } from 'react-icons/fi';

const LandingPage = () => {
  const navigate = useNavigate();
  const [showLogin, setShowLogin] = useState(false);
  const [diagRunning, setDiagRunning] = useState(false);
  const [diagLogs, setDiagLogs] = useState([]);

  const handleLoginClick = () => {
    setShowLogin(true);
  };

  const handleLoginSuccess = (user) => {
    try { setShowLogin(false); } catch { /* noop */ }
    navigate('/dashboard/joe');
  };

  const handleLoginError = () => {
    // keep modal open, error shown inside LoginCard
  };

  const pushLog = (msg) => setDiagLogs((prev) => [...prev, { ts: Date.now(), msg }].slice(-12));
  const normalizeApiBase = () => {
    let base = localStorage.getItem('apiBaseUrl');
    try {
      if (!base || !String(base).trim()) base = (typeof window !== 'undefined' ? window.location.origin : '') + '/api/v1';
      try {
        const u = new URL(String(base)); const host = u.hostname;
        if (host === 'www.xelitesolutions.com' || host === 'xelitesolutions.com') base = 'https://api.xelitesolutions.com/api/v1';
      } catch { /* noop */ }
      const hasV1 = /\/api\/v1$/i.test(String(base));
      if (!hasV1) base = String(base).replace(/\/+$/,'') + '/api/v1';
    } catch { base = '/api/v1'; }
    return String(base).replace(/\/+$/,'');
  };
  const runAdminDiagnostic = async () => {
    if (diagRunning) return;
    setDiagRunning(true); setDiagLogs([]);
    try {
      const base = normalizeApiBase();
      pushLog(`base=${base}`);
      const email = 'info.auraaluxury@gmail.com';
      const password = 'younes2025';
      const r1 = await fetch(`${base}/auth/simple-login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, rememberMe: true }), credentials: 'include' });
      const d1 = await r1.json();
      if (!r1.ok || !d1.ok || !d1.token) throw new Error(d1.error || 'simple-login failed');
      pushLog('simple-login ok');
      try { localStorage.setItem('sessionToken', d1.token); localStorage.setItem('simple_auth_token', d1.token); localStorage.setItem('simple_user_data', JSON.stringify(d1.user)); } catch { /* noop */ }
      const r2 = await fetch(`${base}/auth/validate`, { headers: { Authorization: `Bearer ${d1.token}` }, credentials: 'include' });
      const d2 = await r2.json();
      if (!r2.ok || !(d2.success || d2.ok)) throw new Error(d2.error || 'validate failed');
      pushLog('validate ok');
      const r3 = await fetch(`${base}/joe/ping`);
      const t3 = await r3.text();
      if (!r3.ok || !/pong/.test(String(t3))) throw new Error('joe ping failed');
      pushLog('joe ping ok');
      await new Promise((resolve) => {
        let done = false; const es = new EventSource(`${base}/joe/events`, { withCredentials: true });
        const tidy = () => { if (done) return; done = true; try { es.close(); } catch { /* noop */ } resolve(); };
        es.addEventListener('init', () => { pushLog('events init'); tidy(); });
        es.addEventListener('error', () => tidy());
        setTimeout(tidy, 3000);
      });
      pushLog('events ok');
      setShowLogin(false);
      navigate('/dashboard/joe');
    } catch (e) {
      pushLog(`error: ${e?.message || e}`);
    } finally {
      setDiagRunning(false);
    }
  };

  const features = [
    {
      icon: <FiZap className="w-8 h-8 text-blue-600" />,
      title: "Fast Performance",
      description: "Lightning-fast response times with optimized architecture"
    },
    {
      icon: <FiGlobe className="w-8 h-8 text-blue-600" />,
      title: "Global Access",
      description: "Access your dashboard from anywhere in the world"
    },
    {
      icon: <FiUsers className="w-8 h-8 text-blue-600" />,
      title: "Team Collaboration",
      description: "Work together seamlessly with your team members"
    },
    {
      icon: <FiAward className="w-8 h-8 text-blue-600" />,
      title: "Premium Features",
      description: "Advanced tools and capabilities for power users"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <header className="relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                <FiZap className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-white">XElite Solutions</span>
            </div>
            
            <button
              onClick={handleLoginClick}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 flex items-center space-x-2 focus:ring-4 focus:ring-blue-500 focus:ring-opacity-50"
            >
              <FiLogIn className="w-5 h-5" />
              <span>Login</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center space-y-8">
            <div className="space-y-4">
              <h1 className="text-5xl md:text-7xl font-bold text-white">
                Welcome to
                <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent"> Joe Dashboard</span>
              </h1>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
                Experience the next generation of dashboard management with our powerful, 
                intuitive, and beautifully designed interface. Built for professionals who demand excellence.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleLoginClick}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-4 rounded-lg font-medium text-lg transition-all duration-200 transform hover:scale-105 flex items-center justify-center space-x-2 focus:ring-4 focus:ring-blue-500 focus:ring-opacity-50"
              >
                <FiLogIn className="w-6 h-6" />
                <span>Get Started</span>
              </button>
              
              <button className="border-2 border-gray-600 hover:border-gray-500 text-gray-300 hover:text-white px-8 py-4 rounded-lg font-medium text-lg transition-all duration-200 transform hover:scale-105 focus:ring-4 focus:ring-gray-500 focus:ring-opacity-50">
                Learn More
              </button>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Premium Features</h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Everything you need to manage your projects efficiently and effectively
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 space-y-4 hover:bg-white/15 transition-all duration-300 transform hover:scale-105"
              >
                <div className="flex justify-center">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-white text-center">{feature.title}</h3>
                <p className="text-gray-300 text-center">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <JoeConsole />
        </div>
      </main>

      {showLogin && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md mx-4 relative">
            <button onClick={()=>setShowLogin(false)} className="absolute -top-3 -right-3 bg:white/10 border border-white/20 text-white rounded-full w-10 h-10">×</button>
            <LoginCard onSuccess={handleLoginSuccess} onError={handleLoginError} className="bg-transparent min-h-0" />
            <div className="mt-4 bg-white/10 border border-white/20 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-white text-sm">تشخيص الدخول</div>
                <button onClick={runAdminDiagnostic} disabled={diagRunning} className="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-50">{diagRunning ? 'جاري الفحص...' : 'بدء الفحص'}</button>
              </div>
              <div className="max-h-28 overflow-auto space-y-1 text-xs text-gray-200">
                {diagLogs.map((l,i)=>(<div key={i}><span className="text-gray-400 mr-1">{new Date(l.ts).toLocaleTimeString()}</span>{l.msg}</div>))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-400">
            <p>&copy; 2024 XElite Solutions. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-gradient-to-r from-blue-400/30 to-purple-400/30 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-gradient-to-r from-purple-400/30 to-pink-400/30 rounded-full mix-blend-multiply filter blur-3xl animate-pulse animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-gradient-to-r from-cyan-400/20 to-blue-400/20 rounded-full mix-blend-multiply filter blur-3xl animate-pulse animation-delay-4000"></div>
      </div>
    </div>
  );
};

const JoeConsole = () => {
  const [instruction, setInstruction] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState('');
  const [toolsUsed, setToolsUsed] = useState([]);
  const [error, setError] = useState('');
  const [provider, setProvider] = useState('');
  const [model, setModel] = useState('');
  const [events, setEvents] = useState([]);
  useEffect(() => {
    let base = localStorage.getItem('apiBaseUrl');
    try {
      if (!base || !String(base).trim()) {
        base = (typeof window !== 'undefined' ? window.location.origin : '') + '/api/v1';
      }
      try {
        const u = new URL(String(base));
        const host = u.hostname;
        if (host === 'www.xelitesolutions.com' || host === 'xelitesolutions.com') {
          base = 'https://api.xelitesolutions.com/api/v1';
        }
      } catch { /* noop */ }
      const hasV1 = /\/api\/v1$/i.test(String(base));
      if (!hasV1) base = String(base).replace(/\/+$/,'') + '/api/v1';
    } catch { base = '/api/v1'; }
    const url = `${String(base).replace(/\/+$/,'')}/joe/events`;
    let es;
    try {
      es = new EventSource(url, { withCredentials: true });
      es.addEventListener('progress', (ev) => {
        try { const d = JSON.parse(ev.data); setEvents((prev) => [{ type: 'progress', d, ts: Date.now() }, ...prev].slice(0, 50)); } catch { /* noop */ }
      });
      es.addEventListener('error', (ev) => {
        try { const d = JSON.parse(ev.data); setEvents((prev) => [{ type: 'error', d, ts: Date.now() }, ...prev].slice(0, 50)); } catch { /* noop */ }
      });
      es.addEventListener('tool_used', (ev) => {
        try { const d = JSON.parse(ev.data); setEvents((prev) => [{ type: 'tool', d, ts: Date.now() }, ...prev].slice(0, 50)); } catch { /* noop */ }
      });
      es.addEventListener('thought', (ev) => {
        try { const d = JSON.parse(ev.data); setEvents((prev) => [{ type: 'thought', d, ts: Date.now() }, ...prev].slice(0, 50)); } catch { /* noop */ }
      });
    } catch { /* noop */ }
    return () => { try { es && es.close(); } catch { /* noop */ } };
  }, []);
  const submit = async () => {
    try {
      setLoading(true);
      setError('');
      setResponse('');
      setToolsUsed([]);
      const body = { instruction };
      if (provider) body.provider = provider;
      if (model) body.model = model;
      let base = localStorage.getItem('apiBaseUrl');
      try {
        if (!base || !String(base).trim()) {
          base = (typeof window !== 'undefined' ? window.location.origin : '') + '/api/v1';
        }
        try {
          const u = new URL(String(base));
          const host = u.hostname;
          if (host === 'www.xelitesolutions.com' || host === 'xelitesolutions.com') {
            base = 'https://api.xelitesolutions.com/api/v1';
          }
        } catch { /* noop */ }
        const hasV1 = /\/api\/v1$/i.test(String(base));
        if (!hasV1) base = String(base).replace(/\/+$/,'') + '/api/v1';
      } catch { base = '/api/v1'; }
      const url = `${String(base).replace(/\/+$/,'')}/joe/execute`;
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), credentials: 'include' });
      const data = await r.json();
      if (!r.ok || !data.success) {
        throw new Error(data.error || 'REQUEST_FAILED');
      }
      setResponse(String(data.response || ''));
      setToolsUsed(Array.isArray(data.toolsUsed) ? data.toolsUsed : []);
    } catch (e) {
      setError(e.message || 'REQUEST_FAILED');
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 backdrop-blur-sm border border-white/20 rounded-2xl p-6 md:p-8">
      <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">Joe Command Console</h2>
      <p className="text-gray-300 mb-6">اكتب تعليماتك وسيقوم جو بتحليلها وتقسيمها واختيار الأدوات المناسبة وتنفيذها.</p>
      <div className="space-y-4">
        <textarea value={instruction} onChange={e=>setInstruction(e.target.value)} className="w-full h-32 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="مثال: حلل موقع https://xelitesolutions.com وابحث عن المشاكل التقنية" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input value={provider} onChange={e=>setProvider(e.target.value)} placeholder="provider (openai|gemini)" className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          <input value={model} onChange={e=>setModel(e.target.value)} placeholder="model (gpt-4o|gemini-1.5-pro-latest)" className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          <button onClick={submit} disabled={loading || !instruction.trim()} className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 disabled:opacity-50">{loading ? 'تشغيل...' : 'تشغيل'}</button>
        </div>
        {error && <div className="px-4 py-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300">{error}</div>}
        {response && (
          <div className="space-y-3">
            <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-gray-100 whitespace-pre-wrap">{response}</div>
            <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-gray-300">
              <span className="font-semibold text-white">الأدوات المستخدمة:</span>
              <span className="ml-2">{toolsUsed.length ? toolsUsed.join(', ') : 'بدون'}</span>
            </div>
          </div>
        )}
        <div className="mt-6">
          <h3 className="text-white font-semibold mb-2">البث الحي</h3>
          <div className="space-y-2 max-h-64 overflow-auto">
            {events.length === 0 ? (
              <div className="text-gray-400">لا توجد أحداث بعد.</div>
            ) : (
              events.map((ev, idx) => (
                <div key={idx} className="px-3 py-2 bg-white/5 border border-white/10 rounded text-gray-200">
                  <span className="text-xs text-gray-400 mr-2">{new Date(ev.ts).toLocaleTimeString()}</span>
                  <span className="text-blue-300 mr-2">{ev.type}</span>
                  <span className="text-gray-100">{String(ev?.d?.message || ev?.d?.content || ev?.d?.summary || '')}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage
