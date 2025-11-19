import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const [language, setLanguage] = useState('en');
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const translations = {
    en: {
      title: 'XeliteSolutions',
      subtitle: 'SOFTWARE ENGINEERING EXCELLENCE',
      hero: 'Transform Your Ideas Into Reality',
      description: 'Advanced AI-powered platform for building exceptional software solutions with cutting-edge technology and intelligent automation.',
      getStarted: 'Get Started',
      learnMore: 'Learn More',
      login: 'Sign In',
      features: {
        title: 'Why Choose XeliteSolutions?',
        ai: {
          title: 'Joe AI Engine',
          desc: 'Advanced AI assistant with 50+ tools for building and developing projects'
        },
        fast: {
          title: 'Lightning Fast',
          desc: 'Real-time processing and instant responses for maximum productivity'
        },
        secure: {
          title: 'Enterprise Security',
          desc: 'Bank-level security with end-to-end encryption and compliance'
        },
        automation: {
          title: 'Smart Automation',
          desc: 'Automate your workflows and boost efficiency with intelligent tools'
        }
      }
    },
    ar: {
      title: 'إكس إليت سوليوشنز',
      subtitle: 'التميز في هندسة البرمجيات',
      hero: 'حول أفكارك إلى واقع',
      description: 'منصة متقدمة مدعومة بالذكاء الاصطناعي لبناء حلول برمجية استثنائية بتقنية متطورة وأتمتة ذكية.',
      getStarted: 'ابدأ الآن',
      learnMore: 'اعرف المزيد',
      login: 'تسجيل الدخول',
      features: {
        title: 'لماذا تختار إكس إليت سوليوشنز؟',
        ai: {
          title: 'محرك جو AI',
          desc: 'مساعد ذكاء اصطناعي متقدم مع 50+ أداة لبناء وتطوير المشاريع'
        },
        fast: {
          title: 'سرعة فائقة',
          desc: 'معالجة فورية واستجابة سريعة لأقصى إنتاجية'
        },
        secure: {
          title: 'أمان مؤسسي',
          desc: 'أمان بمستوى البنوك مع تشفير شامل والتزام كامل'
        },
        automation: {
          title: 'أتمتة ذكية',
          desc: 'أتمت سير عملك وعزز الكفاءة بأدوات ذكية'
        }
      }
    },
    fr: {
      title: 'XeliteSolutions',
      subtitle: 'EXCELLENCE EN GÉNIE LOGICIEL',
      hero: 'Transformez Vos Idées En Réalité',
      description: 'Plateforme avancée alimentée par l\'IA pour créer des solutions logicielles exceptionnelles avec une technologie de pointe et une automatisation intelligente.',
      getStarted: 'Commencer',
      learnMore: 'En Savoir Plus',
      login: 'Se Connecter',
      features: {
        title: 'Pourquoi Choisir XeliteSolutions?',
        ai: {
          title: 'Moteur Joe AI',
          desc: 'Assistant IA avancé avec plus de 50 outils pour créer et développer des projets'
        },
        fast: {
          title: 'Ultra Rapide',
          desc: 'Traitement en temps réel et réponses instantanées pour une productivité maximale'
        },
        secure: {
          title: 'Sécurité Entreprise',
          desc: 'Sécurité bancaire avec chiffrement de bout en bout et conformité'
        },
        automation: {
          title: 'Automatisation Intelligente',
          desc: 'Automatisez vos flux de travail et boostez l\'efficacité avec des outils intelligents'
        }
      }
    },
    es: {
      title: 'XeliteSolutions',
      subtitle: 'EXCELENCIA EN INGENIERÍA DE SOFTWARE',
      hero: 'Transforma Tus Ideas En Realidad',
      description: 'Plataforma avanzada impulsada por IA para crear soluciones de software excepcionales con tecnología de vanguardia y automatización inteligente.',
      getStarted: 'Comenzar',
      learnMore: 'Saber Más',
      login: 'Iniciar Sesión',
      features: {
        title: '¿Por Qué Elegir XeliteSolutions?',
        ai: {
          title: 'Motor Joe AI',
          desc: 'Asistente de IA avanzado con más de 50 herramientas para construir y desarrollar proyectos'
        },
        fast: {
          title: 'Ultra Rápido',
          desc: 'Procesamiento en tiempo real y respuestas instantáneas para máxima productividad'
        },
        secure: {
          title: 'Seguridad Empresarial',
          desc: 'Seguridad de nivel bancario con cifrado de extremo a extremo y cumplimiento'
        },
        automation: {
          title: 'Automatización Inteligente',
          desc: 'Automatiza tus flujos de trabajo y aumenta la eficiencia con herramientas inteligentes'
        }
      }
    }
  };

  const t = translations[language];

  return (
    <div className={`min-h-screen bg-white ${language === 'ar' ? 'rtl' : 'ltr'}`} dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header */}
      <header className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white/98 shadow-lg py-4' : 'bg-white/95 py-6'} backdrop-blur-lg`}>
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          {/* Logo */}
          <div className="flex items-center gap-4 cursor-pointer hover:scale-105 transition-transform">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
              <svg className="w-8 h-8 relative z-10" viewBox="0 0 40 40">
                <line x1="10" y1="10" x2="30" y2="30" className="stroke-white stroke-[4] stroke-linecap-round" strokeDasharray="50" strokeDashoffset="0">
                  <animate attributeName="stroke-dashoffset" values="50;0;50" dur="2s" repeatCount="indefinite" />
                </line>
                <line x1="30" y1="10" x2="10" y2="30" className="stroke-white stroke-[4] stroke-linecap-round" strokeDasharray="50" strokeDashoffset="0">
                  <animate attributeName="stroke-dashoffset" values="50;0;50" dur="2s" begin="0.3s" repeatCount="indefinite" />
                </line>
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-extrabold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {t.title}
              </h1>
              <p className="text-[10px] text-gray-500 font-semibold tracking-widest uppercase">{t.subtitle}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4">
            {/* Language Selector */}
            <div className="relative">
              <button
                onClick={() => setShowLangDropdown(!showLangDropdown)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-semibold text-sm text-gray-700 flex items-center gap-2 transition-all"
              >
                <span className="text-lg">🌐</span>
                {language.toUpperCase()}
                <svg className={`w-4 h-4 transition-transform ${showLangDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showLangDropdown && (
                <div className="absolute top-14 right-0 bg-white rounded-xl shadow-2xl p-2 min-w-[180px] animate-fadeIn">
                  {['en', 'ar', 'fr', 'es'].map((lang) => (
                    <button
                      key={lang}
                      onClick={() => {
                        setLanguage(lang);
                        setShowLangDropdown(false);
                      }}
                      className="w-full px-4 py-3 hover:bg-gray-100 rounded-lg text-left font-medium text-gray-700 flex items-center gap-3 transition-all"
                    >
                      <span className="text-lg">
                        {lang === 'en' ? '🇬🇧' : lang === 'ar' ? '🇸🇦' : lang === 'fr' ? '🇫🇷' : '🇪🇸'}
                      </span>
                      {lang === 'en' ? 'English' : lang === 'ar' ? 'العربية' : lang === 'fr' ? 'Français' : 'Español'}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Login Button */}
            <button
              onClick={() => navigate('/login')}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-lg shadow-lg shadow-blue-500/30 transition-all hover:scale-105"
            >
              {t.login}
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-6xl md:text-7xl font-extrabold mb-6 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent leading-tight">
            {t.hero}
          </h1>
          <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed">
            {t.description}
          </p>
          <div className="flex gap-6 justify-center flex-wrap">
            <button
              onClick={() => navigate('/login')}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-2xl shadow-blue-500/30 transition-all hover:scale-105 text-lg"
            >
              {t.getStarted} →
            </button>
            <button className="px-8 py-4 bg-white hover:bg-gray-50 text-gray-800 font-bold rounded-xl border-2 border-gray-200 transition-all hover:scale-105 text-lg">
              {t.learnMore}
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-extrabold text-center mb-16 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            {t.features.title}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Feature 1 */}
            <div className="p-8 bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all hover:scale-105 border border-gray-100">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-blue-500/30">
                <span className="text-3xl">🤖</span>
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-800">{t.features.ai.title}</h3>
              <p className="text-gray-600 leading-relaxed">{t.features.ai.desc}</p>
            </div>

            {/* Feature 2 */}
            <div className="p-8 bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all hover:scale-105 border border-gray-100">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-purple-500/30">
                <span className="text-3xl">⚡</span>
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-800">{t.features.fast.title}</h3>
              <p className="text-gray-600 leading-relaxed">{t.features.fast.desc}</p>
            </div>

            {/* Feature 3 */}
            <div className="p-8 bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all hover:scale-105 border border-gray-100">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-green-500/30">
                <span className="text-3xl">🔒</span>
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-800">{t.features.secure.title}</h3>
              <p className="text-gray-600 leading-relaxed">{t.features.secure.desc}</p>
            </div>

            {/* Feature 4 */}
            <div className="p-8 bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all hover:scale-105 border border-gray-100">
              <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-pink-500/30">
                <span className="text-3xl">🚀</span>
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-800">{t.features.automation.title}</h3>
              <p className="text-gray-600 leading-relaxed">{t.features.automation.desc}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-gray-400">
            © 2025 XeliteSolutions. All rights reserved. Powered by Joe AI Engine
          </p>
        </div>
      </footer>

      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%) translateY(-100%) rotate(45deg); }
          100% { transform: translateX(100%) translateY(100%) rotate(45deg); }
        }
        .animate-shimmer {
          animation: shimmer 3s infinite;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease;
        }
      `}</style>
    </div>
  );
}
