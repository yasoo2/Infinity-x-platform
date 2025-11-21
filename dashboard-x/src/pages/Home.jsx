import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/home.css';

export default function Home() {
  const navigate = useNavigate();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [language, setLanguage] = useState('en');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const translations = {
    en: {
      title: 'XeliteSolutions',
      subtitle: 'SOFTWARE ENGINEERING EXCELLENCE',
      description: 'Advanced AI-powered platform for building exceptional software solutions with cutting-edge technology and intelligent automation.',
      getStarted: 'Get Started →',
      learnMore: 'Learn More',
      signIn: 'Sign In',
      features: {
        joe: 'Joe AI Engine',
        joeDesc: 'Advanced AI assistant with 50+ tools for building and developing projects',
        fast: 'Lightning Fast',
        fastDesc: 'Real-time processing and instant responses for maximum productivity',
        secure: 'Enterprise Security',
        secureDesc: 'Bank-level security with end-to-end encryption and compliance',
        automation: 'Smart Automation',
        automationDesc: 'Automate your workflows and boost efficiency with intelligent tools'
      },
      login: {
        title: 'Admin Login',
        email: 'Email or Phone',
        password: 'Password',
        signIn: 'Sign In',
        google: 'Sign in with Google',
        close: 'Close'
      }
    },
    ar: {
      title: 'إكس إليت سوليوشنز',
      subtitle: 'تميز الهندسة البرمجية',
      description: 'منصة متقدمة مدعومة بالذكاء الاصطناعي لبناء حلول برمجية استثنائية بأحدث التقنيات والأتمتة الذكية.',
      getStarted: 'ابدأ الآن ←',
      learnMore: 'تعرف أكثر',
      signIn: 'تسجيل الدخول',
      features: {
        joe: 'محرك جو AI',
        joeDesc: 'مساعد ذكي متقدم مع 50+ أداة لبناء وتطوير المشاريع',
        fast: 'سريع جداً',
        fastDesc: 'معالجة فورية واستجابات فورية لأقصى إنتاجية',
        secure: 'أمان المؤسسات',
        secureDesc: 'أمان على مستوى البنك مع التشفير من طرف إلى طرف والامتثال',
        automation: 'أتمتة ذكية',
        automationDesc: 'أتمتة سير عملك وزيادة الكفاءة بأدوات ذكية'
      },
      login: {
        title: 'تسجيل الدخول',
        email: 'البريد الإلكتروني أو الهاتف',
        password: 'كلمة المرور',
        signIn: 'دخول',
        google: 'الدخول عبر جوجل',
        close: 'إغلاق'
      }
    }
  };

  const t = translations[language];

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          password: password,
        }),
      });

      const data = await response.json();

      if (response.ok && data.token) {
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setShowLoginModal(false);
        navigate('/joe');
      } else {
        setError(data.message || 'Login failed. Please try again.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="home-container" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <h1>{t.title}</h1>
          </div>
          <div className="header-actions">
            <select 
              value={language} 
              onChange={(e) => setLanguage(e.target.value)}
              className="language-select"
            >
              <option value="en">🌐 EN</option>
              <option value="ar">العربية</option>
            </select>
            <button 
              onClick={() => setShowLoginModal(true)}
              className="sign-in-btn"
            >
              {t.signIn}
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h2>{t.subtitle}</h2>
          <p>{t.description}</p>
          <div className="hero-buttons">
            <button className="btn-primary">{t.getStarted}</button>
            <button className="btn-secondary">{t.learnMore}</button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <div className="feature-card">
          <div className="feature-icon">🤖</div>
          <h3>{t.features.joe}</h3>
          <p>{t.features.joeDesc}</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">⚡</div>
          <h3>{t.features.fast}</h3>
          <p>{t.features.fastDesc}</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">🔒</div>
          <h3>{t.features.secure}</h3>
          <p>{t.features.secureDesc}</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">🚀</div>
          <h3>{t.features.automation}</h3>
          <p>{t.features.automationDesc}</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <p>© 2025 XeliteSolutions. All rights reserved. Powered by Joe AI Engine</p>
      </footer>

      {/* Login Modal */}
      {showLoginModal && (
        <div className="modal-overlay" onClick={() => setShowLoginModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t.login.title}</h2>
              <button 
                className="modal-close"
                onClick={() => setShowLoginModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleLogin} className="login-form">
              <div className="form-group">
                <label>{t.login.email}</label>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.login.email}
                  required
                />
              </div>

              <div className="form-group">
                <label>{t.login.password}</label>
                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t.login.password}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              {error && <div className="error-message">{error}</div>}

              <button 
                type="submit" 
                className="btn-login"
                disabled={loading}
              >
                {loading ? 'Loading...' : t.login.signIn}
              </button>

              <div className="divider">or</div>

              <button type="button" className="btn-google">
                {t.login.google}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
