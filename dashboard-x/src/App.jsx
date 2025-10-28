import React, { useEffect, useState } from 'react'
import Header from './components/Header'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import { setSessionToken } from './api'
import { LANGS, applyDir } from './i18n'

export default function App() {
  const [lang, setLang] = useState(localStorage.getItem('xelite_lang') || 'en')
  const [token, setToken] = useState(localStorage.getItem('xelite_session') || '')
  const [user, setUser] = useState(null)
  const [help, setHelp] = useState(true)

  useEffect(()=> applyDir(lang), [lang])

  useEffect(()=>{
    if (token) setSessionToken(token)
  }, [token])

  const onLogin = (sessionToken, userObj) => {
    setToken(sessionToken)
    setUser(userObj)
    localStorage.setItem('xelite_session', sessionToken)
    setSessionToken(sessionToken)
  }

  const onLogout = () => {
    setToken('')
    setUser(null)
    localStorage.removeItem('xelite_session')
    setSessionToken(null)
  }

  return (
    <div>
      {token ? (
        <>
          <Header lang={lang} setLang={setLang} help={help} setHelp={setHelp} onLogout={onLogout} />
          <Dashboard lang={lang} token={token} user={user} />
        </>
      ) : (
        <Login lang={lang} onSuccess={onLogin} />
      )}
    </div>
  )
}
