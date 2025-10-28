import React, { useState } from 'react'
import { login, bootstrapSuper } from '../api'
import { t } from '../i18n'

export default function Login({ lang, onSuccess }) {
  const [emailOrPhone, setE] = useState('')
  const [password, setP] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const doLogin = async () => {
    setLoading(true); setErr('')
    try {
      const res = await login(emailOrPhone, password)
      if (res?.ok) {
        onSuccess(res.sessionToken, res.user)
      } else setErr('Login failed')
    } catch (e) {
      setErr(e?.response?.data?.error || 'ERROR')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="card w-full max-w-md">
        <h2 className="text-2xl font-semibold mb-6">{t(lang,'login')}</h2>

        <label className="block text-sm mb-1">{t(lang,'emailOrPhone')}</label>
        <input className="input mb-4" value={emailOrPhone} onChange={e=>setE(e.target.value)} />

        <label className="block text-sm mb-1">{t(lang,'password')}</label>
        <input className="input mb-6" type="password" value={password} onChange={e=>setP(e.target.value)} />

        {err && <div className="mb-4 text-rose-400 text-sm">{err}</div>}

        <button className="btn w-full" disabled={loading} onClick={doLogin}>
          {loading ? '…' : t(lang,'signIn')}
        </button>

        <div className="text-xs text-zinc-400 mt-4">
          {t(lang,'welcome')}
        </div>
      </div>
    </div>
  )
}
