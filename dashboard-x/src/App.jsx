import React, { useState, useEffect } from 'react';

// --------- CONFIG ----------
const ADMIN_EMAIL = "info.auraaluxury@gmail.com";
const ADMIN_PASS  = "younes2025";
// 🔗 The real JOE dashboard URL
const JOE_DASHBOARD_URL = "https://admin.xelitesolutions.com";

const i18n = {
  en: {
    nav: { login: "Admin login" },
    hero: {
      badge: "AUTONOMOUS SOFTWARE COMPANY",
      title1: "We design, build and run",
      title2: "systems for the next decade.",
      subtitle: "Xelite Solutions is a global tech studio specialized in high-reliability platforms: websites, admin panels, e-commerce engines, Android & iOS apps, internal tools and AI agents.",
      primary: "What Xelite can build for you",
      secondary: "Why companies trust us"
    },
    sectionAboutTitle: "A focused engineering company",
    sectionAboutText: "We combine senior engineers, strong processes and autonomous agents (JOE) to ship reliable systems for clients who care about quality.",
    list: [
      "We hire and test engineers for deep problem-solving and clean architecture.",
      "We treat each product as a long-term asset: maintainable, observable and ready to grow.",
      "We build reusable templates for web, apps, e-commerce and internal tools.",
      "We integrate with GitHub, CI/CD, monitoring and security from day one."
    ],
    stats: {
      clients: "Active clients",
      systems: "Systems launched",
      uptime: "Avg. uptime",
      regions: "Regions served"
    },
    login: {
      title: "Admin access",
      subtitle: "Secure entrance to the Xelite / JOE control room.",
      emailTab: "Email",
      phoneTab: "Phone",
      googleTab: "Google",
      githubTab: "GitHub",
      emailLabel: "Work email",
      passLabel: "Password",
      passPlaceholder: "Enter your secure password",
      signin: "Sign in",
      phoneInfo: "Use your verified mobile number to receive a one-time security code.",
      phoneLabel: "Mobile number",
      sendCode: "Send code",
      verifyCode: "Verify & continue",
      googleBtn: "Continue with Google",
      githubBtn: "Continue with GitHub",
      errorInvalid: "Access denied. Check your email and password."
    }
  },
  ar: {
    nav: { login: "دخول المشرفين" },
    hero: {
      badge: "شركة برمجيات ذاتية متطورة",
      title1: "نصمم ونبني وندير",
      title2: "أنظمة للسنوات القادمة.",
      subtitle: "Xelite Solutions شركة تقنية عالمية متخصصة في الأنظمة عالية الاعتمادية: مواقع إنترنت، لوحات تحكّم، متاجر إلكترونية، تطبيقات أندرويد و iOS، أدوات داخلية ووكلاء ذكاء اصطناعي.",
      primary: "ماذا تستطيع Xelite أن تبني؟",
      secondary: "لماذا يثق بنا العملاء؟"
    },
    sectionAboutTitle: "شركة هندسة مركّزة",
    sectionAboutText: "نمزج بين مهندسين ذوي خبرة، عمليات قوية ووكلاء ذاتيين (JOE) لنقدّم أنظمة موثوقة لعملاء يهتمون بالجودة.",
    list: [
      "نختبر ونختار المهندسين بناءً على العمق في الحلّ والهندسة النظيفة.",
      "نتعامل مع كل نظام كأصل طويل الأمد: قابل للصيانة، قابل للمراقبة، وقابل للنمو.",
      "نبني قوالب جاهزة لمواقع، تطبيقات، متاجر وأدوات داخلية.",
      "نربط مع GitHub و CI/CD والمراقبة والأمن من اليوم الأول."
    ],
    stats: {
      clients: "عملاء نشطون",
      systems: "أنظمة منشورة",
      uptime: "متوسط التوافر",
      regions: "مناطق الخدمة"
    },
    login: {
      title: "دخول المشرف",
      subtitle: "بوابة آمنة إلى غرفة تحكم Xelite / JOE.",
      emailTab: "البريد",
      phoneTab: "الهاتف",
      googleTab: "Google",
      githubTab: "GitHub",
      emailLabel: "البريد الوظيفي",
      passLabel: "كلمة المرور",
      passPlaceholder: "أدخل كلمة المرور الآمنة",
      signin: "تسجيل الدخول",
      phoneInfo: "استخدم رقم هاتفك الموثق لاستلام رمز أمان لمرة واحدة.",
      phoneLabel: "رقم الجوال",
      sendCode: "إرسال الرمز",
      verifyCode: "تأكيد ومتابعة",
      googleBtn: "المتابعة عبر Google",
      githubBtn: "المتابعة عبر GitHub",
      errorInvalid: "تم رفض الوصول. تحقق من البريد وكلمة المرور."
    }
  }
};

function t(path, currentLang) {
  const dict = i18n[currentLang] || i18n.en;
  const fromCurrent = path.split(".").reduce((o, k) => (o && o[k] !== undefined) ? o[k] : null, dict);
  if (fromCurrent !== null && fromCurrent !== undefined) return fromCurrent;
  const fromEn = path.split(".").reduce((o, k) => (o && o[k] !== undefined) ? o[k] : null, i18n.en);
  return fromEn || "";
}

export default function App() {
  const [currentLang, setCurrentLang] = useState("en");
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [authMode, setAuthMode] = useState("email");
  const [loginError, setLoginError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    document.body.className = currentLang === "ar" ? "rtl" : "";
  }, [currentLang]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (email.toLowerCase() === ADMIN_EMAIL.toLowerCase() && password === ADMIN_PASS) {
      window.location.href = JOE_DASHBOARD_URL;
    } else {
      setLoginError(t("login.errorInvalid", currentLang));
    }
  };

  const handlePhoneLogin = (e) => {
    e.preventDefault();
    alert("Phone login is a UI placeholder. Connect it to your backend later.");
  };

  const L = i18n[currentLang] || i18n.en;
  
  return (
    <div className="min-h-screen font-sans text-slate-900 bg-[#EEF2FF]">
      {/* NAV */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="logo-mark">
              <div className="logo-mark-inner">Xe</div>
            </div>
            <div className="leading-tight">
              <div className="text-xs font-black tracking-[0.3em] uppercase">XELITE</div>
              <div className="text-[9px] text-slate-500 tracking-[0.25em] uppercase">Solutions</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={currentLang}
              onChange={(e) => setCurrentLang(e.target.value)}
              className="border border-slate-300 rounded-full text-[11px] px-3 py-1.5 bg-white text-slate-700 outline-none cursor-pointer hover:border-blue-500 transition-colors"
            >
              <option value="en">EN</option>
              <option value="ar">AR</option>
              <option value="fr">FR</option>
              <option value="es">ES</option>
              <option value="de">DE</option>
            </select>
            <button
              onClick={() => { setLoginError(""); setIsLoginOpen(true); }}
              className="hidden sm:inline-flex items-center gap-2 btn-ghost px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em]"
            >
              <i className="ph-bold ph-lock-simple text-xs"></i>
              <span>{L.nav.login}</span>
            </button>
            <button
              onClick={() => { setLoginError(""); setIsLoginOpen(true); }}
              className="sm:hidden inline-flex items-center justify-center w-8 h-8 rounded-full border border-slate-300 bg-white"
            >
              <i className="ph-bold ph-lock-key-open text-sm"></i>
            </button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <main className="pt-10 pb-16">
        <section className="max-w-6xl mx-auto px-4 sm:px-6 grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] items-center">
          <div className="fade-in">
            <div className="pill inline-flex items-center gap-2 px-3 py-1 mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span className="text-[10px] tracking-[0.25em] uppercase text-slate-600">{L.hero.badge}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black leading-tight text-slate-900">
              {L.hero.title1}
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-sky-600 via-sky-500 to-indigo-500">
                {L.hero.title2}
              </span>
            </h1>
            <p className="mt-4 text-[14px] sm:text-[15px] text-slate-600 leading-relaxed max-w-xl">
              {L.hero.subtitle}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button className="btn-primary px-6 py-2.5 text-[11px] font-semibold uppercase tracking-[0.2em]">
                {L.hero.primary}
              </button>
              <button className="btn-ghost px-6 py-2.5 text-[11px] font-semibold uppercase tracking-[0.2em]">
                {L.hero.secondary}
              </button>
            </div>
            <div className="mt-7 grid grid-cols-2 sm:grid-cols-4 gap-5 text-center text-[11px] text-slate-600">
              <div>
                <div className="text-xl font-semibold text-slate-900">40+</div>
                <div className="mt-1">{L.stats.clients}</div>
              </div>
              <div>
                <div className="text-xl font-semibold text-slate-900">120+</div>
                <div className="mt-1">{L.stats.systems}</div>
              </div>
              <div>
                <div className="text-xl font-semibold text-slate-900">99.9%</div>
                <div className="mt-1">{L.stats.uptime}</div>
              </div>
              <div>
                <div className="text-xl font-semibold text-slate-900">8+</div>
                <div className="mt-1">{L.stats.regions}</div>
              </div>
            </div>
          </div>

          {/* RIGHT: visual stack */}
          <div className="fade-in">
            <div className="visual-stack">
              <div className="visual-screen-main">
                <div className="visual-screen-header">
                  <div className="visual-dots">
                    <span className="visual-dot" style={{ background: "#F97373" }}></span>
                    <span className="visual-dot" style={{ background: "#FACC15" }}></span>
                    <span className="visual-dot" style={{ background: "#22C55E" }}></span>
                  </div>
                  <span className="visual-pill">XELITE • CONTROL FABRIC</span>
                </div>
                <div className="visual-columns">
                  <div className="visual-sidebar">
                    <div className="visual-sidebar-item active">
                      <div className="visual-badge">●</div>
                      <span>Client Portals</span>
                    </div>
                    <div className="visual-sidebar-item">
                      <i className="ph-bold ph-shopping-cart-simple text-[13px] text-sky-400"></i>
                      <span>Stores & Checkout</span>
                    </div>
                    <div className="visual-sidebar-item">
                      <i className="ph-bold ph-device-mobile-camera text-[13px] text-indigo-400"></i>
                      <span>Mobile Apps</span>
                    </div>
                    <div className="visual-sidebar-item">
                      <i className="ph-bold ph-brain text-[13px] text-emerald-400"></i>
                      <span>Agents & Tools</span>
                    </div>
                  </div>
                  <div className="visual-main-card">
                    <div className="visual-row">
                      <span className="text-[10px] text-sky-200 font-mono">/admin/overview</span>
                      <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        Live
                      </span>
                    </div>
                    <div className="visual-row">
                      <span className="text-[11px] text-slate-100">Production platforms</span>
                      <span className="text-[11px] text-sky-300 font-mono">26 running</span>
                    </div>
                    <div className="visual-chip-row">
                      <span className="visual-chip">Web • Dashboards</span>
                      <span className="visual-chip">E-commerce</span>
                      <span className="visual-chip">Android / iOS</span>
                      <span className="visual-chip">Internal tools</span>
                      <span className="visual-chip">Monitoring</span>
                    </div>
                    <div className="visual-tiles">
                      <div className="visual-tile" style={{ background: "linear-gradient(145deg,#0EA5E9,#1D4ED8)" }}>
                        <div className="visual-tile-inner">
                          <span className="text-[9px] uppercase tracking-[0.18em] text-blue-100">Web</span>
                          <span className="text-[11px] font-semibold">Marketing & client portals</span>
                        </div>
                      </div>
                      <div className="visual-tile" style={{ background: "linear-gradient(145deg,#22C55E,#15803D)" }}>
                        <div className="visual-tile-inner">
                          <span className="text-[9px] uppercase tracking-[0.18em] text-emerald-100">Commerce</span>
                          <span className="text-[11px] font-semibold">Stores, checkout & payments</span>
                        </div>
                      </div>
                      <div className="visual-tile" style={{ background: "linear-gradient(145deg,#6366F1,#0F172A)" }}>
                        <div className="visual-tile-inner">
                          <span className="text-[9px] uppercase tracking-[0.18em] text-indigo-100">Apps & AI</span>
                          <span className="text-[11px] font-semibold">Mobile + internal agents</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="visual-tag-ai">
                  <span className="visual-tag-dot"></span>
                  <span className="font-mono">JOE: watching deployments</span>
                </div>

                <div className="visual-phone">
                  <div className="visual-phone-screen">
                    <div className="visual-phone-header">
                      <span className="text-[9px]">Xelite Mobile</span>
                      <span className="visual-phone-badge">Admin</span>
                    </div>
                    <div className="visual-phone-block">
                      <div className="flex justify-between text-[10px] text-slate-100">
                        <span>Today’s orders</span>
                        <span className="font-mono text-emerald-400">+38</span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-slate-700 overflow-hidden">
                        <div className="h-full w-3/4 bg-emerald-400"></div>
                      </div>
                    </div>
                    <div className="visual-phone-block">
                      <div className="flex items-center justify-between text-[10px] text-slate-100">
                        <span>System health</span>
                        <span className="font-mono text-sky-300">99.9%</span>
                      </div>
                      <div className="mt-1 flex gap-3 text-[9px] text-slate-300">
                        <span>API</span><span>Jobs</span><span>Storefront</span>
                      </div>
                    </div>
                    <div className="mt-auto text-[9px] text-slate-300 font-mono">
                      &gt; joe: “All regions stable.”
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ABOUT / WHY XELITE */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 mt-12">
          <div className="card p-5 sm:p-7">
            <div className="grid gap-6 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
              <div>
                <h2 className="text-base sm:text-lg font-semibold text-slate-900">{L.sectionAboutTitle}</h2>
                <p className="mt-2 text-[13px] text-slate-600">{L.sectionAboutText}</p>
                <ul className="mt-4 space-y-2.5">
                  {(L.list || []).map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-[13px] text-slate-600">
                      <span className="mt-[3px] text-emerald-500"><i className="ph-bold ph-check-circle"></i></span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="border border-dashed border-slate-300 rounded-xl px-4 py-4 bg-slate-50">
                <div className="text-[11px] font-mono text-slate-500 mb-2">JOE • INTERNAL AGENT</div>
                <div className="text-[12px] bg-slate-900 text-slate-50 rounded-lg px-3 py-2 font-mono">
                  <div>&gt; sync(github: "Infinity-x-platform")</div>
                  <div>&gt; review(pipelines, alerts, errors)</div>
                  <div>&gt; propose(improvements)</div>
                </div>
                <p className="mt-3 text-[12px] text-slate-500">
                  Joe acts as an internal engineer that reads your codebase, checks environments and helps the human team keep everything healthy.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* LOGIN MODAL */}
      {isLoginOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 backdrop-blur-sm transition-opacity">
          <div className="card max-w-md w-full p-5 sm:p-6 relative fade-in shadow-2xl">
            <button
              onClick={() => setIsLoginOpen(false)}
              className={`absolute top-3 ${currentLang === 'ar' ? 'left-3' : 'right-3'} text-slate-400 hover:text-slate-600 transition-colors`}
            >
              <i className="ph-bold ph-x text-lg"></i>
            </button>
            <div className="mb-4">
              <div className="flex items-center gap-3 mb-1">
                <div className="logo-mark" style={{ width: 32, height: 32 }}>
                  <div className="logo-mark-inner" style={{ width: 18, height: 18, fontSize: 9 }}>Xe</div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.25em] text-slate-500">Xelite • Admin</div>
                  <div className="text-sm font-semibold text-slate-900">{L.login.title}</div>
                </div>
              </div>
              <p className="text-[11px] text-slate-500">{L.login.subtitle}</p>
            </div>

            {loginError && (
              <div className="mb-3 text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-center gap-2 animate-pulse">
                <i className="ph-bold ph-warning-circle"></i>
                {loginError}
              </div>
            )}

            {/* Tabs */}
            <div className="flex border-b border-slate-200 mb-4 text-[11px] font-semibold tracking-[0.18em] uppercase">
              <button
                onClick={() => setAuthMode('email')}
                className={`flex-1 pb-3 transition-colors ${authMode === 'email' ? 'text-sky-600 border-b-2 border-sky-500' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {L.login.emailTab}
              </button>
              <button
                onClick={() => setAuthMode('phone')}
                className={`flex-1 pb-3 transition-colors ${authMode === 'phone' ? 'text-sky-600 border-b-2 border-sky-500' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {L.login.phoneTab}
              </button>
              <button
                onClick={() => setAuthMode('google')}
                className={`hidden sm:block flex-1 pb-3 transition-colors ${authMode === 'google' ? 'text-sky-600 border-b-2 border-sky-500' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {L.login.googleTab}
              </button>
              <button
                onClick={() => setAuthMode('github')}
                className={`hidden sm:block flex-1 pb-3 transition-colors ${authMode === 'github' ? 'text-sky-600 border-b-2 border-sky-500' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {L.login.githubTab}
              </button>
            </div>

            {/* Content */}
            {authMode === 'email' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">{L.login.emailLabel}</label>
                  <input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border border-slate-300 focus:border-sky-500 focus:ring-1 focus:ring-sky-300 outline-none rounded-lg px-3 py-2.5 text-sm transition-all"
                    placeholder="you@xelitesolutions.com"
                  />
                </div>
                <div className="relative">
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">{L.login.passLabel}</label>
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full border border-slate-300 focus:border-sky-500 focus:ring-1 focus:ring-sky-300 outline-none rounded-lg px-3 py-2.5 text-sm pr-9 transition-all"
                    placeholder={L.login.passPlaceholder}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute inset-y-7 ${currentLang === 'ar' ? 'left-3' : 'right-3'} flex items-center text-slate-400 hover:text-slate-700`}
                  >
                    <i className={`ph-bold ${showPassword ? 'ph-eye-slash' : 'ph-eye'} text-lg`}></i>
                  </button>
                </div>
                <button type="submit" className="btn-primary w-full py-2.5 text-[11px] font-semibold uppercase tracking-[0.2em]">
                  {L.login.signin}
                </button>
              </form>
            )}

            {authMode === 'phone' && (
              <form onSubmit={handlePhoneLogin} className="space-y-4">
                <p className="text-[11px] text-slate-500">{L.login.phoneInfo}</p>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">{L.login.phoneLabel}</label>
                  <input
                    type="tel"
                    className="w-full border border-slate-300 focus:border-sky-500 focus:ring-1 focus:ring-sky-300 outline-none rounded-lg px-3 py-2.5 text-sm transition-all"
                    placeholder="+90 5xx xxx xx xx"
                  />
                </div>
                <button type="submit" className="btn-primary w-full py-2.5 text-[11px] font-semibold uppercase tracking-[0.2em]">
                  {L.login.sendCode}
                </button>
              </form>
            )}

            {authMode === 'google' && (
              <div className="space-y-3">
                <button className="w-full border border-slate-300 bg-white hover:bg-slate-50 rounded-lg py-2.5 text-[11px] font-semibold uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-colors">
                  <i className="ph-bold ph-google-logo text-red-500 text-lg"></i>
                  {L.login.googleBtn}
                </button>
                <p className="text-[11px] text-slate-500 text-center">
                  Connect this button to your Google OAuth flow in the backend.
                </p>
              </div>
            )}

            {authMode === 'github' && (
              <div className="space-y-3">
                <button className="w-full border border-slate-800 bg-slate-900 hover:bg-slate-800 text-white rounded-lg py-2.5 text-[11px] font-semibold uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-colors">
                  <i className="ph-bold ph-github-logo text-lg"></i>
                  {L.login.githubBtn}
                </button>
                <p className="text-[11px] text-slate-500 text-center">
                  Later you can bind this to GitHub OAuth or a GitHub App for JOE access.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
