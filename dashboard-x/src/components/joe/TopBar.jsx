import React from 'react';
import { FiMaximize2, FiLogOut, FiSidebar, FiActivity, FiUsers, FiTerminal } from 'react-icons/fi';
import { Sparkles, Key, ExternalLink, Search as SearchIcon } from 'lucide-react';
import { getAIProviders, validateAIKey, activateAIProvider } from '../../api/system';
import apiClient from '../../api/client';

const DEFAULT_AI_PROVIDERS = [
  { id: 'openai', name: 'OpenAI', siteUrl: 'https://openai.com', createUrl: 'https://platform.openai.com/api-keys', defaultModel: 'gpt-4o', color: '#10a37f', icon: '🟢', region: 'global', logo: 'https://logo.clearbit.com/openai.com' },
  { id: 'gemini', name: 'Google Gemini', siteUrl: 'https://ai.google.dev', createUrl: 'https://aistudio.google.com/app/apikey', defaultModel: 'gemini-1.5-pro-latest', color: '#7c3aed', icon: '🔷', region: 'global', logo: 'https://logo.clearbit.com/google.com' },
  { id: 'anthropic', name: 'Anthropic Claude', siteUrl: 'https://www.anthropic.com', createUrl: 'https://console.anthropic.com/account/keys', defaultModel: 'claude-3-5-sonnet-latest', color: '#f59e0b', icon: '🟡', region: 'global', logo: 'https://logo.clearbit.com/anthropic.com' },
  { id: 'mistral', name: 'Mistral AI', siteUrl: 'https://mistral.ai', createUrl: 'https://console.mistral.ai/api-keys/', defaultModel: 'mistral-large-latest', color: '#2563eb', icon: '🔵', region: 'global', logo: 'https://logo.clearbit.com/mistral.ai' },
  { id: 'cohere', name: 'Cohere', siteUrl: 'https://cohere.com', createUrl: 'https://dashboard.cohere.com/api-keys', defaultModel: 'command-r-plus', color: '#ef4444', icon: '🔴', region: 'global', logo: 'https://logo.clearbit.com/cohere.com' },
  { id: 'groq', name: 'Groq', siteUrl: 'https://groq.com', createUrl: 'https://console.groq.com/keys', defaultModel: 'llama3-70b-8192', color: '#dc2626', icon: '⚡', region: 'global', logo: 'https://logo.clearbit.com/groq.com' },
  { id: 'openrouter', name: 'OpenRouter', siteUrl: 'https://openrouter.ai', createUrl: 'https://openrouter.ai/settings/keys', defaultModel: 'openrouter/auto', color: '#84cc16', icon: '🔀', region: 'global', logo: 'https://logo.clearbit.com/openrouter.ai' },
];

import PropTypes from 'prop-types';
import { useSessionToken } from '../../hooks/useSessionToken';
import { useNavigate } from 'react-router-dom';

const TopBar = ({ onToggleLeft, isLeftOpen, onToggleStatus, isStatusOpen, onToggleBorderSettings, isBorderSettingsOpen, isSuperAdmin, onToggleRight: _onToggleRight, isRightOpen: _isRightOpen, onToggleLogs, isLogsOpen }) => {
  const { clearToken } = useSessionToken();
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);
  const brandRef = React.useRef(null);
  const [eyeOffset, setEyeOffset] = React.useState({ x: 0, y: 0 });
  const [activity, setActivity] = React.useState('ready');
  const [outfit, setOutfit] = React.useState('suit');
  const [mascotScale] = React.useState(1);
  const [lang, setLang] = React.useState(() => {
    try { return localStorage.getItem('lang') === 'ar' ? 'ar' : 'en'; } catch { return 'en'; }
  });
  const [offlineReady, setOfflineReady] = React.useState(false);
  const [runtimeStage, setRuntimeStage] = React.useState('');
  
  const [version, setVersion] = React.useState('');
  const [runtimeMode, setRuntimeMode] = React.useState('online');
  
  React.useEffect(() => {
    const onLang = () => {
      try { setLang(localStorage.getItem('lang') === 'ar' ? 'ar' : 'en'); } catch { void 0; }
    };
    window.addEventListener('joe:lang', onLang);
    return () => window.removeEventListener('joe:lang', onLang);
  }, []);
  const toggleLang = () => {
    const next = lang === 'ar' ? 'en' : 'ar';
    try { localStorage.setItem('lang', next); } catch { void 0; }
    setLang(next);
    try { window.dispatchEvent(new CustomEvent('joe:lang', { detail: { lang: next } })); } catch { void 0; }
    try { window.dispatchEvent(new CustomEvent('global:lang', { detail: { lang: next } })); } catch { void 0; }
    try { document.documentElement.setAttribute('lang', next); } catch { void 0; }
  };
  React.useEffect(() => {
    (async () => {
      try {
        const { data } = await apiClient.get('/api/v1/runtime-mode/status');
        const offlineReady = Boolean(data?.offlineReady);
        const mode = String(data?.mode || 'online');
        const stage = String(data?.stage || '');
        const modelPath = String(data?.modelPath || '');
        setOfflineReady(offlineReady);
        setRuntimeMode(mode);
        setRuntimeStage(stage);
        if (data?.version) setVersion(String(data.version));
        try { window.__joeRuntimeStatus = { offlineReady, mode, hasProvider: Boolean(data?.hasProvider), stage, modelPath }; } catch { /* noop */ }
      } catch (e) {
        try {
          const { data } = await apiClient.get('/api/v1/health');
          const mode = String(data?.mode || 'online');
          setRuntimeMode(mode);
          setOfflineReady(Boolean(data?.offlineReady));
          if (data?.ai?.activeProvider) {
            setRuntimeStage('online');
          }
        } catch { /* noop */ }
      }
    })();
  }, []);

  React.useEffect(() => {
    let timer = null;
    const shouldPoll = (!offlineReady || (runtimeStage && runtimeStage !== 'done'));
    if (shouldPoll) {
      timer = setInterval(async () => {
        try {
          const { data } = await apiClient.get('/api/v1/runtime-mode/status');
          setOfflineReady(Boolean(data?.offlineReady));
          setRuntimeStage(String(data?.stage || ''));
          
          setRuntimeMode(String(data?.mode || 'online'));
        } catch {
          try {
            const { data } = await apiClient.get('/api/v1/health');
            setRuntimeMode(String(data?.mode || 'online'));
            setOfflineReady(Boolean(data?.offlineReady));
          } catch { /* noop */ }
        }
      }, 1200);
    }
    return () => { if (timer) clearInterval(timer); };
  }, [offlineReady, runtimeStage]);
  React.useEffect(() => {
    const onRuntime = (e) => {
      const m = e?.detail?.mode;
      if (m) setRuntimeMode(String(m));
    };
    window.addEventListener('joe:runtime', onRuntime);
    return () => window.removeEventListener('joe:runtime', onRuntime);
  }, []);
  const onBrandMouseMove = (e) => {
    if (!brandRef.current) return;
    const rect = brandRef.current.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    const scaleX = 8 / rect.width;
    const scaleY = 8 / rect.height;
    const x = Math.max(-3, Math.min(3, dx * scaleX));
    const y = Math.max(-3, Math.min(3, dy * scaleY));
    setEyeOffset({ x, y });
  };

  React.useEffect(() => {
    const activities = ['ready', 'idle', 'think', 'happy', 'walk', 'dance', 'build', 'layout', 'deploy'];
    let i = 0;
    const timer = setInterval(() => {
      i = (i + 1) % activities.length;
      setActivity(activities[i]);
    }, 14000);
    const outfits = ['suit', 'sport', 'casual'];
    let oi = 0;
    const outfitTimer = setInterval(() => {
      oi = (oi + 1) % outfits.length;
      setOutfit(outfits[oi]);
    }, 45000);
    const onProc = (e) => {
      const p = e.detail?.processing;
      if (p) setActivity('think'); else setActivity('ready');
    };
    window.addEventListener('joe:processing', onProc);
    return () => {
      clearInterval(timer);
      clearInterval(outfitTimer);
      window.removeEventListener('joe:processing', onProc);
    };
  }, []);

  const handleExit = () => {
    clearToken();
    // Redirect to the root of the domain, which is the public site
    window.location.href = '/';
  };
  const [okKey, setOkKey] = React.useState(null);
  const [okKind, setOkKind] = React.useState('success');
  const okPulse = (key, kind = 'success') => { setOkKey(key); setOkKind(kind); setTimeout(() => { setOkKey(null); setOkKind('success'); }, 800); };
  return (
    <div className="bg-gray-900 h-14 flex-shrink-0 flex items-center justify-between px-6 border-b border-gray-800">
      {/* Left: Title */}
      <div className="flex items-center">
        <style>{`
          .joe-brand { display:flex; align-items:center; gap:8px; }
          .joe-brand .text { font-size: 24px; font-weight: 800; color: #fff; text-transform: lowercase; letter-spacing: 0.02em; }
          .joe-brand .text span { color: #eab308; }
          .joe-brand .cube { width: 56px; height: 56px; background: linear-gradient(135deg, #eab308, #fbbf24); position: relative; border-radius: 12px; transform-style: preserve-3d; animation: cubeSpin 4s infinite linear, cubeBounce 3s infinite ease-in-out; box-shadow: 0 0 22px rgba(234, 179, 8, 0.6); overflow: visible; }
          .joe-brand .eyes { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); display: flex; gap: 8px; z-index: 10; }
          .joe-brand .eye { width: 14px; height: 14px; background: #fff; border: 2px solid #eab308; border-radius: 50%; display: grid; place-items: center; }
          .joe-brand .pupil { width: 5px; height: 5px; background: #000; border-radius: 50%; transform: translate(var(--eyeX, 0), var(--eyeY, 0)); animation: pupilWander 4s infinite ease-in-out; }
          .joe-brand .limbs { position: absolute; inset: 0; pointer-events: none; }
          .joe-brand .arm { position: absolute; width: 22px; height: 6px; background: #eab308; border-radius: 3px; }
          .joe-brand .arm.left { left: -10px; top: 20px; transform-origin: right center; }
          .joe-brand .arm.right { right: -10px; top: 20px; transform-origin: left center; }
          .joe-brand .watch { position: absolute; width: 8px; height: 8px; background: #1f2937; border: 2px solid #fff; border-radius: 50%; right: 4px; top: -2px; box-shadow: 0 0 8px rgba(255,255,255,0.4); }
          .joe-brand .hand { width: 6px; height: 6px; background: #eab308; border-radius: 50%; position: absolute; right: -3px; top: -1px; }
          .joe-brand .leg { position: absolute; width: 8px; height: 20px; background: #eab308; border-radius: 3px; bottom: -6px; }
          .joe-brand .leg.left { left: 16px; transform-origin: top center; }
          .joe-brand .leg.right { right: 16px; transform-origin: top center; }
          .joe-brand .shoe { position: absolute; width: 12px; height: 6px; background: #111; border: 2px solid #fff; border-radius: 3px; bottom: -8px; }
          .joe-brand .shoe.left { left: 12px; }
          .joe-brand .shoe.right { right: 12px; }
          .joe-brand .mouth { position: absolute; top: 34px; left: 50%; transform: translateX(-50%); width: 10px; height: 6px; background: #000; border-radius: 0 0 6px 6px; z-index: 11; }
          .joe-brand .snack { position: absolute; width: 8px; height: 8px; background: #fbbf24; border-radius: 2px; top: -6px; left: 50%; transform: translateX(-50%); display: none; }
          .joe-brand .cup { position: absolute; width: 12px; height: 16px; background: #8b5cf6; border: 2px solid #eab308; border-radius: 2px; top: -10px; right: -18px; display: none; }
          .joe-brand .steam { position: absolute; width: 2px; height: 10px; background: linear-gradient(180deg, rgba(255,255,255,0.8), rgba(255,255,255,0)); top: -10px; left: 3px; opacity: 0; }
          .joe-brand .steam.two { left: 7px; }
          .joe-brand .ball { position: absolute; width: 10px; height: 10px; background: #111; border: 2px solid #fff; border-radius: 50%; bottom: -6px; left: 6px; display: none; }
          .joe-brand .shirt { position: absolute; bottom: 0; left: 0; right: 0; height: 26px; border-radius: 0 0 12px 12px; }
          .joe-brand .tie { position: absolute; top: 22px; left: 50%; transform: translateX(-50%); width: 6px; height: 20px; background: #c026d3; border-radius: 3px; }
          .joe-brand .headband { position: absolute; top: 10px; left: 8px; right: 8px; height: 6px; background: #0ea5e9; border-radius: 6px; }
          .joe-brand .badge { position: absolute; top: 28px; right: 8px; width: 10px; height: 10px; background: #22c55e; border-radius: 50%; }
          @keyframes cubeSpin { 0% { transform: rotateX(0deg) rotateY(0deg); } 100% { transform: rotateX(360deg) rotateY(360deg); } }
          @keyframes cubeBounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-2px); } }
          @keyframes pupilWander { 0%, 100% { transform: translate(0, 0); } 25% { transform: translate(2px, 1px); } 50% { transform: translate(-1px, -2px); } 75% { transform: translate(1px, -1px); } }
          @keyframes waveRight { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(35deg); } }
          @keyframes waveLeft { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(-35deg); } }
          @keyframes stepLeft { 0%, 100% { transform: rotate(0deg) translateY(0); } 50% { transform: rotate(-12deg) translateY(2px); } }
          @keyframes stepRight { 0%, 100% { transform: rotate(0deg) translateY(0); } 50% { transform: rotate(12deg) translateY(-2px); } }
          @keyframes walkPath { 0% { transform: translateX(0); } 50% { transform: translateX(60px); } 100% { transform: translateX(0); } }
          @keyframes ballMove { 0% { left: 6px; } 50% { left: 40px; } 100% { left: 6px; } }
          @keyframes snackToMouth { 0% { top: -6px; } 50% { top: 30px; } 100% { top: -6px; } }
          @keyframes drinkToMouth { 0% { top: -8px; right: -16px; } 50% { top: 26px; right: 8px; } 100% { top: -8px; right: -16px; } }
          @keyframes thinkGlow { 0%,100% { box-shadow: 0 0 26px rgba(234,179,8,0.6); } 50% { box-shadow: 0 0 40px rgba(234,179,8,0.9); } }
          @keyframes steamUp { 0% { opacity: 0; transform: translateY(0); } 50% { opacity: 1; transform: translateY(-8px); } 100% { opacity: 0; transform: translateY(-14px); } }
          @keyframes watchGlow { 0%, 100% { box-shadow: 0 0 8px rgba(255,255,255,0.4); } 50% { box-shadow: 0 0 16px rgba(255,255,255,0.8); } }
          .joe-brand[data-activity='wave'] .arm.left { animation: waveLeft 2s infinite ease-in-out; }
          .joe-brand[data-activity='wave'] .arm.right { animation: waveRight 2s infinite ease-in-out; }
          .joe-brand[data-activity='dance'] .leg.left { animation: stepLeft 1.2s infinite ease-in-out; }
          .joe-brand[data-activity='dance'] .leg.right { animation: stepRight 1.2s infinite ease-in-out; }
          .joe-brand[data-activity='dance'] .cube { animation-duration: 3s; }
          .joe-brand[data-activity='walk'] .cube { animation: walkPath 6s infinite linear; }
          .joe-brand[data-activity='workout'] .arm.left, .joe-brand[data-activity='workout'] .arm.right { animation: waveRight 1.2s infinite alternate ease-in-out; }
          .joe-brand[data-activity='football'] .ball { animation: ballMove 2s infinite linear; display: block; }
          .joe-brand[data-activity='eat'] .snack { animation: snackToMouth 2.2s infinite ease-in-out; display: block; }
          .joe-brand[data-activity='drink'] .cup { animation: drinkToMouth 2.2s infinite ease-in-out; display: block; }
          .joe-brand[data-activity='coffee'] .cup { animation: drinkToMouth 2.2s infinite ease-in-out; display: block; }
          .joe-brand[data-activity='coffee'] .steam { animation: steamUp 1.6s infinite; }
          .joe-brand[data-activity='watch'] .arm.right { transform: rotate(40deg); }
          .joe-brand[data-activity='watch'] .watch { animation: watchGlow 2s infinite; }
          .joe-brand[data-activity='think'] .cube { animation: cubeSpin 6s infinite linear, cubeBounce 3s infinite ease-in-out, thinkGlow 2.5s infinite; }
          .joe-brand[data-activity='sit'] .chair { display: block; }
          .joe-brand[data-activity='sit'] .leg.left { transform: rotate(70deg) translateY(2px); }
          .joe-brand[data-activity='sit'] .leg.right { transform: rotate(-70deg) translateY(2px); }
          .joe-brand[data-outfit='suit'] .shirt { background: linear-gradient(180deg, #111, #1f2937); }
          .joe-brand[data-outfit='suit'] .tie { display: block; }
          .joe-brand[data-outfit='suit'] .headband { display: none; }
          .joe-brand[data-outfit='suit'] .badge { display: none; }
          .joe-brand[data-outfit='sport'] .shirt { background: linear-gradient(180deg, #0ea5e9, #1d4ed8); }
          .joe-brand[data-outfit='sport'] .headband { display: block; }
          .joe-brand[data-outfit='sport'] .tie { display: none; }
          .joe-brand[data-outfit='sport'] .badge { display: none; }
          .joe-brand[data-outfit='casual'] .shirt { background: linear-gradient(180deg, #f59e0b, #f97316); }
          .joe-brand[data-outfit='casual'] .badge { display: block; }
          .joe-brand[data-outfit='casual'] .tie, .joe-brand[data-outfit='casual'] .headband { display: none; }
          .joe-brand .cat { width: 42px; height: 42px; position: relative; border-radius: 12px; background: radial-gradient(circle at 30% 30%, #ffffff 0 16px, transparent 16px), radial-gradient(circle at 70% 60%, #b45309 0 14px, transparent 14px), linear-gradient(135deg, #ffffff, #b45309); box-shadow: 0 0 18px rgba(234, 179, 8, 0.6); overflow: visible; }
          .joe-brand .ear { position: absolute; width: 12px; height: 12px; background: #b45309; top: -6px; border-radius: 2px; transform: rotate(45deg); }
          .joe-brand .ear.left { left: 2px; }
          .joe-brand .ear.right { right: 2px; }
          .joe-brand .face { position: absolute; inset: 6px; border-radius: 10px; }
          .joe-brand .whiskers { position: absolute; width: 22px; height: 10px; top: 26px; }
          .joe-brand .whiskers.left { left: -10px; }
          .joe-brand .whiskers.right { right: -10px; }
          .joe-brand .whiskers span { position: absolute; width: 12px; height: 2px; background: #fff; }
          .joe-brand .whiskers span:nth-child(1) { top: 0; }
          .joe-brand .whiskers span:nth-child(2) { top: 4px; }
          .joe-brand .whiskers span:nth-child(3) { top: 8px; }
          .joe-brand .tail { position: absolute; width: 26px; height: 6px; background: #b45309; border-radius: 6px; right: -16px; bottom: 8px; transform-origin: left center; }
          @keyframes tailSway { 0%,100% { transform: rotate(0deg); } 50% { transform: rotate(20deg); } }
          .joe-brand[data-activity='wave'] .tail { animation: tailSway 2s infinite ease-in-out; }
          .joe-brand[data-activity='walk'] .cat { animation: walkPath 6s infinite linear; }
          .joe-brand[data-activity='dance'] .cat { animation-duration: 3s; }
          .joe-brand[data-activity='think'] .cat { animation: cubeBounce 3s infinite ease-in-out, thinkGlow 2.5s infinite; }

          .joe-brand .cube { width: 42px; height: 42px; border-radius: 10px; box-shadow: 0 0 18px rgba(234, 179, 8, 0.6); }
          .joe-brand .eye { width: 12px; height: 12px; }
          .joe-brand .arm { width: 20px; height: 5px; }
          .joe-brand .arm.left { left: -8px; top: 16px; }
          .joe-brand .arm.right { right: -8px; top: 16px; }
          .joe-brand .leg { width: 7px; height: 16px; bottom: -6px; }
          .joe-brand .leg.left { left: 12px; }
          .joe-brand .leg.right { right: 12px; }
          .joe-brand .shoe { position: absolute; width: 12px; height: 6px; background: #111; border: 2px solid #fff; border-radius: 3px; bottom: -8px; }
          .joe-brand .shoe.left { left: 8px; }
          .joe-brand .shoe.right { right: 8px; }
          .joe-brand .phone { position: absolute; width: 12px; height: 18px; background: #111; border: 2px solid #fff; border-radius: 3px; top: -6px; right: -20px; display: none; }
          .joe-brand .laptop { position: absolute; width: 40px; height: 20px; background: #1f2937; border: 2px solid #0ea5e9; border-radius: 4px; bottom: -20px; left: -6px; display: none; }
          .joe-brand .laptop .lid { position: absolute; width: 38px; height: 2px; background: #0ea5e9; top: -2px; left: 1px; transform-origin: left center; }
          .joe-brand .pillow { position: absolute; width: 48px; height: 14px; background: #e5e7eb; border: 2px solid #9ca3af; border-radius: 8px; bottom: -14px; left: -4px; display: none; }
          .joe-brand .zzz { position: absolute; top: -8px; right: -6px; width: 20px; height: 20px; display: none; }
          .joe-brand .zzz span { position: absolute; width: 6px; height: 6px; color: #fff; }
          @keyframes steamUp { 0% { opacity: 0; transform: translateY(0); } 50% { opacity: 1; transform: translateY(-8px); } 100% { opacity: 0; transform: translateY(-14px); } }
          @keyframes phoneToEar { 0% { top: -6px; right: -20px; } 50% { top: 12px; right: 4px; } 100% { top: -6px; right: -20px; } }
          @keyframes laptopOpen { 0% { transform: rotate(0deg); } 100% { transform: rotate(50deg); } }
          @keyframes sleepZ { 0% { opacity: 0; transform: translateY(0); } 50% { opacity: 1; transform: translateY(-8px); } 100% { opacity: 0; transform: translateY(-16px); } }
          .joe-brand[data-activity='coffee'] .cup { animation: drinkToMouth 2.2s infinite ease-in-out; display: block; }
          .joe-brand[data-activity='coffee'] .steam { animation: steamUp 1.6s infinite; }
          .joe-brand[data-activity='phone'] .phone { display: block; animation: phoneToEar 2.2s infinite ease-in-out; }
          .joe-brand[data-activity='laptop'] .laptop { display: block; }
          .joe-brand[data-activity='laptop'] .laptop .lid { animation: laptopOpen 1.8s infinite alternate ease-in-out; }
          .joe-brand[data-activity='sleep'] .pillow { display: block; }
          .joe-brand[data-activity='sleep'] .zzz { display: block; }
          .joe-brand[data-activity='sleep'] .zzz span { animation: sleepZ 1.6s infinite; }
          .joe-brand[data-activity='sleep'] .pupil { display: none; }
          .joe-brand[data-activity='sleep'] .eye { height: 4px; background: #000; border-radius: 6px; }
          
        `}</style>
        <style>{`
          .joe-brand .mascot { width:48px; height:48px; position:relative; border-radius:12px; background: radial-gradient(circle at 50% 50%, #0b1220 40%, #111827 100%); box-shadow: 0 0 18px rgba(234,179,8,0.55); display:grid; place-items:center; margin-right:4px; }
          .joe-brand .mascot .ring { position:absolute; inset:-2px; border-radius:50%; border:2px solid transparent; background: conic-gradient(from 0deg, #eab308, #fbbf24) border-box; -webkit-mask: linear-gradient(#000 0 0) padding-box, linear-gradient(#000 0 0); -webkit-mask-composite: destination-out; mask-composite: exclude; }
          .joe-brand .mascot .face { position:relative; width:32px; height:18px; display:flex; justify-content:space-between; align-items:center; }
          .joe-brand .mascot .eye { width:12px; height:12px; background:#fff; border:2px solid #eab308; border-radius:50%; display:grid; place-items:center; overflow:hidden; }
          .joe-brand .mascot .eye::after { content:''; position:absolute; top:-12px; left:0; right:0; height:12px; background:#0b1220; border-bottom:2px solid #eab308; animation: blink 6s infinite; }
          .joe-brand .mascot .pupil { width:5px; height:5px; background:#000; border-radius:50%; transform: translate(var(--eyeX,0), var(--eyeY,0)); transition: transform 80ms linear; }
          .joe-brand .mascot .mouth { position:absolute; bottom:-2px; left:50%; transform: translateX(-50%); width:12px; height:6px; background:#111; border:2px solid #eab308; border-radius:0 0 8px 8px; }
          @keyframes blink { 0%, 10%, 12%, 100% { transform: translateY(0); } 11% { transform: translateY(12px); } }
          @keyframes ringGlow { 0%,100% { filter: drop-shadow(0 0 10px rgba(234,179,8,0.6)); } 50% { filter: drop-shadow(0 0 18px rgba(234,179,8,0.9)); } }
          @keyframes walk { 0% { transform: translateX(0); } 50% { transform: translateX(60px); } 100% { transform: translateX(0); } }
          @keyframes pulse { 0%,100% { opacity: 0.85; transform: scale(1); } 50% { opacity: 1; transform: scale(1.06); } }
          @keyframes dance { 0%,100% { transform: rotate(0); } 25% { transform: rotate(-6deg); } 75% { transform: rotate(6deg); } }
          .joe-brand[data-activity='think'] .mascot .ring { animation: ringGlow 2.2s ease-in-out infinite; }
          .joe-brand[data-activity='walk'] .mascot { animation: walk 6s linear infinite; }
          .joe-brand[data-activity='deploy'] .mascot .ring { animation: pulse 1.6s ease-in-out infinite; }
          .joe-brand[data-activity='dance'] .mascot { animation: dance 1.4s ease-in-out infinite; }
          .joe-brand[data-activity='build'] .mascot .mouth { animation: pulse 1.2s ease-in-out infinite; }
          @keyframes layout { 0%,100% { transform: scale(1); } 50% { transform: scale(1.04); } }
          .joe-brand[data-activity='layout'] .mascot .face { animation: layout 2s ease-in-out infinite; }
          .joe-brand[data-activity='ready'] .mascot .ring { animation: pulse 2.2s ease-in-out infinite; }
          .joe-brand[data-activity='happy'] .mascot .ring { animation: ringGlow 2s ease-in-out infinite; }
          .joe-brand[data-activity='happy'] .mascot .mouth { animation: layout 1.6s ease-in-out infinite; }
        `}</style>
        <div className="joe-brand" ref={brandRef} onMouseMove={onBrandMouseMove} style={{ '--eyeX': `${eyeOffset.x}px`, '--eyeY': `${eyeOffset.y}px`, transform: `scale(${mascotScale})` }} data-activity={activity} data-outfit={outfit}>
          <div className="text">jo<span>e</span></div>
          <div className="mascot">
            <div className="ring"></div>
            <div className="face">
              <div className="eye left"><div className="pupil"></div></div>
              <div className="eye right"><div className="pupil"></div></div>
              <div className="mouth"></div>
            </div>
          </div>
        </div>
        </div>

        {/* Right: Control Buttons */}
      <div className="flex items-center gap-1.5">
        {/* Providers Button Only */}
        {/* Providers Button */}
        <AIMenuButton runtimeMode={runtimeMode} />
        <button
          type="button"
          className={`p-1.5 px-2 h-7 inline-flex items-center justify-center rounded-lg transition-colors border bg-gray-800 text-yellow-400 hover:bg-gray-700 border-yellow-600/40`}
          title={lang==='ar'?'الإصدار':'Version'}
        >
          <span className="text-[11px] font-semibold">{`V${version || '...'}`}</span>
        </button>
        
        <div className="relative inline-flex items-center">
        <button
          onClick={() => { okPulse('left','toggle'); onToggleLeft(); }}
          className={`p-1.5 w-7 h-7 inline-flex items-center justify-center rounded-lg transition-colors ${
            isLeftOpen ? 'bg-yellow-600 text-black hover:bg-yellow-700' : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-yellow-600/40'
          }`}
          title={isLeftOpen ? (lang==='ar'?'إخفاء لوحة المحادثات':'Hide Chats Panel') : (lang==='ar'?'إظهار لوحة المحادثات':'Show Chats Panel')}
        >
          <FiSidebar size={14} />
        </button>
        {okKey==='left' && (<span className={`absolute -top-1 -right-1 text-[10px] px-1 py-0.5 rounded-full ${okKind==='toggle' ? 'bg-yellow-500 border-yellow-400' : 'bg-green-600 border-green-500'} text-black shadow-sm`}>✓</span>)}
        </div>


        {/* Toggle System Status Panel */}
        <div className="relative inline-flex items-center">
        <button
          onClick={() => { okPulse('status','toggle'); onToggleStatus(); }}
          className={`p-1.5 w-7 h-7 inline-flex items-center justify-center rounded-lg transition-colors ${
            isStatusOpen 
              ? 'bg-yellow-600 text-black hover:bg-yellow-700' 
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-yellow-600/40'
          }`}
          title={isStatusOpen ? (lang==='ar'?'إخفاء حالة النظام':'Hide System Status') : (lang==='ar'?'إظهار حالة النظام':'Show System Status')}
        >
          <FiActivity size={14} />
        </button>
        {okKey==='status' && (<span className={`absolute -top-1 -right-1 text-[10px] px-1 py-0.5 rounded-full ${okKind==='toggle' ? 'bg-yellow-500 border-yellow-400' : 'bg-green-600 border-green-500'} text-black shadow-sm`}>✓</span>)}
        </div>

        <div className="relative inline-flex items-center">
        <button
          onClick={() => { okPulse('logs','toggle'); onToggleLogs(); }}
          className={`p-1.5 w-7 h-7 inline-flex items-center justify-center rounded-lg transition-colors ${
            isLogsOpen 
              ? 'bg-yellow-600 text-black hover:bg-yellow-700' 
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-yellow-600/40'
          }`}
          title={lang==='ar'?'سجلّ النظام':'Logs'}
        >
          <FiTerminal size={14} />
        </button>
        {okKey==='logs' && (<span className={`absolute -top-1 -right-1 text-[10px] px-1 py-0.5 rounded-full ${okKind==='toggle' ? 'bg-yellow-500 border-yellow-400' : 'bg-green-600 border-green-500'} text-black shadow-sm`}>✓</span>)}
        </div>

        {isSuperAdmin && (
          <div className="relative">
            <div className="relative inline-flex items-center">
            <button
              onClick={() => { okPulse('users','toggle'); setUserMenuOpen((v) => !v); }}
              className={`p-1.5 w-7 h-7 inline-flex items-center justify-center rounded-lg transition-colors ${
                userMenuOpen || isBorderSettingsOpen
                  ? 'bg-yellow-600 text-black hover:bg-yellow-700'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-yellow-600/40'
              }`}
              title="إدارة المستخدمين"
            >
              <FiUsers size={14} />
            </button>
            {okKey==='users' && (<span className={`absolute -top-1 -right-1 text-[10px] px-1 py-0.5 rounded-full ${okKind==='toggle' ? 'bg-yellow-500 border-yellow-400' : 'bg-green-600 border-green-500'} text-black shadow-sm`}>✓</span>)}
            </div>
            {userMenuOpen && (
              <div className="absolute right-0 top-12 z-50 w-56 bg-gray-900 border border-yellow-600/40 rounded-lg shadow-xl p-2">
                <button
                  onClick={() => { setUserMenuOpen(false); navigate('/dashboard/users'); }}
                  className="w-full text-right px-3 py-2 rounded bg-gray-800 text-white hover:bg-gray-700"
                >
                  فتح صفحة المستخدمين
                </button>
                <button
                  onClick={() => { setUserMenuOpen(false); navigate('/dashboard/super-admin'); }}
                  className="w-full text-right px-3 py-2 rounded bg-gray-800 text-white hover:bg-gray-700 mt-1"
                >
                  إدارة متقدمة
                </button>
                <button
                  onClick={() => { setUserMenuOpen(false); onToggleBorderSettings(); }}
                  className="w-full text-right px-3 py-2 rounded bg-gray-800 text-white hover:bg-gray-700 mt-1"
                >
                  {isBorderSettingsOpen ? 'إخفاء إدارة داخل Joe' : 'إظهار إدارة داخل Joe'}
                </button>
              </div>
            )}
          </div>
        )}

        

        {/* Language Toggle */}
        <div className="relative inline-flex items-center">
        <button
          onClick={() => { okPulse('lang','toggle'); toggleLang(); }}
          className="p-1.5 w-7 h-7 inline-flex items-center justify-center rounded-lg bg-yellow-600 hover:bg-yellow-700 text-black border border-yellow-600 transition-colors"
          title={lang === 'ar' ? 'AR' : 'EN'}
        >
          <span className="text-[11px] font-semibold">{lang === 'ar' ? 'AR' : 'EN'}</span>
        </button>
        {okKey==='lang' && (<span className={`absolute -top-1 -right-1 text-[10px] px-1 py-0.5 rounded-full ${okKind==='toggle' ? 'bg-yellow-500 border-yellow-400' : 'bg-green-600 border-green-500'} text-black shadow-sm`}>✓</span>)}
        </div>

        {/* Mascot Size Slider removed as requested */}

        <div className="hidden md:flex items-center gap-2 px-2 py-1 bg-gray-800 text-gray-300 border border-yellow-600/40 rounded-lg" title={lang==='ar'?'حالة الأوفلاين':'Offline State'}>
          <span className={`${offlineReady ? 'text-green-400' : 'text-gray-400'} text-xs`}>{offlineReady ? (lang==='ar'?'جاهز':'Ready') : (lang==='ar'?'غير جاهز':'Not Ready')}</span>
        </div>

        

        {/* Fullscreen Toggle (Optional) */}
        <div className="relative inline-flex items-center">
        <button
          onClick={() => {
            okPulse('fs','toggle');
            if (document.fullscreenElement) {
              document.exitFullscreen();
            } else {
              document.documentElement.requestFullscreen();
            }
          }}
          className="p-1.5 w-7 h-7 inline-flex items-center justify-center rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 border border-yellow-600/40 transition-colors"
          title={lang==='ar'?'ملء الشاشة':'Toggle Fullscreen'}
        >
          <FiMaximize2 size={14} />
        </button>
        {okKey==='fs' && (<span className={`absolute -top-1 -right-1 text-[10px] px-1 py-0.5 rounded-full ${okKind==='toggle' ? 'bg-yellow-500 border-yellow-400' : 'bg-green-600 border-green-500'} text-black shadow-sm`}>✓</span>)}
        </div>

        <div className="relative inline-flex items-center">
        <button
          onClick={() => { okPulse('exit','success'); handleExit(); }}
          className={`p-1.5 w-7 h-7 inline-flex items-center justify-center rounded-lg transition-colors bg-red-600 text-white hover:bg-red-700`}
          title={lang==='ar'?'خروج إلى الرئيسية':'Exit to Home (Logout)'}
        >
          <FiLogOut size={14} />
        </button>
        {okKey==='exit' && (<span className={`absolute -top-1 -right-1 text-[10px] px-1 py-0.5 rounded-full ${okKind==='toggle' ? 'bg-yellow-500 border-yellow-400' : 'bg-green-600 border-green-500'} text-black shadow-sm`}>✓</span>)}
        </div>
      </div>
    </div>
  );
};

TopBar.propTypes = {
  onToggleRight: PropTypes.func.isRequired,
  isRightOpen: PropTypes.bool.isRequired,
  onToggleLeft: PropTypes.func.isRequired,
  isLeftOpen: PropTypes.bool.isRequired,
  onToggleStatus: PropTypes.func.isRequired,
  isStatusOpen: PropTypes.bool.isRequired,
  onToggleBorderSettings: PropTypes.func.isRequired,
  onToggleLogs: PropTypes.func.isRequired,
  isLogsOpen: PropTypes.bool.isRequired,
  isBorderSettingsOpen: PropTypes.bool.isRequired,
  isSuperAdmin: PropTypes.bool,
};

const AIMenuButton = ({ runtimeMode }) => {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [providers, setProviders] = React.useState([]);
  const [active, setActive] = React.useState({ provider: null, model: null });
  const [keys, setKeys] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem('aiProviderKeys') || '{}'); } catch { return {}; }
  });
  const [valid, setValid] = React.useState({});
  const [validationError, setValidationError] = React.useState({});
  const [activationError, setActivationError] = React.useState({});
  const [logoError, setLogoError] = React.useState({});
  const [search, setSearch] = React.useState('');
  const [region, setRegion] = React.useState('all');
  const [detailId, setDetailId] = React.useState(null);
  const buttonRef = React.useRef(null);

  const providersAbortRef = React.useRef(null);
  const loadProviders = async () => {
    setLoading(true);
    try {
      if (providersAbortRef.current) { try { providersAbortRef.current.abort(); } catch { /* ignore */ } }
      const controller = new AbortController();
      providersAbortRef.current = controller;
      const data = await getAIProviders({ signal: controller.signal });
      const allowedMap = Object.fromEntries(DEFAULT_AI_PROVIDERS.map(p => [p.id, p]));
      const list = (data.providers || [])
        .map(p => ({ ...allowedMap[p.id], ...p }))
        .filter(p => !!allowedMap[p.id]);
      setProviders(list);
      setActive({ provider: data.activeProvider, model: data.activeModel });
    } catch (err) {
      const m = String(err?.message || '');
      if (/canceled|abort(ed)?/i.test(m)) { /* silent on cancel */ }
      else { setProviders(DEFAULT_AI_PROVIDERS); }
    } finally { setLoading(false); }
  };

  React.useEffect(() => {
    if (menuOpen) loadProviders();
    return () => { try { providersAbortRef.current?.abort(); } catch { /* ignore */ } };
  }, [menuOpen]);

  React.useEffect(() => {
    try {
      const current = localStorage.getItem('aiSelectedModel');
      if ((!current || current.trim() === '') && active?.model) {
        localStorage.setItem('aiSelectedModel', active.model);
      }
    } catch { /* noop */ }
  }, [active]);

  const filtered = providers.filter(p => {
    const byName = p.name.toLowerCase().includes(search.toLowerCase());
    const byRegion = region === 'all' ? true : (p.region === region);
    return byName && byRegion;
  });

  const onKeyChange = (id, value) => {
    const next = { ...keys, [id]: value };
    setKeys(next);
    try { localStorage.setItem('aiProviderKeys', JSON.stringify(next)); } catch { void 0; }
  };

  const handleValidate = React.useCallback(async (id) => {
    try {
      setLoading(true);
      const k = keys[id];
      const res = await validateAIKey(id, k);
      setValid(v => ({ ...v, [id]: !!res.valid }));
      setValidationError(e => ({ ...e, [id]: '' }));
    } catch (err) {
      setValid(v => ({ ...v, [id]: false }));
      const code = err?.code;
      const details = err?.details;
      let msg = (details && (details.message || details.error)) || err?.message || 'فشل التحقق من المفتاح';
      if (code === 'INSUFFICIENT_SCOPES') {
        msg = 'المفتاح مقيّد ولا يملك صلاحية model.request. أنشئ مفتاحًا غير مقيّد أو عدّل صلاحيات الحساب/المشروع.';
      }
      setValidationError(e => ({ ...e, [id]: String(msg) }));
    }
    finally { setLoading(false); }
  }, [keys]);

  const handleActivate = async (id) => {
    try {
      setLoading(true);
      await activateAIProvider(id);
      setActive({ provider: id, model: null });
      try { localStorage.removeItem('aiSelectedModel'); } catch { void 0; }
      setActivationError(e => ({ ...e, [id]: '' }));
      // Do not touch runtime mode or broadcast global events to avoid WS reconnection
    } catch (err) {
      const details = err?.details;
      const msg = (details && (details.message || details.error)) || err?.message || 'فشل تفعيل المزود';
      setActivationError(e => ({ ...e, [id]: String(msg) }));
    }
    finally { setLoading(false); }
  };

  React.useEffect(() => {
    if (!detailId) return;
    const k = keys[detailId];
    if (k) handleValidate(detailId);
  }, [detailId, handleValidate, keys]);

  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (!menuOpen) return;
      if (buttonRef.current && !buttonRef.current.contains(e.target)) {
        const panel = document.getElementById('ai-providers-list');
        const modal = document.getElementById('ai-provider-detail');
        if (panel && panel.contains(e.target)) return;
        if (modal && modal.contains(e.target)) return;
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  React.useEffect(() => {
    const onOpenProviders = (e) => {
      try {
        const preferred = String(e?.detail?.provider || '').trim() || 'openai';
        setMenuOpen(true);
        setDetailId(preferred);
      } catch {
        setMenuOpen(true);
        setDetailId('openai');
      }
    };
    window.addEventListener('joe:openProviders', onOpenProviders);
    return () => window.removeEventListener('joe:openProviders', onOpenProviders);
  }, []);

  return (
    <div className="relative">
      <div className="relative inline-flex items-center" ref={buttonRef}>
        <button
          onClick={() => setMenuOpen(v => !v)}
          className={`p-1.5 px-2 h-7 inline-flex items-center justify-center rounded-lg transition-colors border ${runtimeMode==='online' ? 'bg-green-600 text-black hover:bg-green-700 border-green-500/50' : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border-yellow-600/40'}`}
          title="مزودي الذكاء الصناعي"
        >
          <Sparkles className="w-4 h-4" />
          <span className="ml-1 text-[11px] font-semibold">مزودين</span>
        </button>
      </div>

      {menuOpen && (
        <div id="ai-providers-list" className="absolute right-0 top-10 z-50 w-80 bg-gray-900 border border-yellow-600/40 rounded-lg shadow-xl">
          <div className="p-2 border-b border-yellow-600/20 flex items-center gap-2">
            <div className="relative flex-1">
              <input value={search} onChange={(e)=>setSearch(e.target.value)} className="pl-7 px-2 py-1.5 w-full rounded bg-[#0e1524] border border-yellow-600/30 text-white text-xs" placeholder="بحث"/>
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400"><SearchIcon className="w-3 h-3"/></span>
            </div>
            <select value={region} onChange={(e)=>setRegion(e.target.value)} className="px-2 py-1.5 rounded bg-[#0e1524] border border-yellow-600/30 text-white text-xs">
              <option value="all">الكل</option>
              <option value="global">العالمي</option>
              <option value="china">الصين</option>
            </select>
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {loading && <div className="px-3 py-2 text-xs text-gray-400">جاري التحميل...</div>}
            {filtered.map(p => {
              const isActive = active.provider === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setDetailId(p.id)}
                  className={`group w-full text-right px-3 py-2.5 border-b border-yellow-600/10 hover:bg-gray-800 transition-colors ${isActive ? 'text-green-400' : 'text-yellow-300'}`}
                >
                  <div className="w-full flex items-center justify-between">
                    <span className="inline-flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full grid place-items-center text-[12px]" style={{ background: '#111', color: p.color }}>{p.icon || '🤖'}</span>
                      <span className="flex flex-col items-start leading-tight">
                        <span className="flex items-center gap-2">
                          <span className="text-sm font-semibold">{p.name}</span>
                          <span className="text-xs text-gray-400">• {p.region==='china' ? 'الصين' : 'العالمي'}</span>
                        </span>
                        
                      </span>
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${isActive ? 'bg-green-600/20 text-green-300 ring-1 ring-green-500/50' : 'bg-gray-700/40 text-gray-300 ring-1 ring-yellow-600/30'}`}>{isActive ? 'نشط' : 'غير نشط'}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {!!detailId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setDetailId(null)}>
          <div id="ai-provider-detail" className="w-[520px] max-w-[95vw] bg-[#0b0f1a] border border-yellow-600/40 rounded-2xl shadow-2xl" onClick={(e)=>e.stopPropagation()}>
                    <div className="px-5 py-4 border-b border-yellow-600/40 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-white">
                        {(() => {
                          const p = providers.find(x => x.id === detailId) || {};
                          return (
                            <>
                      <span className="text-lg" style={{ color: p.color }}>{p.icon || '🤖'}</span>
                      <span className="font-semibold">{p.name}</span>
                    </>
                          );
                        })()}
                      </div>
              <button onClick={() => setDetailId(null)} className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm">إغلاق</button>
            </div>
            <div className="p-5 space-y-4">
              {(() => {
                const p = providers.find(x => x.id === detailId) || {};
                const isActive = active.provider === p.id;
                const isValid = valid[p.id] === true;
                return (
                  <>
                    <div className="flex items-center gap-2">
                      <a href={p.createUrl} target="_blank" rel="noopener noreferrer" className="px-3 py-2 rounded-lg bg-gray-800 border border-yellow-600/40 text-gray-200 inline-flex items-center gap-1 hover:bg-yellow-600 hover:text-black"><ExternalLink className="w-3 h-3"/> الحصول على المفتاح</a>
                      <span className={`text-xs px-2 py-1 rounded-full inline-flex items-center gap-1 ${isActive ? 'bg-green-600/20 text-green-300 ring-1 ring-yellow-500' : 'bg-yellow-600/20 text-yellow-300 ring-1 ring-yellow-500'}`}>{isActive ? 'مزود فعّال' : 'مزود غير فعّال'}</span>
                      <span className={`text-xs px-2 py-1 rounded-full inline-flex items-center gap-1 ${isValid ? 'bg-emerald-600/20 text-emerald-300 ring-1 ring-yellow-500' : 'bg-yellow-600/20 text-yellow-300 ring-1 ring-yellow-500'}`}>{isValid ? 'المفتاح يعمل' : 'المفتاح منتهي/غير صالح'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Key className="w-4 h-4 text-yellow-300"/>
                      <input className="flex-1 px-3 py-2 rounded-lg bg-[#0e1524] border border-yellow-600/30 text-white" placeholder="أدخل المفتاح" value={keys[p.id] || ''} onChange={(e)=>onKeyChange(p.id, e.target.value)} />
                      <button onClick={() => handleValidate(p.id)} className="px-3 py-2 rounded-lg bg-yellow-600 hover:bg-yellow-700 text-black border border-yellow-600">تحقق</button>
                      {!!validationError[p.id] && (
                        <span className="text-xs text-red-400 ml-1">{validationError[p.id]}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleActivate(p.id)} className="px-3 py-2 rounded-lg bg-yellow-600 hover:bg-yellow-700 text-black">تفعيل المزود</button>
                      {!!activationError[p.id] && (
                        <span className="text-xs text-red-400 ml-1">{activationError[p.id]}</span>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

AIMenuButton.propTypes = {
  runtimeMode: PropTypes.string,
};

export default TopBar;
