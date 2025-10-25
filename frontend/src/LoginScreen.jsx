import React, { useEffect, useState, useRef } from "react";
import axios from "axios";

export default function LoginScreen({ onLoggedIn }) {
  const [tab, setTab] = useState("email"); // email | phone | google
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [googleReady, setGoogleReady] = useState(false);
  const googleDivRef = useRef(null);

  const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:10000";
  const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || "";

  async function loginEmail() {
    try {
      const res = await axios.post(`${API_BASE}/api/auth/loginUser`, { email, password });
      if (res.data?.ok) onLoggedIn(res.data);
      else alert("فشل الدخول");
    } catch (err) {
      alert("خطأ: " + err.message);
    }
  }

  async function requestOtp() {
    try {
      const res = await axios.post(`${API_BASE}/api/auth/requestPhoneCode`, { phone });
      if (res.data?.ok) alert("تم إرسال كود (للتجربة يظهر في الاستجابة): " + res.data.debug_otp);
      else alert("فشل إرسال الكود");
    } catch (err) {
      alert("خطأ: " + err.message);
    }
  }

  async function loginPhone() {
    try {
      const res = await axios.post(`${API_BASE}/api/auth/loginPhone`, { phone, otp });
      if (res.data?.ok) onLoggedIn(res.data);
      else alert("فشل الدخول");
    } catch (err) {
      alert("خطأ: " + err.message);
    }
  }

  // Google Identity
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    const scriptId = "google-identity-script";
    if (document.getElementById(scriptId)) {
      setGoogleReady(true);
      return;
    }
    const s = document.createElement("script");
    s.id = scriptId;
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.onload = () => setGoogleReady(true);
    document.body.appendChild(s);
  }, [GOOGLE_CLIENT_ID]);

  useEffect(() => {
    if (!googleReady || !window.google || !GOOGLE_CLIENT_ID || !googleDivRef.current) return;
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: async (response) => {
        try {
          const res = await axios.post(`${API_BASE}/api/auth/loginGoogle`, { idToken: response.credential });
          if (res.data?.ok) onLoggedIn(res.data);
          else alert("فشل تسجيل الدخول بجوجل");
        } catch (err) {
          alert("خطأ Google: " + err.message);
        }
      },
    });
    window.google.accounts.id.renderButton(googleDivRef.current, { theme: "outline", size: "large", locale: "ar" });
  }, [googleReady, GOOGLE_CLIENT_ID, API_BASE, onLoggedIn]);

  const card = { border: "1px solid #333", borderRadius: "12px", padding: "16px", backgroundColor: "#000" };
  const input = { width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #444", backgroundColor: "#111", color: "#fff", marginBottom: "10px" };
  const btn = { backgroundColor: "#d4af37", color: "#000", border: "none", borderRadius: "10px", padding: "10px 14px", fontSize: "13px", fontWeight: 600, cursor: "pointer" };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#000", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ width: "100%", maxWidth: "420px" }}>
        <h1 style={{ color: "#d4af37", fontSize: "20px", fontWeight: 700, marginBottom: "16px", textAlign: "center" }}>InfinityX — تسجيل الدخول</h1>

        <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
          <button onClick={() => setTab("email")} style={{ ...btn, backgroundColor: tab==="email" ? "#d4af37" : "#222", color: tab==="email" ? "#000" : "#fff", border: tab==="email" ? "1px solid #d4af37" : "1px solid #444" }}>إيميل</button>
          <button onClick={() => setTab("phone")} style={{ ...btn, backgroundColor: tab==="phone" ? "#d4af37" : "#222", color: tab==="phone" ? "#000" : "#fff", border: tab==="phone" ? "1px solid #d4af37" : "1px solid #444" }}>هاتف</button>
          <button onClick={() => setTab("google")} style={{ ...btn, backgroundColor: tab==="google" ? "#d4af37" : "#222", color: tab==="google" ? "#000" : "#fff", border: tab==="google" ? "1px solid #d4af37" : "1px solid #444" }}>Google</button>
        </div>

        {tab === "email" && (
          <div style={card}>
            <input style={input} placeholder="email@example.com" value={email} onChange={(e)=>setEmail(e.target.value)} />
            <input style={input} placeholder="كلمة المرور" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} />
            <button style={btn} onClick={loginEmail}>دخول</button>
          </div>
        )}

        {tab === "phone" && (
          <div style={card}>
            <input style={input} placeholder="+96171123456" value={phone} onChange={(e)=>setPhone(e.target.value)} />
            <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
              <button style={{ ...btn, backgroundColor: "#222", color: "#fff", border: "1px solid #444" }} onClick={requestOtp}>أرسل كود</button>
              <input style={{ ...input, marginBottom: 0 }} placeholder="اكتب الكود هنا" value={otp} onChange={(e)=>setOtp(e.target.value)} />
            </div>
            <button style={btn} onClick={loginPhone}>دخول</button>
            <div style={{ fontSize: "11px", color: "#888", marginTop: "8px" }}>ملاحظة: في الإصدار الحالي الكود يطبع بالاستجابة فقط لأغراض الاختبار.</div>
          </div>
        )}

        {tab === "google" && (
          <div style={card}>
            <div ref={googleDivRef} />
            {!GOOGLE_CLIENT_ID && <div style={{ fontSize: "12px", color: "#aaa", marginTop: "8px" }}>املأ REACT_APP_GOOGLE_CLIENT_ID في إعدادات البيئة للواجهة الأمامية.</div>}
          </div>
        )}
      </div>
    </div>
  );
}
