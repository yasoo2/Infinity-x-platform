import React, { useState } from "react";
import { loginWithEmail, loginWithPhone } from "../../services/authApi.js";

export default function LoginPage({ t, setAuthed }) {
  const [mode, setMode] = useState("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");

  async function doLogin() {
    try {
      let data;
      if (mode==="email") {
        data = await loginWithEmail(email, pw);
      } else {
        data = await loginWithPhone(phone, pw);
      }
      if (!data.ok) throw new Error(data.error || "login failed");

      setAuthed({
        token:data.token,
        user:data.user
      });
    } catch(e) {
      setErr(e.message);
    }
  }

  return (
    <div style={{
      background:"#000",
      color:"#fff",
      minHeight:"100vh",
      display:"flex",
      alignItems:"center",
      justifyContent:"center",
      fontFamily:"sans-serif"
    }}>
      <div style={{
        background:"#111",
        border:"1px solid #333",
        borderRadius:"16px",
        padding:"24px",
        width:"320px",
        display:"flex",
        flexDirection:"column",
        gap:"16px"
      }}>
        <div style={{color:"#00e5ff",fontWeight:"600",fontSize:"16px",textAlign:"center"}}>
          {t.systemName}
        </div>
        <div style={{fontSize:"12px",color:"#888",textAlign:"center"}}>
          تسجيل الدخول للإدارة
        </div>

        <div style={{display:"flex",gap:"6px",fontSize:"12px"}}>
          <button
            onClick={()=>setMode("email")}
            style={{
              flex:1,
              background:mode==="email"?"#00e5ff":"#222",
              color:mode==="email"?"#000":"#fff",
              border:"1px solid #444",
              borderRadius:"8px",
              padding:"6px",
              cursor:"pointer",
              fontWeight:"600"
            }}
          >
            بالإيميل
          </button>
          <button
            onClick={()=>setMode("phone")}
            style={{
              flex:1,
              background:mode==="phone"?"#00e5ff":"#222",
              color:mode==="phone"?"#000":"#fff",
              border:"1px solid #444",
              borderRadius:"8px",
              padding:"6px",
              cursor:"pointer",
              fontWeight:"600"
            }}
          >
            بالموبايل
          </button>
        </div>

        {mode==="email" ? (
          <>
            <input
              placeholder="Email"
              style={inputStyle}
              value={email}
              onChange={e=>setEmail(e.target.value)}
            />
            <input
              type="password"
              placeholder="Password"
              style={inputStyle}
              value={pw}
              onChange={e=>setPw(e.target.value)}
            />
          </>
        ):(
          <>
            <input
              placeholder="Phone"
              style={inputStyle}
              value={phone}
              onChange={e=>setPhone(e.target.value)}
            />
            <input
              type="password"
              placeholder="Password"
              style={inputStyle}
              value={pw}
              onChange={e=>setPw(e.target.value)}
            />
          </>
        )}

        {/* زر جوجل - جاهز للربط لاحقاً */}
        <button
          style={{
            background:"#fff",
            color:"#000",
            border:"1px solid #444",
            borderRadius:"8px",
            padding:"8px",
            fontSize:"12px",
            fontWeight:"600",
            cursor:"pointer"
          }}
          title="Sign in with Google (requires Google keys setup)"
        >
          Sign in with Google
        </button>

        {err && (
          <div style={{color:"#ff2d2d",fontSize:"11px",textAlign:"center"}}>
            {err}
          </div>
        )}

        <button
          style={{
            background:"#17c964",
            color:"#000",
            border:"1px solid #17c964",
            borderRadius:"8px",
            padding:"8px",
            fontSize:"13px",
            fontWeight:"700",
            cursor:"pointer",
            textAlign:"center"
          }}
          onClick={doLogin}
        >
          دخول
        </button>
      </div>
    </div>
  );
}

const inputStyle = {
  background:"#000",
  color:"#fff",
  border:"1px solid #444",
  borderRadius:"8px",
  padding:"8px",
  fontSize:"12px",
  fontFamily:"inherit"
};
