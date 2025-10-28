import React from 'react'
import { t, LANGS, applyDir } from '../i18n'

export default function Header({ lang, setLang, help, setHelp, onLogout }) {
  const changeLang = (e) => {
    const v = e.target.value
    setLang(v)
    localStorage.setItem('xelite_lang', v)
    applyDir(v)
  }

  return (
    <header className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/60 sticky top-0 backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="w-3 h-3 rounded-full bg-neon-green shadow-[0_0_12px_#39FF14]"></div>
        <h1 className="text-xl font-semibold">Dashboard X</h1>
        <span className="text-zinc-400">|</span>
        <span className="text-zinc-300">{t(lang,'systemTitle')}</span>
      </div>

      <div className="flex items-center gap-3">
        <select value={lang} onChange={changeLang} className="input !w-auto">
          {Object.keys(LANGS).map(code => (
            <option key={code} value={code}>{code.toUpperCase()}</option>
          ))}
        </select>

        <button
          className={`btn ${help ? 'bg-neon-green/20' : 'bg-zinc-700/50'}`}
          onClick={() => setHelp(!help)}
          title="Toggle Help"
        >
          {help ? t(lang,'helpOn') : t(lang,'helpOff')}
        </button>

        <button className="btn" onClick={onLogout}>{t(lang,'logout')}</button>
      </div>
    </header>
  )
}
