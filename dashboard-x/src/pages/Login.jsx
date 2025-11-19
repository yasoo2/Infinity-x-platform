import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useSessionToken } from '../hooks/useSessionToken';
import apiClient from '../api/client';

export default function Login() {
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [language, setLanguage] = useState(localStorage.getItem('lang') || 'en'); // Language toggle
  const { saveToken } = useSessionToken();
  const navigate = useNavigate();

  // Comprehensive Translations - English, Arabic, French, Spanish
  const translations = {
    en: {
      emailLabel: 'Email or Phone Number',
      emailPlaceholder: 'example@email.com or +966501234567',
      passwordLabel: 'Password',
      passwordPlaceholder: 'Enter your password',
      loginButton: 'Sign In to Dashboard',
      loggingIn: 'Signing in...',
      googleButton: 'Sign in with Google',
      noAccount: "Don't have an account? ",
      signup: 'Create one',
      copyright: 'InfinityX Platform © 2025',
      poweredBy: 'Powered by JOEngine',
      dashboard: 'Command Center',
      emptyError: 'Please enter email/phone and password',
      loginFailed: 'Login failed. Please try again.',
      badCredentials: 'Invalid email/phone or password',
      serverError: 'Server error. Please try later.',
      connectionError: 'Connection failed. Please check your internet.',
      or: 'or'
    },
    ar: {
      emailLabel: 'البريد الإلكتروني أو رقم الهاتف',
      emailPlaceholder: 'example@email.com أو +966501234567',
      passwordLabel: 'كلمة المرور',
      passwordPlaceholder: 'أدخل كلمة المرور',
      loginButton: 'الدخول إلى لوحة التحكم',
      loggingIn: 'جاري تسجيل الدخول...',
      googleButton: 'تسجيل الدخول باستخدام Google',
      noAccount: 'ليس لديك حساب؟ ',
      signup: 'إنشاء حساب جديد',
      copyright: 'InfinityX Platform © 2025',
      poweredBy: 'Powered by JOEngine',
      dashboard: 'لوحة التحكم - مركز القيادة',
      emptyError: 'يرجى إدخال البريد الإلكتروني/الهاتف وكلمة المرور',
      loginFailed: 'فشل تسجيل الدخول. يرجى المحاولة مرة أخرى.',
      badCredentials: 'البريد الإلكتروني/الهاتف أو كلمة المرور غير صحيحة',
      serverError: 'خطأ في الخادم. يرجى المحاولة لاحقاً.',
      connectionError: 'فشل تسجيل الدخول. يرجى التحقق من الاتصال.',
      or: 'أو'
    },
    fr: {
      emailLabel: 'Email ou Numéro de Téléphone',
      emailPlaceholder: 'example@email.com ou +966501234567',
      passwordLabel: 'Mot de Passe',
      passwordPlaceholder: 'Entrez votre mot de passe',
      loginButton: 'Se Connecter au Tableau de Bord',
      loggingIn: 'Connexion en cours...',
      googleButton: 'Se connecter avec Google',
      noAccount: "Vous n'avez pas de compte? ",
      signup: 'En créer un',
      copyright: 'InfinityX Platform © 2025',
      poweredBy: 'Powered by JOEngine',
      dashboard: 'Centre de Commande',
      emptyError: 'Veuillez entrer l\'email/téléphone et le mot de passe',
      loginFailed: 'Échec de la connexion. Veuillez réessayer.',
      badCredentials: 'Email/téléphone ou mot de passe invalide',
      serverError: 'Erreur du serveur. Veuillez réessayer plus tard.',
      connectionError: 'Échec de la connexion. Vérifiez votre internet.',
      or: 'ou'
    },
    es: {
      emailLabel: 'Correo Electrónico o Número de Teléfono',
      emailPlaceholder: 'example@email.com o +966501234567',
      passwordLabel: 'Contraseña',
      passwordPlaceholder: 'Ingrese su contraseña',
      loginButton: 'Iniciar Sesión en el Panel',
      loggingIn: 'Iniciando sesión...',
      googleButton: 'Iniciar sesión con Google',
      noAccount: '¿No tienes cuenta? ',
      signup: 'Crea una',
      copyright: 'InfinityX Platform © 2025',
      poweredBy: 'Powered by JOEngine',
      dashboard: 'Centro de Control',
      emptyError: 'Ingrese correo/teléfono y contraseña',
      loginFailed: 'Error de inicio de sesión. Intente de nuevo.',
      badCredentials: 'Correo/teléfono o contraseña inválidos',
      serverError: 'Error del servidor. Intente más tarde.',
      connectionError: 'Fallo de conexión. Verifique su internet.',
      or: 'o'
    }
  };

  const t = translations[language];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!emailOrPhone.trim() || !password.trim()) {
      setError(t.emptyError);
      return;
    }
    
    setLoading(true);
    
    try {
      // استدعاء API للمصادقة
      const response = await apiClient.post('/api/v1/auth/login', {
        emailOrPhone: emailOrPhone,
        password: password
      });
      
      if (response.data.success && response.data.token) {
        // حفظ الـ token
        saveToken(response.data.token);
        
        // التوجيه إلى Dashboard
        navigate('/overview');
      } else {
        setError(t.loginFailed);
      }
    } catch (err) {
      console.error('Login error:', err);
      
      if (err.response?.data?.error === 'BAD_CREDENTIALS') {
        setError(t.badCredentials);
      } else if (err.response?.status === 500) {
        setError(t.serverError);
      } else {
        setError(t.connectionError);
      }
    } finally {
      setLoading(false);
    }
  };

  // معالج تسجيل الدخول بجوجل
  const handleGoogleLogin = () => {
    // توجيه إلى endpoint Google OAuth في الواجهة الخلفية
    window.location.href = `${apiClient.defaults.baseURL}/api/v1/auth/google`;
  };

  return (
    <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 px-4 py-12 ${language === 'ar' ? 'rtl' : 'ltr'}`} dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold mb-3">
            <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              Infinity
            </span>
            <span className="bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
              X
            </span>
          </h1>
          <p className="text-slate-400 text-lg">{t.dashboard}</p>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">
              {language === 'en' ? 'Sign In' : 'تسجيل الدخول'}
            </h2>
            <div className="flex gap-2">
              {['en', 'ar', 'fr', 'es'].map((lang) => (
                <button
                  key={lang}
                  onClick={() => {
                    setLanguage(lang);
                    localStorage.setItem('lang', lang);
                  }}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    language === lang
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-700 hover:bg-slate-600 text-white'
                  }`}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm flex items-start gap-2">
              <span className="text-lg">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email or Phone Field */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {t.emailLabel}
              </label>
              <input
                type="text"
                value={emailOrPhone}
                onChange={(e) => setEmailOrPhone(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder={t.emailPlaceholder}
                required
                disabled={loading}
              />
            </div>

            {/* Password Field with Toggle */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {t.passwordLabel}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all pr-12"
                  placeholder={t.passwordPlaceholder}
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {t.loggingIn}
                </span>
              ) : (
                t.loginButton
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-slate-800/50 text-slate-400">{t.or}</span>
            </div>
          </div>

          {/* Google Login Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full py-3 px-4 bg-white hover:bg-gray-100 text-gray-800 font-semibold rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {t.googleButton}
          </button>

          {/* Signup Link */}
          <div className="mt-6 text-center text-sm text-slate-400">
            {t.noAccount}
            <Link to="/signup" className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">
              {t.signup}
            </Link>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-slate-500">
          <p>{t.copyright}</p>
          <p className="mt-1">{t.poweredBy}</p>
        </div>
      </div>
    </div>
  );
}
