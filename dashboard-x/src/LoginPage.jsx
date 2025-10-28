import React, { useState } from "react";
import AdminHome from "./AdminHome";

// مهم: هذا نفس الدومين تبع السيرفر على Render
const BASE_URL = "https://infinity-x-platform.onrender.com";

export default function LoginPage() {
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [password, setPassword] = useState("");
  const [sessionToken, setSessionToken] = useState("");
  const [userInfo, setUserInfo] = useState(null);
  const [statusMsg, setStatusMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setStatusMsg("");

    try {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          emailOrPhone,
          password
        })
      });

      if (!res.ok) {
        setStatusMsg("Login failed (bad credentials?)");
        setLoading(false);
        return;
      }

      const data = await res.json();
      if (!data.ok || !data.sessionToken) {
        setStatusMsg("Login failed (no token)");
        setLoading(false);
        return;
      }

      // نجاح
      setSessionToken(data.sessionToken);
      setUserInfo(data.user || {});
      setStatusMsg("Logged in ✔");
      setLoading(false);
    } catch (err) {
      console.error(err);
      setStatusMsg("Network / server error");
      setLoading(false);
    }
  }

  // إذا صار معنا sessionToken بنعرض الصفحة الرئيسية للإدارة بدل الفورم
  if (sessionToken && userInfo) {
    return (
      <AdminHome
        sessionToken={sessionToken}
        currentUser={userInfo}
      />
    );
  }

  // شاشة تسجيل الدخول
  return (
    <div
      style={{
        backgroundColor: "#0a0b10",
        color: "#fff",
        minHeight: "100vh",
        fontFamily: "sans-serif",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem"
      }}
    >
      <div
        style={{
          backgroundColor: "#141622",
          borderRadius: "1rem",
          boxShadow: "0 0 20px rgba(77,255,145,0.4)",
          width: "100%",
          maxWidth: "400px",
          padding: "1.5rem",
          border: "1px solid rgba(77,255,145,0.4)"
        }}
      >
        <h1
          style={{
            fontSize: "1.1rem",
            fontWeight: "600",
            color: "#4dff91",
            textShadow: "0 0 8px rgba(77,255,145,0.8)",
            marginBottom: "0.5rem",
            textAlign: "center"
          }}
        >
          InfinityX Secure Access
        </h1>

        <p
          style={{
            fontSize: "0.8rem",
            color: "#8b8ea8",
            textAlign: "center",
            marginBottom: "1rem",
            lineHeight: "1.4"
          }}
        >
          Super Admin / Admin / Internal Only
        </p>

        <form onSubmit={handleLogin} style={{ display: "grid", gap: "0.75rem" }}>
          <div style={{ display: "grid", gap: "0.4rem" }}>
            <label
              style={{
                fontSize: "0.75rem",
                color: "#8b8ea8",
                fontWeight: "500"
              }}
            >
              Email or Phone
            </label>
            <input
              style={{
                backgroundColor: "#0f1018",
                border: "1px solid rgba(61,126,255,0.4)",
                borderRadius: "0.5rem",
                padding: "0.6rem 0.75rem",
                fontSize: "0.8rem",
                color: "#fff",
                outline: "none",
                boxShadow: "0 0 16px rgba(61,126,255,0.3)"
              }}
              value={emailOrPhone}
              onChange={(e) => setEmailOrPhone(e.target.value)}
              placeholder="info.auraaluxury@gmail.com / 0090..."
            />
          </div>

          <div style={{ display: "grid", gap: "0.4rem" }}>
            <label
              style={{
                fontSize: "0.75rem",
                color: "#8b8ea8",
                fontWeight: "500"
              }}
            >
              Password
            </label>
            <input
              type="password"
              style={{
                backgroundColor: "#0f1018",
                border: "1px solid rgba(255,56,164,0.4)",
                borderRadius: "0.5rem",
                padding: "0.6rem 0.75rem",
                fontSize: "0.8rem",
                color: "#fff",
                outline: "none",
                boxShadow: "0 0 16px rgba(255,56,164,0.4)"
              }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Younes2025"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              background:
                "radial-gradient(circle at 20% 20%, rgba(77,255,145,0.4) 0%, rgba(61,126,255,0.25) 60%, rgba(255,56,164,0.2) 100%)",
              border: "1px solid #4dff91",
              borderRadius: "0.6rem",
              padding: "0.6rem 0.75rem",
              fontSize: "0.8rem",
              fontWeight: "600",
              color: "#fff",
              textShadow: "0 0 8px rgba(77,255,145,0.8)",
              boxShadow:
                "0 0 20px rgba(77,255,145,0.4), 0 0 40px rgba(61,126,255,0.3), 0 0 60px rgba(255,56,164,0.25)",
              cursor: "pointer",
              opacity: loading ? 0.5 : 1,
              transition: "0.15s"
            }}
          >
            {loading ? "Checking..." : "Login"}
          </button>
        </form>

        {statusMsg && (
          <div
            style={{
              fontSize: "0.7rem",
              color: statusMsg.includes("✔") ? "#4dff91" : "#ff38a4",
              marginTop: "1rem",
              minHeight: "1rem",
              textAlign: "center",
              whiteSpace: "pre-line"
            }}
          >
            {statusMsg}
          </div>
        )}

        <div
          style={{
            borderTop: "1px solid rgba(139,142,168,0.2)",
            marginTop: "1rem",
            paddingTop: "1rem"
          }}
        >
          <p
            style={{
              fontSize: "0.65rem",
              color: "#8b8ea8",
              lineHeight: "1.4",
              textAlign: "center"
            }}
          >
            By logging in you confirm this is an authorized,
            internal environment. Unauthorized access will be
            observed and traced by Joe.
          </p>
        </div>
      </div>
    </div>
  );
}
