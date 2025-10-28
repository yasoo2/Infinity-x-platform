import React, { useState, useEffect } from 'react'
import { login, getStatus, getUsers, sendJoeCommand, getSessionToken } from './api.js'

export default function App() {
  const [sessionToken, setSessionToken] = useState(getSessionToken())
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [loadingLogin, setLoadingLogin] = useState(false)
  const [loginError, setLoginError] = useState('')

  const [statusData, setStatusData] = useState(null)
  const [usersData, setUsersData] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  const [joeText, setJoeText] = useState('')
  const [joeResp, setJoeResp] = useState(null)
  const [joeSending, setJoeSending] = useState(false)

  // بعد ما يكون في sessionToken نحاول نجيب الداتا
  useEffect(() => {
    if (!sessionToken) return
    refreshAll()
  }, [sessionToken])

  async function doLogin(e) {
    e.preventDefault()
    setLoginError('')
    setLoadingLogin(true)
    try {
      const data = await login(email.trim(), password.trim())
      setSessionToken(data.sessionToken)
    } catch (err) {
      setLoginError('Incorrect email or password.')
    } finally {
      setLoadingLogin(false)
    }
  }

  async function refreshAll() {
    setRefreshing(true)
    try {
      const [s, u] = await Promise.all([
        getStatus().catch(() => null),
        getUsers().catch(() => null),
      ])
      setStatusData(s)
      setUsersData(u)
    } finally {
      setRefreshing(false)
    }
  }

  async function handleSendJoe(e) {
    e.preventDefault()
    if (!joeText.trim()) return
    setJoeSending(true)
    const resp = await sendJoeCommand(joeText.trim(), 'ar')
    setJoeResp(resp)
    setJoeText('')
    setJoeSending(false)
  }

  // ============================
  // شاشة تسجيل الدخول
  // ============================
  if (!sessionToken) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="card w-full max-w-sm">
          <h1 className="text-lg font-semibold text-white mb-1">
            InfinityX Admin
          </h1>
          <p className="text-xs text-zinc-400 mb-6">
            Sign in to continue
          </p>

          <form onSubmit={doLogin} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                className="input"
                type="email"
                placeholder="info.auraaluxury@gmail.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="label">Password</label>
              <input
                className="input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            {loginError && (
              <div className="text-xs text-red-400">
                {loginError}
              </div>
            )}

            <button
              className="btn w-full"
              disabled={loadingLogin}
            >
              {loadingLogin ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="mt-6 text-[10px] text-zinc-600 text-center">
            v1 • Xelitesolutions • Internal use only
          </div>
        </div>
      </div>
    )
  }

  // ============================
  // لوحة التحكم بعد تسجيل الدخول
  // ============================
  return (
    <div className="min-h-screen p-4 md:p-8 space-y-8">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold text-white">
            InfinityX Control Panel
          </h1>
          <p className="text-xs text-zinc-400">
            Internal dashboard (not public)
          </p>
        </div>

        <button
          className="btn text-xs bg-zinc-800 hover:bg-zinc-700 border border-zinc-600"
          onClick={refreshAll}
          disabled={refreshing}
        >
          {refreshing ? 'Refreshing…' : 'Refresh data'}
        </button>
      </header>

      {/* البلوك الأول: حالة السيستم */}
      <section className="card">
        <h2 className="text-sm font-medium text-white mb-4">
          System Status
        </h2>

        {!statusData ? (
          <div className="text-xs text-zinc-500">
            No status data.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="bg-zinc-800/40 rounded-lg p-3 border border-zinc-700/50">
              <div className="text-zinc-400 text-[10px] uppercase">
                Service
              </div>
              <div className="text-white font-medium break-all">
                {statusData.service || '—'}
              </div>
            </div>

            <div className="bg-zinc-800/40 rounded-lg p-3 border border-zinc-700/50">
              <div className="text-zinc-400 text-[10px] uppercase">
                joeOnline
              </div>
              <div className={statusData.joeOnline ? 'text-green-400' : 'text-red-400'}>
                {String(statusData.joeOnline)}
              </div>
            </div>

            <div className="bg-zinc-800/40 rounded-lg p-3 border border-zinc-700/50">
              <div className="text-zinc-400 text-[10px] uppercase">
                factoryOnline
              </div>
              <div className={statusData.factoryOnline ? 'text-green-400' : 'text-red-400'}>
                {String(statusData.factoryOnline)}
              </div>
            </div>

            <div className="bg-zinc-800/40 rounded-lg p-3 border border-zinc-700/50">
              <div className="text-zinc-400 text-[10px] uppercase">
                Raw
              </div>
              <pre className="text-[10px] text-zinc-300 whitespace-pre-wrap break-all">
                {JSON.stringify(statusData, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </section>

      {/* البلوك الثاني: المستخدمين */}
      <section className="card">
        <h2 className="text-sm font-medium text-white mb-4">
          Users
        </h2>

        {!usersData ? (
          <div className="text-xs text-zinc-500">
            No users data.
          </div>
        ) : (
          <>
            <div className="text-[10px] text-zinc-400 mb-2">
              stats: {JSON.stringify(usersData.stats || {}, null, 2)}
            </div>

            <div className="overflow-x-auto -mx-4 md:mx-0">
              <table className="min-w-[500px] w-full text-left text-xs text-zinc-300">
                <thead className="text-[10px] uppercase text-zinc-500 border-b border-zinc-700">
                  <tr>
                    <th className="py-2 pr-4 font-medium">Email</th>
                    <th className="py-2 pr-4 font-medium">Role</th>
                    <th className="py-2 pr-4 font-medium">Phone</th>
                    <th className="py-2 pr-4 font-medium">Last Login</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {Array.isArray(usersData.users) && usersData.users.length > 0 ? (
                    usersData.users.map((u, i) => (
                      <tr key={i}>
                        <td className="py-2 pr-4">{u.email || '—'}</td>
                        <td className="py-2 pr-4">{u.role || '—'}</td>
                        <td className="py-2 pr-4">{u.phone || '—'}</td>
                        <td className="py-2 pr-4">{u.lastLoginAt || '—'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="py-3 pr-4 text-zinc-500" colSpan={4}>
                        No users found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {/* البلوك الثالث: إرسال أوامر لـ Joe */}
      <section className="card">
        <h2 className="text-sm font-medium text-white mb-4">
          Send Command to Joe
        </h2>

        <form onSubmit={handleSendJoe} className="space-y-3">
          <div>
            <label className="label">Command (Arabic or English)</label>
            <textarea
              className="input min-h-[80px] resize-y"
              placeholder="اكتب أمر لجو..."
              value={joeText}
              onChange={e => setJoeText(e.target.value)}
            />
          </div>

          <button className="btn" disabled={joeSending}>
            {joeSending ? 'Sending…' : 'Send to Joe'}
          </button>
        </form>

        {joeResp && (
          <div className="mt-4 text-[10px] text-zinc-300 bg-zinc-800/40 border border-zinc-700/50 rounded-lg p-3 whitespace-pre-wrap break-all">
            {JSON.stringify(joeResp, null, 2)}
          </div>
        )}
      </section>

      <footer className="text-[10px] text-zinc-600 text-center pb-8">
        secure internal panel • do not share • {new Date().getFullYear()}
      </footer>
    </div>
  )
}