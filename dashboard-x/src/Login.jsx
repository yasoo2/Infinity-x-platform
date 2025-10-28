// dashboard-x/src/Login.jsx

import { useState } from "react";
import { loginWithEmailPassword } from "./apiClient/adminApi";

export default function Login({ onLoginSuccess }) {
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const result = await loginWithEmailPassword(emailOrPhone, password);
      // result = { ok:true, sessionToken:"...", user:{...} }
      if (result && result.sessionToken) {
        localStorage.setItem("sessionToken", result.sessionToken);
        localStorage.setItem("userEmail", result.user?.email || "");
        localStorage.setItem("userRole", result.user?.role || "");
        onLoginSuccess(result.sessionToken, result.user);
      } else {
        setErr("Login response missing sessionToken");
      }
    } catch (e) {
      console.log("login error:", e);
      setErr("Login failed. Check email/phone and password.");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0b10] text-white">
      <div className="bg-[#141622] shadow-[0_0_20px_rgba(77,255,145,0.4)] rounded-xl2 p-8 w-full max-w-[360px]">
        <h1 className="text-xl font-semibold text-white mb-2">
          InfinityX / Admin Login
        </h1>
        <p className="text-sm text-[#8b8ea8] mb-6">
          Super Admin / Admin Access
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm text-[#8b8ea8] mb-1">
              Email or Phone
            </label>
            <input
              className="w-full bg-[#0a0b10] border border-[#3d7eff] rounded-md px-3 py-2 text-white text-sm outline-none focus:border-[#4dff91]"
              value={emailOrPhone}
              onChange={e => setEmailOrPhone(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm text-[#8b8ea8] mb-1">
              Password
            </label>
            <input
              type="password"
              className="w-full bg-[#0a0b10] border border-[#3d7eff] rounded-md px-3 py-2 text-white text-sm outline-none focus:border-[#4dff91]"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          {err && (
            <div className="text-[13px] text-[#ff38a4]">
              {err}
            </div>
          )}

          <button
            disabled={loading}
            className="w-full bg-[#4dff91] text-black font-semibold text-sm py-2 rounded-md hover:shadow-[0_0_20px_rgba(77,255,145,0.6)] transition-all"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
