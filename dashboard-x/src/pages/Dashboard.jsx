import React, { useEffect, useMemo, useState } from 'react'
import { getDashboardStatus, getUsers, getJoeActivity, sendJoeCommand } from '../api'
import { t } from '../i18n'
import StatCard from '../components/StatCard'

export default function Dashboard({ lang, token, user }) {
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [events, setEvents] = useState([])
  const [help, setHelp] = useState(true)
  const [cmd, setCmd] = useState('')
  const [busy, setBusy] = useState(false)

  const headers = useMemo(() => ({
    Authorization: `Bearer ${token}`
  }), [token])

  const refreshAll = async () => {
    const [st, us, ev] = await Promise.all([
      getDashboardStatus(),
      getUsers(),
      getJoeActivity()
    ])
    setStats(st?.system)
    setUsers(us?.users || [])
    setEvents(ev?.events || [])
  }

  useEffect(() => {
    refreshAll()
    const iv = setInterval(refreshAll, 5000)
    return () => clearInterval(iv)
  }, [])

  const sendCmd = async () => {
    if (!cmd.trim()) return
    setBusy(true)
    try {
      await sendJoeCommand(token, lang, cmd.trim(), false)
      setCmd('')
      await refreshAll()
    } finally { setBusy(false) }
  }

  return (
    <div className="p-6 space-y-6">
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title={`${t(lang,'totals')} - ${t(lang,'normalUsers')}`} value={stats?.usersTotal ?? '—'} />
        <StatCard title={t(lang,'activeNow')} value={stats?.activeSessions ?? '—'} />
        <StatCard title={t(lang,'redisOnline')} value="" ok={!!stats?.redisOnline} />
        <StatCard title={t(lang,'mongoOnline')} value="" ok={!!stats?.mongoOnline} />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Users */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">{t(lang,'users')}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-zinc-400">
                <tr className="[&>th]:text-left [&>th]:py-2">
                  <th>Email</th><th>Role</th><th>Last Login</th><th>Session Since</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u._id} className="[&>td]:py-2 border-t border-zinc-800">
                    <td>{u.email || '—'}</td>
                    <td>{u.role}</td>
                    <td>{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : '—'}</td>
                    <td>{u.activeSessionSince ? new Date(u.activeSessionSince).toLocaleString() : '—'}</td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan="4" className="text-zinc-500 py-4">No users yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Joe Activity + Command */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">{t(lang,'joeActivity')}</h3>
          </div>

          <div className="h-64 overflow-auto rounded-xl bg-zinc-900/60 p-3 border border-zinc-800">
            {events.map((e,i) => (
              <div key={i} className="text-sm py-1">
                <span className="text-zinc-500">{new Date(e.ts).toLocaleTimeString()} · </span>
                <span className="text-zinc-300">{e.action}</span>
                {e.detail && <span className="text-zinc-400"> — {e.detail}</span>}
              </div>
            ))}
            {events.length===0 && <div className="text-zinc-500">No events</div>}
          </div>

          <div className="mt-4 flex gap-2">
            <input
              className="input"
              placeholder={t(lang,'commandPlaceholder')}
              value={cmd}
              onChange={e=>setCmd(e.target.value)}
            />
            <button className="btn" onClick={sendCmd} disabled={busy}>{t(lang,'send')}</button>
          </div>
        </div>
      </section>
    </div>
  )
}
