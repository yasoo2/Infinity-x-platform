import React, { useEffect, useState } from 'react'
import { API_BASE, ENDPOINTS } from './config.js'

export default function App() {
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // بنعتبر إن الشخص "مسجل دخول" إذا عنده x-session-token
  const sessionToken = window.localStorage.getItem('x-session-token') || null

  // لو مافي توكن -> ما منجيب حتى الـ health من السيرفر
  useEffect(() => {
    if (!sessionToken) {
      setLoading(false)
      return
    }

    async function checkHealth() {
      try {
        const res = await fetch(ENDPOINTS.health)
        const data = await res.json()
        setHealth(data)
      } catch (err) {
        setError(err.message || 'Network error')
      } finally {
        setLoading(false)
      }
    }
    checkHealth()
  }, [sessionToken])

  // شاشة ممنوع
  if (!sessionToken) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center">
        <div className="bg-gray-900/50 border border-red-500/30 text-center rounded-xl p-6 shadow-[0_30px_100px_rgba(0,0,0,0.9)] max-w-xs">
          <div className="text-red-400 text-xs font-semibold uppercase tracking-wide">
            Access Denied
          </div>
          <div className="text-gray-200 text-sm font-medium mt-2">
            Session token not found
          </div>
          <div className="text-[11px] text-gray-500 mt-3 leading-relaxed">
            أدخل على الـ backend من Postman / login.<br/>
            خذ قيمة الـ <code class="text-[10px] text-red-400">sessionToken</code><br/>
            وحطها محلي في المتصفح:
          </div>

          <pre className="text-[10px] leading-relaxed bg-black/40 border border-gray-800 rounded-md text-left text-gray-300 p-2 mt-3 overflow-x-auto">
{`localStorage.setItem(
  "x-session-token",
  "90763....ضع-التوكن-تبعتك...."
);`}
          </pre>

          <div className="text-[10px] text-gray-600 mt-4">
            بعدين اعمل Reload للصفحة.
          </div>
        </div>
      </div>
    )
  }

  // لو في جلسة (token موجود) نعرض الداشبورد الكامل
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      {/* Top bar */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-brand-400 font-semibold text-sm">InfinityX Dashboard</span>
          <span className="text-[10px] text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full border border-gray-700">
            Internal
          </span>
        </div>

        <div className="text-xs text-emerald-400">
          Authenticated
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 p-4">
        <div className="max-w-4xl mx-auto grid gap-4">
          
          {/* Card: Backend status */}
          <section className="bg-gray-900/40 border border-gray-800 rounded-xl p-4 shadow-[0_20px_60px_rgba(0,0,0,0.8)]">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-sm font-semibold text-gray-100 flex items-center gap-2">
                  <span>Backend Status</span>
                  {loading ? (
                    <span className="text-[10px] text-gray-500">checking…</span>
                  ) : error ? (
                    <span className="text-[10px] text-red-400">offline</span>
                  ) : health?.ok ? (
                    <span className="text-[10px] text-emerald-400">online</span>
                  ) : (
                    <span className="text-[10px] text-red-400">issue</span>
                  )}
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  API_BASE:{" "}
                  <code className="text-[10px] text-brand-400">
                    {API_BASE}
                  </code>
                </p>
              </div>

              <div className="text-right text-[10px] leading-4 text-gray-400">
                <div>joeOnline: {String(health?.joeOnline ?? '…')}</div>
                <div>factoryOnline: {String(health?.factoryOnline ?? '…')}</div>
              </div>
            </div>

            <div className="mt-4 bg-gray-950/60 border border-gray-800 rounded-lg p-3 max-h-48 overflow-auto text-[11px] leading-relaxed text-gray-300">
              {loading && <div>Loading…</div>}
              {error && <div className="text-red-400">Error: {error}</div>}
              {!loading && !error && (
                <pre className="whitespace-pre-wrap break-all">
                  {JSON.stringify(health, null, 2)}
                </pre>
              )}
            </div>
          </section>

          {/* Card: protected tools */}
          <section className="bg-gray-900/40 border border-gray-800 rounded-xl p-4 shadow-[0_20px_60px_rgba(0,0,0,0.8)]">
            <h2 className="text-sm font-semibold text-gray-100 flex items-center gap-2">
              <span>Admin Tools</span>
              <span className="text-[10px] text-gray-500">internal only</span>
            </h2>

            <p className="text-xs text-gray-500 mt-2 leading-relaxed">
              - Users / Roles manager (قريبًا)
              <br />- Factory panel
              <br />- Send command to Joe
            </p>

            <div className="mt-4">
              <button
                className="text-[12px] px-3 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white font-medium shadow-[0_10px_30px_rgba(90,107,255,0.4)]"
                onClick={() => {
                  alert("Command center is not wired yet 🔒")
                }}
              >
                Command Center
              </button>
            </div>
          </section>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 bg-gray-900/30 text-[10px] text-gray-600 px-4 py-3 text-center">
        InfinityX Internal • {new Date().getFullYear()}
      </footer>
    </div>
  )
}