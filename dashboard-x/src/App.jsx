import React, { useState, useEffect } from 'react';

// --------- CONFIG ----------
const ADMIN_EMAIL = "info.auraaluxury@gmail.com";
const ADMIN_PASS  = "younes2025";
// 🔗 The real JOE dashboard URL - Ensure this matches your actual admin URL
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
    document.body.dir = currentLang === "ar" ? "rtl" : "ltr";
  }, [currentLang]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase() && password === ADMIN_PASS) {
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
    <div className="min-h-screen font-sans text-slate-900 bg-[#EEF2FF] overflow-x-hidden">
      {/* NAV */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="logo-mark w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 shadow-lg shadow-blue-500/30">
              <div className="logo-mark-inner w-6 h-6 bg-white rounded-lg flex items-center justify-center text-[10px] font-black text-blue-600">
                Xe
              </div>
            </div>
            <div className="leading-tight">
              <div className="text-xs font-black tracking-[0.3em] uppercase text-slate-900">XELITE</div>
              <div className="text-[9px] text-slate-500 tracking-[0.25em] uppercase">Solutions</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={currentLang}
              onChange={(e) => setCurrentLang(e.target.value)}
              className="border border-slate-300 rounded-full text-[11px] px-3 py-1.5 bg-white text-slate-700 outline-none cursor-pointer hover:border-blue-500 transition-colors focus:ring-2 focus:ring-blue-200"
            >
              <option value="en">EN</option>
              <option value="ar">AR</option>
              <option value="fr">FR</option>
              <option value="es">ES</option>
              <option value="de">DE</option>
            </select>
            <button
              onClick={() => { setLoginError(""); setIsLoginOpen(true); }}
              className="hidden sm:inline-flex items-center gap-2 btn-ghost px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] border border-slate-300 rounded-full hover:border-blue-500 hover:text-blue-600 transition-all"
            >
              <i className="ph-bold ph-lock-simple text-xs"></i>
              <span>{L.nav.login}</span>
            </button>
            <button
              onClick={() => { setLoginError(""); setIsLoginOpen(true); }}
              className="sm:hidden inline-flex items-center justify-center w-8 h-8 rounded-full border border-slate-300 bg-white text-slate-600"
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
            <div className="pill inline-flex items-center gap-2 px-3 py-1 mb-4 border border-slate-300/50 bg-white/90 rounded-full backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span className="text-[10px] tracking-[0.25em] uppercase text-slate-600 font-medium">{L.hero.badge}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black leading-tight text-slate-900">
              {L.hero.title1}
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-sky-600 via-sky-500 to-indigo-500 pb-2">
                {L.hero.title2}
              </span>
            </h1>
            <p className="mt-4 text-[14px] sm:text-[15px] text-slate-600 leading-relaxed max-w-xl">
              {L.hero.subtitle}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button className="btn-primary bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-6 py-3 rounded-full text-[11px] font-bold uppercase tracking-[0.2em] shadow-lg shadow-blue-500/30 hover:-translate-y-0.5 transition-transform">
                {L.hero.primary}
              </button>
              <button className="btn-ghost bg-white text-slate-700 border border-slate-200 px-6 py-3 rounded-full text-[11px] font-bold uppercase tracking-[0.2em] hover:border-blue-500 hover:text-blue-600 transition-colors">
                {L.hero.secondary}
              </button>
            </div>
            <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center text-[11px] text-slate-600 border-t border-slate-200/60 pt-8">
              <div>
                <div className="text-xl font-bold text-slate-900">40+</div>
                <div className="mt-1 uppercase tracking-wider text-[9px]">{L.stats.clients}</div>
              </div>
              <div>
                <div className="text-xl font-bold text-slate-900">120+</div>
                <div className="mt-1 uppercase tracking-wider text-[9px]">{L.stats.systems}</div>
              </div>
              <div>
                <div className="text-xl font-bold text-slate-900">99.9%</div>
                <div className="mt-1 uppercase tracking-wider text-[9px]">{L.stats.uptime}</div>
              </div>
              <div>
                <div className="text-xl font-bold text-slate-900">8+</div>
                <div className="mt-1 uppercase tracking-wider text-[9px]">{L.stats.regions}</div>
              </div>
            </div>
          </div>

          {/* RIGHT: visual stack */}
          <div className="fade-in relative hidden lg:block">
            <div className="visual-stack relative min-h-[400px]">
              {/* Main Screen */}
              <div className="visual-screen-main relative rounded-2xl bg-slate-900 border border-slate-700/50 p-4 shadow-2xl shadow-slate-900/20 overflow-hidden z-10 max-w-md ml-auto">
                {/* Glow effect */}
                <div className="absolute -inset-[50%] bg-gradient-to-tr from-blue-500/20 to-cyan-400/20 opacity-50 blur-3xl pointer-events-none"></div>
                
                <div className="visual-screen-header relative flex items-center justify-between mb-4 z-10">
                  <div className="visual-dots flex gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-400"></span>
                    <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  </div>
                  <span className="text-[9px] uppercase tracking-[0.2em] px-2 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-400">XELITE • CONTROL FABRIC</span>
                </div>
                
                <div className="visual-columns grid grid-cols-[0.8fr_1.2fr] gap-3 relative z-10">
                  <div className="visual-sidebar bg-slate-800/50 border border-slate-700/50 rounded-xl p-2 flex flex-col gap-1.5">
                    <div className="visual-sidebar-item flex items-center gap-2 px-2 py-1.5 rounded-lg bg-blue-500/10 text-blue-100 border border-blue-500/20">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                      <span className="text-[9px]">Client Portals</span>
                    </div>
                    <div className="visual-sidebar-item flex items-center gap-2 px-2 py-1.5 rounded-lg text-slate-400 hover:bg-slate-800/50">
                      <i className="ph-bold ph-shopping-cart-simple text-[11px]"></i>
                      <span className="text-[9px]">Stores</span>
                    </div>
                    <div className="visual-sidebar-item flex items-center gap-2 px-2 py-1.5 rounded-lg text-slate-400 hover:bg-slate-800/50">
                      <i className="ph-bold ph-device-mobile-camera text-[11px]"></i>
                      <span className="text-[9px]">Mobile Apps</span>
                    </div>
                    <div className="visual-sidebar-item flex items-center gap-2 px-2 py-1.5 rounded-lg text-slate-400 hover:bg-slate-800/50">
                      <i className="ph-bold ph-brain text-[11px]"></i>
                      <span className="text-[9px]">Agents & Tools</span>
                    </div>
                  </div>
                  
                  <div className="visual-main-card bg-slate-800/30 border border-slate-700/50 rounded-xl p-3 flex flex-col gap-2">
                    <div className="flex justify-between items-center border-b border-slate-700/50 pb-2">
                      <span className="text-[9px] text-blue-300 font-mono">/admin/overview</span>
                      <span className="text-[9px] text-emerald-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        Live
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-1">
                       <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg p-2 text-white relative overflow-hidden">
                          <div className="relative z-10">
                            <div className="text-[8px] uppercase opacity-70 mb-1">Web</div>
                            <div className="text-[10px] font-bold">Marketing</div>
                          </div>
                       </div>
                       <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-lg p-2 text-white relative overflow-hidden">
                          <div className="relative z-10">
                            <div className="text-[8px] uppercase opacity-70 mb-1">Shop</div>
                            <div className="text-[10px] font-bold">Commerce</div>
                          </div>
                       </div>
                       <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-lg p-2 text-white relative overflow-hidden">
                          <div className="relative z-10">
                            <div className="text-[8px] uppercase opacity-70 mb-1">Apps</div>
                            <div className="text-[10px] font-bold">Mobile</div>
                          </div>
                       </div>
                    </div>
                  </div>
                </div>

                {/* Phone Mockup */}
                <div className="visual-phone absolute -right-4 -bottom-8 w-28 h-48 bg-slate-900 rounded-[20px] border-4 border-slate-800 shadow-2xl z-20 p-1">
                  <div className="w-full h-full bg-slate-950 rounded-[16px] overflow-hidden relative">
                     <div className="absolute top-0 left-0 right-0 h-4 bg-slate-900 z-10 flex justify-center">
                        <div className="w-12 h-3 bg-black rounded-b-lg"></div>
                     </div>
                     <div className="p-3 pt-6 flex flex-col gap-2 h-full">
                        <div className="flex justify-between items-center">
                           <span className="text-[8px] text-slate-400">Health</span>
                           <span className="text-[8px] text-emerald-400">99.9%</span>
                        </div>
                        <div className="bg-slate-800/50 rounded p-1.5">
                           <div className="flex justify-between text-[7px] text-slate-300 mb-1">
                              <span>Orders</span>
                              <span>+12</span>
                           </div>
                           <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                              <div className="h-full w-3/4 bg-blue-500"></div>
                           </div>
                        </div>
                        <div className="mt-auto text-[7px] text-slate-500 font-mono pb-1">
                           &gt; joe: "All systems stable."
                        </div>
                     </div>
                  </div>
                </div>
                
                {/* AI Tag */}
                <div className="absolute -top-3 right-4 bg-white text-slate-900 text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg z-30 flex items-center gap-2 border border-slate-100">
                   <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                   <span>JOE: Active</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ABOUT / WHY XELITE */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 mt-16">
          <div className="card bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xl shadow-slate-200/50">
            <div className="grid gap-8 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                   <i className="ph-fill ph-lightning text-yellow-500"></i>
                   {L.sectionAboutTitle}
                </h2>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">{L.sectionAboutText}</p>
                <ul className="mt-6 space-y-3">
                  {(L.list || []).map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-[13px] text-slate-600">
                      <span className="mt-0.5 text-emerald-500 shrink-0"><i className="ph-bold ph-check-circle text-base"></i></span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="border border-dashed border-slate-300 rounded-xl p-5 bg-slate-50 flex flex-col justify-center">
                <div className="text-[10px] font-mono text-slate-500 mb-3 tracking-widest uppercase">JOE • INTERNAL AGENT</div>
                <div className="text-[11px] bg-slate-900 text-slate-300 rounded-lg p-4 font-mono shadow-inner space-y-1">
                  <div className="flex gap-2"><span className="text-blue-400">&gt;</span> <span>sync(github: "Infinity-x-platform")</span></div>
                  <div className="flex gap-2"><span className="text-blue-400">&gt;</span> <span>review(pipelines, alerts)</span></div>
                  <div className="flex gap-2"><span className="text-emerald-400">&gt;</span> <span className="text-emerald-100">status: "OPTIMAL"</span></div>
                </div>
                <p className="mt-4 text-[12px] text-slate-500 leading-relaxed">
                  Joe acts as an internal engineer that reads your codebase, checks environments and helps the human team keep everything healthy.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* LOGIN MODAL */}
      {isLoginOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4 animate-fade-in">
          <div className="card w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden transform transition-all scale-100 border border-white/20">
            <div className="relative p-6">
               <button
                 onClick={() => setIsLoginOpen(false)}
                 className={`absolute top-4 ${currentLang === 'ar' ? 'left-4' : 'right-4'} w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors`}
               >
                 <i className="ph-bold ph-x text-lg"></i>
               </button>
               
               <div className="mb-6">
                 <div className="flex items-center gap-3 mb-1">
                   <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 shadow-md">
                     <span className="text-white font-black text-xs">Xe</span>
                   </div>
                   <div>
                     <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">Xelite • Admin</div>
                     <div className="text-base font-bold text-slate-900">{L.login.title}</div>
                   </div>
                 </div>
                 <p className="text-xs text-slate-500 mt-1">{L.login.subtitle}</p>
               </div>
   
               {loginError && (
                 <div className="mb-4 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 animate-pulse">
                   <i className="ph-fill ph-warning-circle text-lg"></i>
                   <span>{loginError}</span>
                 </div>
               )}
   
               {/* Tabs */}
               <div className="flex border-b border-slate-200 mb-6 text-[10px] font-bold tracking-[0.15em] uppercase">
                 {['email', 'phone', 'google', 'github'].map((mode) => {
                    // Hide google/github on mobile to save space if needed, or keep them
                    const isHiddenMobile = (mode === 'google' || mode === 'github') ? 'hidden sm:block' : '';
                    const isActive = authMode === mode;
                    
                    // Get label based on mode
                    let label = '';
                    if(mode === 'email') label = L.login.emailTab;
                    else if(mode === 'phone') label = L.login.phoneTab;
                    else if(mode === 'google') label = L.login.googleTab;
                    else if(mode === 'github') label = L.login.githubTab;

                    return (
                       <button
                         key={mode}
                         onClick={() => setAuthMode(mode)}
                         className={`flex-1 pb-2 transition-all border-b-2 ${isHiddenMobile} ${isActive ? 'text-blue-600 border-blue-500' : 'text-slate-400 border-transparent hover:text-slate-600'}`}
                       >
                         {label}
                       </button>
                    );
                 })}
               </div>
   
               {/* Content */}
               {authMode === 'email' && (
                 <form onSubmit={handleLogin} className="space-y-4">
                   <div>
                     <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">{L.login.emailLabel}</label>
                     <input
                       type="email"
                       autoComplete="email"
                       value={email}
                       onChange={(e) => setEmail(e.target.value)}
                       className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none rounded-xl px-4 py-3 text-sm transition-all"
                       placeholder="you@xelitesolutions.com"
                       required
                     />
                   </div>
                   <div className="relative">
                     <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">{L.login.passLabel}</label>
                     <input
                       type={showPassword ? "text" : "password"}
                       autoComplete="current-password"
                       value={password}
                       onChange={(e) => setPassword(e.target.value)}
                       className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none rounded-xl px-4 py-3 text-sm pr-10 transition-all"
                       placeholder={L.login.passPlaceholder}
                       required
                     />
                     <button
                       type="button"
                       onClick={() => setShowPassword(!showPassword)}
                       className={`absolute inset-y-0 ${currentLang === 'ar' ? 'left-0 pl-3' : 'right-0 pr-3'} flex items-center mt-6 text-slate-400 hover:text-slate-600`}
                     >
                       <i className={`ph-bold ${showPassword ? 'ph-eye-slash' : 'ph-eye'} text-lg`}></i>
                     </button>
                   </div>
                   <button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-3.5 rounded-xl text-[11px] font-bold uppercase tracking-[0.2em] hover:shadow-lg hover:shadow-blue-500/30 transition-all transform hover:-translate-y-0.5">
                     {L.login.signin}
                   </button>
                 </form>
               )}
   
               {authMode === 'phone' && (
                 <form onSubmit={handlePhoneLogin} className="space-y-4">
                   <p className="text-[11px] text-slate-500 bg-blue-50 p-3 rounded-lg border border-blue-100">{L.login.phoneInfo}</p>
                   <div>
                     <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">{L.login.phoneLabel}</label>
                     <input
                       type="tel"
                       className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none rounded-xl px-4 py-3 text-sm transition-all"
                       placeholder="+90 5xx xxx xx xx"
                     />
                   </div>
                   <button type="submit" className="w-full bg-slate-900 text-white py-3.5 rounded-xl text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-slate-800 transition-all">
                     {L.login.sendCode}
                   </button>
                 </form>
               )}
   
               {authMode === 'google' && (
                 <div className="space-y-4 py-4">
                   <button className="w-full bg-white border border-slate-200 text-slate-700 py-3 rounded-xl text-[11px] font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-slate-50 transition-all">
                     <i className="ph-bold ph-google-logo text-red-500 text-lg"></i>
                     {L.login.googleBtn}
                   </button>
                   <p className="text-[10px] text-slate-400 text-center italic">
                     Connect this button to your Google OAuth flow in the backend.
                   </p>
                 </div>
               )}
   
               {authMode === 'github' && (
                 <div className="space-y-4 py-4">
                   <button className="w-full bg-[#24292F] text-white py-3 rounded-xl text-[11px] font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-[#1b1f23] transition-all">
                     <i className="ph-bold ph-github-logo text-lg"></i>
                     {L.login.githubBtn}
                   </button>
                   <p className="text-[10px] text-slate-400 text-center italic">
                     Later you can bind this to GitHub OAuth or a GitHub App for JOE access.
                   </p>
                 </div>
               )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
