import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, Zap, Shield, Cpu, ArrowRight, Sparkles } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();
  const [language, setLanguage] = useState('en');

  const translations = {
    en: {
      title: 'xElite Solutions',
      subtitle: 'Advanced AI & Intelligent Systems',
      description: 'Your intelligent partner for building and developing projects with cutting-edge AI technology',
      features: [
        { icon: Cpu, title: 'Joe AI Engine', desc: 'Advanced AI assistant with 50+ tools' },
        { icon: Zap, title: 'Lightning Fast', desc: 'Real-time processing and responses' },
        { icon: Shield, title: 'Secure & Reliable', desc: 'Enterprise-grade security' },
        { icon: Sparkles, title: 'Smart Automation', desc: 'Automate your workflows' }
      ],
      loginBtn: 'Login',
      getStarted: 'Get Started',
      learnMore: 'Learn More'
    },
    ar: {
      title: 'إكس إليت سوليوشنز',
      subtitle: 'الذكاء الاصطناعي المتقدم والأنظمة الذكية',
      description: 'شريكك الذكي لبناء وتطوير المشاريع بتقنية الذكاء الاصطناعي المتطورة',
      features: [
        { icon: Cpu, title: 'محرك جو AI', desc: 'مساعد ذكي متقدم مع أكثر من 50 أداة' },
        { icon: Zap, title: 'سريع كالبرق', desc: 'معالجة واستجابة فورية' },
        { icon: Shield, title: 'آمن وموثوق', desc: 'أمان على مستوى المؤسسات' },
        { icon: Sparkles, title: 'أتمتة ذكية', desc: 'أتمت سير عملك' }
      ],
      loginBtn: 'تسجيل الدخول',
      getStarted: 'ابدأ الآن',
      learnMore: 'اعرف المزيد'
    },
    fr: {
      title: 'xElite Solutions',
      subtitle: 'IA Avancée et Systèmes Intelligents',
      description: 'Votre partenaire intelligent pour construire et développer des projets avec une technologie IA de pointe',
      features: [
        { icon: Cpu, title: 'Moteur Joe AI', desc: 'Assistant IA avancé avec plus de 50 outils' },
        { icon: Zap, title: 'Ultra Rapide', desc: 'Traitement et réponses en temps réel' },
        { icon: Shield, title: 'Sécurisé et Fiable', desc: 'Sécurité de niveau entreprise' },
        { icon: Sparkles, title: 'Automatisation Intelligente', desc: 'Automatisez vos flux de travail' }
      ],
      loginBtn: 'Connexion',
      getStarted: 'Commencer',
      learnMore: 'En savoir plus'
    },
    es: {
      title: 'xElite Solutions',
      subtitle: 'IA Avanzada y Sistemas Inteligentes',
      description: 'Tu socio inteligente para construir y desarrollar proyectos con tecnología IA de vanguardia',
      features: [
        { icon: Cpu, title: 'Motor Joe AI', desc: 'Asistente IA avanzado con más de 50 herramientas' },
        { icon: Zap, title: 'Ultrarrápido', desc: 'Procesamiento y respuestas en tiempo real' },
        { icon: Shield, title: 'Seguro y Confiable', desc: 'Seguridad de nivel empresarial' },
        { icon: Sparkles, title: 'Automatización Inteligente', desc: 'Automatiza tus flujos de trabajo' }
      ],
      loginBtn: 'Iniciar Sesión',
      getStarted: 'Empezar',
      learnMore: 'Saber Más'
    }
  };

  const t = translations[language];

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 text-white ${language === 'ar' ? 'rtl' : 'ltr'}`} dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/50">
              <Cpu className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                xElite Solutions
              </h1>
              <p className="text-xs text-slate-400">AGI Platform</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Language Selector */}
            <div className="flex gap-2">
              {['en', 'ar', 'fr', 'es'].map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    language === lang
                      ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/50'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Login Button */}
            <button
              onClick={() => navigate('/login')}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-lg font-bold shadow-lg shadow-blue-500/50 transition-all transform hover:scale-105"
            >
              {t.loginBtn}
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-block mb-6 px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-full">
            <span className="text-blue-400 text-sm font-semibold">🚀 Powered by Advanced AI</span>
          </div>
          
          <h1 className="text-6xl md:text-7xl font-black mb-6 leading-tight">
            <span className="bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
              {t.title}
            </span>
          </h1>
          
          <h2 className="text-3xl md:text-4xl font-bold text-slate-300 mb-8">
            {t.subtitle}
          </h2>
          
          <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-12 leading-relaxed">
            {t.description}
          </p>

          <div className="flex flex-wrap gap-4 justify-center">
            <button
              onClick={() => navigate('/login')}
              className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-xl font-bold text-lg shadow-2xl shadow-blue-500/50 transition-all transform hover:scale-105 flex items-center gap-2"
            >
              {t.getStarted}
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              className="px-8 py-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-xl font-bold text-lg transition-all"
            >
              {t.learnMore}
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {t.features.map((feature, index) => (
              <div
                key={index}
                className="p-6 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl hover:border-blue-500/50 transition-all hover:transform hover:scale-105"
              >
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-4 shadow-lg shadow-blue-500/50">
                  <feature.icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-slate-400">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-slate-800">
        <div className="max-w-7xl mx-auto text-center text-slate-500">
          <p>© 2025 xElite Solutions. All rights reserved.</p>
          <p className="mt-2 text-sm">Powered by Joe AI Engine</p>
        </div>
      </footer>
    </div>
  );
}
