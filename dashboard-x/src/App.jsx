import React, { useEffect, useState } from "react"
import {
  fetchStatus,
  fetchJoeActivity,
  fetchUsers,
  sendJoeCommand
} from "./api.js"

export default function App() {
  // مبدئياً خلّي السيشن توكن ثابت هون (قدامك، ما بنخبيه عنك)
  // بعدين بنحطه بصفحة لوجين صغيرة
  const [sessionToken, setSessionToken] = useState(
    "PUT-YOUR-SESSION-TOKEN-HERE"
  )

  // data من الباك
  const [status, setStatus] = useState(null)
  const [activity, setActivity] = useState([])
  const [users, setUsers] = useState([])

  // UI state
  const [helpOn, setHelpOn] = useState(true)
  const [lang, setLang] = useState("en")
  const [joeCommandText, setJoeCommandText] = useState("")
  const [sendingCmd, setSendingCmd] = useState(false)

  // نحمّل الداتا من السيرفر
  useEffect(() => {
    if (!sessionToken) return

    const load = async () => {
      try {
        const st = await fetchStatus(sessionToken)
        setStatus(st)

        const act = await fetchJoeActivity()
        setActivity(act?.events || [])

        const u = await fetchUsers(sessionToken)
        setUsers(u?.users || [])
      } catch (err) {
        console.error("load error", err)
      }
    }

    load()
    const id = setInterval(load, 5000) // refresh كل 5 ثواني
    return () => clearInterval(id)
  }, [sessionToken])

  async function handleSendJoeCommand() {
    if (!joeCommandText.trim()) return
    setSendingCmd(true)
    try {
      await sendJoeCommand(sessionToken, joeCommandText.trim())
      setJoeCommandText("")
    } catch (err) {
      console.error("send cmd err", err)
    }
    setSendingCmd(false)
  }

  // تنسيق لون help mode
  const helpColor = helpOn ? "bg-red-500 shadow-neonPink" : "bg-green-500 shadow-neon"

  return (
    <div className="min-h-screen bg-bgDark text-white flex flex-col p-4 gap-4 font-sans">

      {/* ================= HEADER ================= */}
      <header className="w-full flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex flex-col">
          <div className="text-xl font-semibold text-white flex items-center gap-2">
            <span className="text-neonGreen font-bold">Future Systems</span>
            <span className="text-textDim">/</span>
            <span className="text-neonBlue font-bold">Dashboard X</span>
          </div>
          <div className="text-xs text-textDim">
            Control panel (factory • Joe • users • public site • live runtime)
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 md:items-center">

          {/* help toggle */}
          <button
            className={`px-3 py-2 text-xs font-semibold rounded-xl2 ${helpColor} transition-all`}
            onClick={() => setHelpOn(!helpOn)}
          >
            {helpOn ? "Help ON" : "Help OFF"}
          </button>

          {/* language selector */}
          <select
            className="bg-cardDark border border-textDim/30 rounded-xl2 text-xs px-3 py-2 text-white"
            value={lang}
            onChange={e => setLang(e.target.value)}
          >
            <option value="en">English</option>
            <option value="ar">العربية</option>
            <option value="tr">Türkçe</option>
            <option value="fr">Français</option>
            <option value="de">Deutsch</option>
            <option value="es">Español</option>
            <option value="zh">中文</option>
          </select>

          {/* logout placeholder */}
          <button className="text-xs text-textDim hover:text-white underline underline-offset-4">
            Logout
          </button>
        </div>
      </header>

      {/* ================= GRID MAIN ================= */}
      <main className="grid grid-cols-1 xl:grid-cols-3 gap-4 w-full">

        {/* LEFT COLUMN */}
        <section className="flex flex-col gap-4 xl:col-span-2">
          {/* System status card */}
          <div className="bg-cardDark/70 border border-textDim/20 rounded-xl2 p-4 shadow-neonBlue">
            <div className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
              <span className="text-neonBlue">System Status</span>
              <span className="text-[10px] text-textDim">
                live / refreshed every 5s
              </span>
            </div>

            {status ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <InfoStat
                  label="Total Users"
                  value={status.system?.usersTotal ?? "-"}
                />
                <InfoStat
                  label="Active Now"
                  value={status.system?.activeSessions ?? "-"}
                />
                <InfoStat
                  label="Mongo"
                  value={status.system?.mongoOnline ? "online" : "off"}
                />
                <InfoStat
                  label="Redis"
                  value={status.system?.redisOnline ? "online" : "off"}
                />
              </div>
            ) : (
              <div className="text-textDim text-xs">
                Loading status...
              </div>
            )}
          </div>

          {/* Factory control */}
          <div className="bg-cardDark/70 border border-textDim/20 rounded-xl2 p-4 shadow-neonPink">
            <div className="text-sm font-semibold text-white mb-3 flex items-center justify-between">
              <span className="text-neonPink">Smart Factory</span>
              <span className="text-[10px] text-textDim">
                Build / Link / Monitor
              </span>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              <ActionButton label="Build New Project" sub="Store / App / Landing" />
              <ActionButton label="Link External System" sub="Connect existing shop" />
              <ActionButton label="Performance Watch" sub="Latency / Cost / Load" />
              <ActionButton label="Security Monitor" sub="Secrets / Risk" />
              <ActionButton label="SEO Booster" sub="Rank #1 strategy" />
              <ActionButton label="Public Site Editor" sub="Brand / Sections / Colors" />
            </div>
          </div>

          {/* Users table (very light preview) */}
          <div className="bg-cardDark/70 border border-textDim/20 rounded-xl2 p-4 shadow-neon">
            <div className="text-sm font-semibold text-white mb-3 flex items-center justify-between">
              <span className="text-neonGreen">Users & Roles</span>
              <span className="text-[10px] text-textDim">
                super/admin/user
              </span>
            </div>

            <div className="text-[11px] text-textDim max-h-40 overflow-auto leading-relaxed">
              {users.length === 0 ? (
                <div className="text-textDim">No users loaded / or no access</div>
              ) : (
                users.map(u => (
                  <div
                    key={u._id}
                    className="flex items-center justify-between border-b border-white/5 py-1"
                  >
                    <div className="flex flex-col">
                      <span className="text-white text-xs font-medium">
                        {u.email || u.phone || "unknown"}
                      </span>
                      <span className="text-[10px] text-textDim">
                        role: {u.role} • lastLogin: {u.lastLoginAt || "?"}
                      </span>
                    </div>
                    <button className="text-[10px] text-neonBlue underline underline-offset-2">
                      Change Role
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* RIGHT COLUMN */}
        <section className="flex flex-col gap-4 xl:col-span-1">

          {/* Joe live activity */}
          <div className="bg-cardDark/70 border border-textDim/20 rounded-xl2 p-4 shadow-neonBlue flex flex-col h-[260px]">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="text-sm font-semibold text-white flex items-center gap-2">
                  <span className="text-neonBlue">Joe Live Activity</span>
                  <span className="text-[10px] text-textDim">realtime</span>
                </div>
                <div className="text-[10px] text-textDim">
                  watch Joe working / building / linking / fixing
                </div>
              </div>

              {/* زر السيطرة */}
              <button className="text-[10px] bg-neonBlue/20 text-neonBlue border border-neonBlue/40 rounded-xl2 px-2 py-1 shadow-neonBlue hover:bg-neonBlue/30">
                سيطرة
              </button>
            </div>

            <div className="flex-1 bg-black/20 rounded-xl2 p-2 text-[11px] overflow-auto border border-white/5 leading-relaxed">
              {activity.length === 0 ? (
                <div className="text-textDim">No recent activity</div>
              ) : (
                activity.map((ev, i) => (
                  <div
                    key={i}
                    className="border-b border-white/5 py-1 mb-1 last:border-b-0 last:mb-0"
                  >
                    <div className="text-white text-[11px]">
                      {ev.action}
                    </div>
                    <div className="text-textDim text-[10px]">
                      {ev.detail}
                    </div>
                    <div className="text-[9px] text-textDim/60">
                      {new Date(ev.ts).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Voice / Command to Joe */}
          <div className="bg-cardDark/70 border border-textDim/20 rounded-xl2 p-4 shadow-neonPink flex flex-col">
            <div className="text-sm font-semibold text-white mb-2 flex items-center justify-between">
              <span className="text-neonPink">Command Joe</span>
              <span className="text-[10px] text-textDim">he will build/fix</span>
            </div>

            <textarea
              className="bg-black/30 border border-white/10 rounded-xl2 text-[11px] text-white p-2 h-20 outline-none resize-none"
              placeholder="مثال: جو ضيف زر فوترة على صفحة X وخليه نيون أخضر..."
              value={joeCommandText}
              onChange={e => setJoeCommandText(e.target.value)}
            />

            <button
              disabled={sendingCmd}
              onClick={handleSendJoeCommand}
              className="mt-2 text-[11px] font-semibold bg-neonPink/20 text-neonPink border border-neonPink/40 rounded-xl2 px-3 py-2 shadow-neonPink hover:bg-neonPink/30 disabled:opacity-40"
            >
              {sendingCmd ? "Sending..." : "Send to Joe"}
            </button>

            <div className="text-[10px] text-textDim mt-2">
              Joe can: edit site, link external store, build new feature,
              improve SEO, refactor code, propose self-upgrades.
            </div>
          </div>
        </section>
      </main>

      {/* footer صغير */}
      <footer className="text-[10px] text-textDim text-center py-4 opacity-50">
        Future Systems • internal control panel (X) • Joe autonomous engineering core
      </footer>
    </div>
  )
}

// component صغير للاستات
function InfoStat({ label, value }) {
  return (
    <div className="bg-black/30 rounded-xl2 p-3 border border-white/5 shadow-neon text-white flex flex-col">
      <div className="text-[10px] text-textDim uppercase">{label}</div>
      <div className="text-sm font-semibold text-neonGreen leading-tight">
        {String(value)}
      </div>
    </div>
  )
}

// أزرار المصنع
function ActionButton({ label, sub }) {
  return (
    <button className="bg-black/30 hover:bg-black/40 border border-white/10 rounded-xl2 p-3 text-left shadow-neonBlue flex flex-col">
      <span className="text-white text-xs font-semibold">{label}</span>
      <span className="text-[10px] text-textDim leading-tight">
        {sub}
      </span>
    </button>
  )
}