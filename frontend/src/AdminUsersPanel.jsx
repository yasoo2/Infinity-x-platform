import React, { useEffect, useState } from "react";
import axios from "axios";
import ActionWithHelp from "./components/ActionWithHelp";

export default function AdminUsersPanel({ sessionToken, onSelfDeleted }) {
  const [users, setUsers] = useState([]);
  const [helpModeEnabled, setHelpModeEnabled] = useState(true);
  const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:10000";

  async function loadUsers() {
    try {
      const res = await axios.get(`${API_BASE}/api/admin/users`, {
        headers: { "x-session-token": sessionToken },
      });
      setUsers(res.data?.users || []);
    } catch (err) {
      alert("خطأ تحميل المستخدمين: " + err.message);
    }
  }

  useEffect(() => { loadUsers(); }, []); // initial

  async function promote(email) {
    try {
      await axios.post(`${API_BASE}/api/admin/promote`, { email }, { headers: { "x-session-token": sessionToken } });
      await loadUsers();
    } catch (err) { alert("خطأ ترقية: " + err.message); }
  }

  async function demote(email) {
    try {
      await axios.post(`${API_BASE}/api/admin/demote`, { email }, { headers: { "x-session-token": sessionToken } });
      await loadUsers();
    } catch (err) { alert("خطأ تنزيل الرتبة: " + err.message); }
  }

  async function remove(email) {
    try {
      await axios.post(`${API_BASE}/api/admin/deleteUser`, { email }, { headers: { "x-session-token": sessionToken } });
      await loadUsers();
      onSelfDeleted?.(email);
    } catch (err) { alert("خطأ حذف: " + err.message); }
  }

  const headerStyle = { display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "8px", fontWeight: 700, borderBottom: "1px solid #333", padding: "8px 0", color: "#d4af37" };
  const rowStyle = { display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "8px", padding: "8px 0", borderBottom: "1px solid #222" };
  const btn = { backgroundColor: "#111", color: "#d4af37", border: "1px solid #d4af37", borderRadius: "8px", padding: "6px 10px", fontSize: "12px", fontWeight: 600, cursor: "pointer" };

  return (
    <div style={{ padding: "20px", color: "#fff", backgroundColor: "#000", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ color: "#d4af37", fontSize: "20px", fontWeight: 600, marginBottom: "8px" }}>إدارة المستخدمين (سوبر أدمن)</h1>

      <button
        style={{
          backgroundColor: helpModeEnabled ? "#d4af37" : "#222",
          color: helpModeEnabled ? "#000" : "#fff",
          border: helpModeEnabled ? "1px solid #d4af37" : "1px solid #444",
          borderRadius: "10px",
          padding: "8px 12px",
          fontSize: "12px",
          fontWeight: 600,
          cursor: "pointer",
          marginBottom: "16px",
        }}
        title="إظهار أو إخفاء (!) بجانب الأزرار لعرض الشرح"
        onClick={() => setHelpModeEnabled(!helpModeEnabled)}
      >
        {helpModeEnabled ? "إخفاء الشرح (!) - وضع الخبير" : "إظهار الشرح (!) - وضع المساعدة"}
      </button>

      <div style={headerStyle}>
        <div>البريد</div>
        <div>الهاتف</div>
        <div>الدور</div>
        <div>أوامر</div>
      </div>

      {users.map((u, idx) => (
        <div key={idx} style={rowStyle}>
          <div>{u.email || "-"}</div>
          <div>{u.phone || "-"}</div>
          <div>{u.role}</div>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            <ActionWithHelp
              buttonStyle={btn}
              buttonLabel="ترقية → super_admin"
              onClick={() => promote(u.email)}
              helpModeEnabled={helpModeEnabled}
              helpText={"يحوّل هذا المستخدم إلى سوبر أدمن كامل الصلاحية."}
            />
            <ActionWithHelp
              buttonStyle={btn}
              buttonLabel="إنزال → admin"
              onClick={() => demote(u.email)}
              helpModeEnabled={helpModeEnabled}
              helpText={"ينزل رتبة المستخدم من سوبر أدمن إلى أدمن."}
            />
            <ActionWithHelp
              buttonStyle={btn}
              buttonLabel="حذف المستخدم"
              onClick={() => remove(u.email)}
              helpModeEnabled={helpModeEnabled}
              helpText={"يحذف هذا المستخدم نهائيًا. مسموح تحذف نفسك إذا قررت بيع النظام."}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
