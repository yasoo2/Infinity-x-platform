import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import OwnerDashboard from "./OwnerDashboard";
import ChatPanel from "./ChatPanel";
import LoginScreen from "./LoginScreen";
import AdminUsersPanel from "./AdminUsersPanel";

export default function App() {
  const [sessionToken, setSessionToken] = useState(localStorage.getItem("sessionToken") || null);
  const [role, setRole] = useState(localStorage.getItem("role") || null);
  const [email, setEmail] = useState(localStorage.getItem("email") || null);
  const [tab, setTab] = useState("dashboard"); // dashboard | chat | users

  useEffect(() => {
    if (sessionToken) localStorage.setItem("sessionToken", sessionToken);
    else localStorage.removeItem("sessionToken");
    if (role) localStorage.setItem("role", role);
    else localStorage.removeItem("role");
    if (email) localStorage.setItem("email", email);
    else localStorage.removeItem("email");
  }, [sessionToken, role, email]);

  function onLoggedIn(data) {
    setSessionToken(data.sessionToken);
    setRole(data.role);
    setEmail(data.email || data.phone || null);
  }

  function logout() {
    setSessionToken(null);
    setRole(null);
    setEmail(null);
  }

  function handleSelfDeleted(deletedEmail) {
    if (deletedEmail && email && deletedEmail === email) {
      logout();
    }
  }

  if (!sessionToken) {
    return <LoginScreen onLoggedIn={onLoggedIn} />;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      style={{ backgroundColor: "#000", color: "#fff", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}
    >
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #333", position: "sticky", top: 0, backgroundColor: "#000", zIndex: 10 }}>
        <div style={{ display: "flex" }}>
          <button
            style={{ padding: "14px", backgroundColor: tab==="dashboard" ? "#111" : "#000", color: tab==="dashboard" ? "#d4af37" : "#aaa", border: "none", borderBottom: tab==="dashboard" ? "2px solid #d4af37" : "2px solid transparent", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
            title="لوحة التحكم"
            onClick={() => setTab("dashboard")}
          >
            لوحة التحكم
          </button>
          <button
            style={{ padding: "14px", backgroundColor: tab==="chat" ? "#111" : "#000", color: tab==="chat" ? "#d4af37" : "#aaa", border: "none", borderBottom: tab==="chat" ? "2px solid #d4af37" : "2px solid transparent", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
            title="دردشة الذكاء"
            onClick={() => setTab("chat")}
          >
            ذكاء / شات
          </button>
          {role === "super_admin" && (
            <button
              style={{ padding: "14px", backgroundColor: tab==="users" ? "#111" : "#000", color: tab==="users" ? "#d4af37" : "#aaa", border: "none", borderBottom: tab==="users" ? "2px solid #d4af37" : "2px solid transparent", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
              title="إدارة المستخدمين"
              onClick={() => setTab("users")}
            >
              إدارة المستخدمين
            </button>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingRight: "12px" }}>
          <div style={{ fontSize: "12px", color: "#aaa" }}>{email || "غير معروف"}</div>
          <button
            style={{ backgroundColor: "#222", color: "#fff", border: "1px solid #444", borderRadius: "10px", padding: "8px 12px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
            onClick={logout}
          >
            خروج
          </button>
        </div>
      </div>

      {tab === "dashboard" && <OwnerDashboard sessionToken={sessionToken} />}
      {tab === "chat" && <ChatPanel />}
      {tab === "users" && role === "super_admin" && <AdminUsersPanel sessionToken={sessionToken} onSelfDeleted={handleSelfDeleted} />}
    </motion.div>
  );
}
