import { useEffect, useState } from "react"
import axios from "axios"

function App() {
  const [token, setToken] = useState("")
  const [status, setStatus] = useState(null)
  const [activity, setActivity] = useState([])

  async function loginTest() {
    // تسجيل دخول سوبر أدمن (الإيميل والباسوورد اللي ثبتناهم)
    const res = await axios.post(
      "https://infinity-x-platform.onrender.com/api/auth/login",
      {
        emailOrPhone: "info.auraaluxury@gmail.com",
        password: "Younes2025"
      }
    )
    setToken(res.data.sessionToken)
  }

  async function loadDashboard() {
    if (!token) return
    const res = await axios.get(
      "https://infinity-x-platform.onrender.com/api/dashboard/status",
      {
        headers: {
          "x-session-token": token
        }
      }
    )
    setStatus(res.data)
  }

  async function loadActivity() {
    const res = await axios.get(
      "https://infinity-x-platform.onrender.com/api/joe/activity-stream"
    )
    setActivity(res.data.events || [])
  }

  useEffect(() => {
    if (token) {
      loadDashboard()
      loadActivity()
    }
  }, [token])

  return (
    <div style={{
      backgroundColor: "#0a0a0f",
      color: "#fff",
      minHeight: "100vh",
      padding: "20px",
      fontFamily: "Inter, system-ui, sans-serif"
    }}>
      <h1 style={{color:"#7d5cff", fontSize:"20px", fontWeight:"600"}}>
        X / Admin Control Panel
      </h1>

      {!token && (
        <button
          style={{
            backgroundColor:"#7d5cff",
            color:"#fff",
            border:"0",
            borderRadius:"8px",
            padding:"10px 16px",
            cursor:"pointer",
            marginTop:"16px"
          }}
          onClick={loginTest}
        >
          Sign in as Super Admin
        </button>
      )}

      {token && (
        <>
          <section style={{
            marginTop:"24px",
            background:"#111122",
            border:"1px solid #2a2a40",
            borderRadius:"12px",
            padding:"16px"
          }}>
            <h2 style={{color:"#38bdf8", fontSize:"14px", fontWeight:"500", marginBottom:"8px"}}>
              System Status
            </h2>
            {!status && <div style={{color:"#999"}}>Loading...</div>}
            {status && (
              <div style={{fontSize:"13px", lineHeight:"1.5"}}>
                <div>Total Users: {status.system?.usersTotal}</div>
                <div>Active Sessions: {status.system?.activeSessions}</div>
                <div>Mongo Online: {status.system?.mongoOnline ? "yes":"no"}</div>
                <div>Redis Online: {status.system?.redisOnline ? "yes":"no"}</div>
              </div>
            )}
          </section>

          <section style={{
            marginTop:"24px",
            background:"#111122",
            border:"1px solid #2a2a40",
            borderRadius:"12px",
            padding:"16px",
            maxHeight:"200px",
            overflowY:"auto"
          }}>
            <h2 style={{color:"#a3e635", fontSize:"14px", fontWeight:"500", marginBottom:"8px"}}>
              Joe Live Activity
            </h2>

            {activity.length === 0 && (
              <div style={{color:"#666", fontSize:"12px"}}>No events yet.</div>
            )}

            {activity.map((e, i) => (
              <div key={i} style={{
                fontSize:"12px",
                borderBottom:"1px solid #2a2a40",
                padding:"6px 0"
              }}>
                <div style={{color:"#888"}}>{new Date(e.ts).toLocaleString()}</div>
                <div style={{color:"#fff"}}>{e.action}</div>
                <div style={{color:"#7d7dff"}}>{e.detail}</div>
              </div>
            ))}
          </section>
        </>
      )}
    </div>
  )
}

export default App