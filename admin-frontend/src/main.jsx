import React, { useState } from "react";
import { createRoot } from "react-dom/client";

import ar from "./i18n/ar.js";
import en from "./i18n/en.js";

import TopBar from "./components/TopBar.jsx";
import Sidebar from "./components/Sidebar.jsx";
import LoginPage from "./pages/Login/LoginPage.jsx";
import DashboardPage from "./pages/Dashboard/DashboardPage.jsx";
// TODO: استيراد باقي الصفحات بنفس الطريقة:
// import UsersPage from "./pages/Users/UsersPage.jsx";
// import FactoryPage from "./pages/Factory/FactoryPage.jsx";
// import SystemHealthPage from "./pages/SystemHealth/SystemHealthPage.jsx";
// import RevenuePage from "./pages/Revenue/RevenuePage.jsx";

function App() {
  // state عام للواجهة
  const [language, setLanguage] = useState("en"); // "en" default
  const [showHelp, setShowHelp] = useState(true);
  const [factoryMode, setFactoryMode] = useState("safe");

  // auth state (token + user)
  const [auth, setAuth] = useState(null);

  // navigation
  const [screen, setScreen] = useState("dashboard");

  // اختيار الترجمة
  const t = language === "ar" ? ar : en;

  // handlers
  function toggleLanguage(){
    setLanguage(prev => prev==="en" ? "ar" : "en");
    // ملاحظة: ممكن نغير الـ dir للصفحة كلها بناء على اللغة
    document.documentElement.dir = (language==="en" ? "rtl" : "ltr");
  }

  function toggleHelp(){
    setShowHelp(prev=>!prev);
  }

  async function switchFactoryMode(){
    // هذا يطلب من السيرفر تغيير FACTORY_MODE (safe/live)
    // مبدئياً بس نقلب الواجهة
    setFactoryMode(prev => prev==="safe" ? "live" : "safe");
    // ملاحظة: ممكن نستعمل systemApi.setFactoryMode(auth.token, newMode)
  }

  // إذا مو عامل تسجيل دخول، بتشوف صفحة الدخول
  if (!auth) {
    return (
      <LoginPage
        t={t}
        setAuthed={setAuth}
      />
    );
  }

  // صفحات:
  let body = null;
  if (screen === "dashboard") {
    body = <DashboardPage t={t} token={auth.token} showHelp={showHelp} />;
  } else {
    body = (
      <div style={{color:"#fff",padding:"16px",fontFamily:"sans-serif"}}>
        <div style={{color:"#ff2d2d",fontSize:"12px",fontWeight:"600"}}>
          صفحة "{screen}" لسا بتتكمل بنفس الأسلوب (Users, Factory, Health, Revenue)
        </div>
        <div style={{color:"#888",fontSize:"12px",marginTop:"8px"}}>
          البنية جاهزة. نربطها بنفس الخدمات اللي فوق.
        </div>
      </div>
    );
  }

  return (
    <div style={{display:"flex", background:"#000", minHeight:"100vh"}}>
      <Sidebar
        t={t}
        current={screen}
        onNavigate={setScreen}
        showHelp={showHelp}
      />
      <div style={{flex:1, display:"flex", flexDirection:"column"}}>
        <TopBar
          t={t}
          language={language}
          onToggleLanguage={toggleLanguage}
          showHelp={showHelp}
          onToggleHelp={toggleHelp}
          factoryMode={factoryMode}
          onSwitchFactoryMode={switchFactoryMode}
          systemNameDisplay={t.systemName}
        />
        <div style={{flex:1, overflowY:"auto"}}>
          {body}
        </div>
      </div>
    </div>
  );
}

const root = createRoot(document.getElementById("root"));
root.render(<App />);
