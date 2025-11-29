import React from 'react';
import { FiTerminal, FiMaximize2, FiLogOut, FiSidebar, FiActivity, FiUsers } from 'react-icons/fi';
import { Sparkles, Key, CheckCircle, XCircle, ExternalLink, Search as SearchIcon } from 'lucide-react';
import { getAIProviders, validateAIKey, activateAIProvider } from '../../api/system';
import apiClient from '../../api/client';

const DEFAULT_AI_PROVIDERS = [
  { id: 'openai', name: 'OpenAI', siteUrl: 'https://openai.com', createUrl: 'https://platform.openai.com/api-keys', defaultModel: 'gpt-4o', color: '#10a37f', icon: '🟢', region: 'global', logo: 'https://logo.clearbit.com/openai.com' },
  { id: 'gemini', name: 'Google Gemini', siteUrl: 'https://ai.google.dev', createUrl: 'https://aistudio.google.com/app/apikey', defaultModel: 'gemini-1.5-pro-latest', color: '#7c3aed', icon: '🔷', region: 'global', logo: 'https://logo.clearbit.com/google.com' },
  { id: 'grok', name: 'xAI Grok', siteUrl: 'https://x.ai', createUrl: 'https://console.x.ai/', defaultModel: 'grok-2', color: '#111827', icon: '⚫️', region: 'global', logo: 'https://logo.clearbit.com/x.ai' },
  { id: 'anthropic', name: 'Anthropic Claude', siteUrl: 'https://www.anthropic.com', createUrl: 'https://console.anthropic.com/account/keys', defaultModel: 'claude-3-5-sonnet-latest', color: '#f59e0b', icon: '🟡', region: 'global', logo: 'https://logo.clearbit.com/anthropic.com' },
  { id: 'mistral', name: 'Mistral AI', siteUrl: 'https://mistral.ai', createUrl: 'https://console.mistral.ai/api-keys/', defaultModel: 'mistral-large-latest', color: '#2563eb', icon: '🔵', region: 'global', logo: 'https://logo.clearbit.com/mistral.ai' },
  { id: 'cohere', name: 'Cohere', siteUrl: 'https://cohere.com', createUrl: 'https://dashboard.cohere.com/api-keys', defaultModel: 'command-r-plus', color: '#ef4444', icon: '🔴', region: 'global', logo: 'https://logo.clearbit.com/cohere.com' },
  { id: 'azure-openai', name: 'Azure OpenAI', siteUrl: 'https://azure.microsoft.com', createUrl: 'https://portal.azure.com/#view/Microsoft_Azure_ProjectOxford/CompositeKeys', defaultModel: 'gpt-4o', color: '#0ea5e9', icon: '☁️', region: 'global', logo: 'https://logo.clearbit.com/azure.com' },
  { id: 'aws-bedrock', name: 'AWS Bedrock', siteUrl: 'https://aws.amazon.com/bedrock/', createUrl: 'https://us-east-1.console.aws.amazon.com/bedrock/home', defaultModel: 'anthropic.claude-3-sonnet', color: '#f97316', icon: '🟠', region: 'global', logo: 'https://logo.clearbit.com/aws.amazon.com' },
  { id: 'huggingface', name: 'Hugging Face', siteUrl: 'https://huggingface.co', createUrl: 'https://huggingface.co/settings/tokens', defaultModel: 'tiiuae/falcon-180b', color: '#eab308', icon: '🤗', region: 'global', logo: 'https://logo.clearbit.com/huggingface.co' },
  { id: 'together', name: 'Together AI', siteUrl: 'https://www.together.ai', createUrl: 'https://api.together.xyz/settings/api-keys', defaultModel: 'meta-llama/Meta-Llama-3-70B-Instruct', color: '#22c55e', icon: '🟩', region: 'global', logo: 'https://logo.clearbit.com/together.ai' },
  { id: 'replicate', name: 'Replicate', siteUrl: 'https://replicate.com', createUrl: 'https://replicate.com/account/api-tokens', defaultModel: 'meta/llama-3-70b-instruct', color: '#06b6d4', icon: '🌀', region: 'global', logo: 'https://logo.clearbit.com/replicate.com' },
  { id: 'octoai', name: 'OctoAI', siteUrl: 'https://octoai.com', createUrl: 'https://octoai.cloud/dashboard/keys', defaultModel: 'meta-llama/llama-3-70b-instruct', color: '#9333ea', icon: '🐙', region: 'global', logo: 'https://logo.clearbit.com/octoai.com' },
  { id: 'openrouter', name: 'OpenRouter', siteUrl: 'https://openrouter.ai', createUrl: 'https://openrouter.ai/settings/keys', defaultModel: 'openrouter/auto', color: '#84cc16', icon: '🔀', region: 'global', logo: 'https://logo.clearbit.com/openrouter.ai' },
  { id: 'groq', name: 'Groq', siteUrl: 'https://groq.com', createUrl: 'https://console.groq.com/keys', defaultModel: 'llama3-70b-8192', color: '#dc2626', icon: '⚡', region: 'global', logo: 'https://logo.clearbit.com/groq.com' },
  { id: 'perplexity', name: 'Perplexity', siteUrl: 'https://www.perplexity.ai', createUrl: 'https://www.perplexity.ai/settings', defaultModel: 'pplx-70b-online', color: '#0ea5e9', icon: '🔍', region: 'global', logo: 'https://logo.clearbit.com/perplexity.ai' },
  { id: 'stability', name: 'Stability AI', siteUrl: 'https://stability.ai', createUrl: 'https://platform.stability.ai/account/keys', defaultModel: 'stable-diffusion-xl', color: '#7dd3fc', icon: '🎨', region: 'global', logo: 'https://logo.clearbit.com/stability.ai' },
  { id: 'meta', name: 'Meta LLaMA (via providers)', siteUrl: 'https://llama.meta.com', createUrl: 'https://llama.meta.com/', defaultModel: 'llama-3-70b-instruct', color: '#3b82f6', icon: '🧠', region: 'global', logo: 'https://logo.clearbit.com/meta.com' },
  { id: 'ollama', name: 'Ollama (Local)', siteUrl: 'https://ollama.ai', createUrl: 'https://ollama.ai/', defaultModel: 'llama3:latest', color: '#374151', icon: '💻', region: 'global', logo: 'https://logo.clearbit.com/ollama.com' },
  { id: 'lmstudio', name: 'LM Studio (Local)', siteUrl: 'https://lmstudio.ai', createUrl: 'https://lmstudio.ai/', defaultModel: 'llama-3-70b-instruct', color: '#64748b', icon: '🖥️', region: 'global', logo: 'https://logo.clearbit.com/lmstudio.ai' },
  { id: 'ibm-watsonx', name: 'IBM watsonx', siteUrl: 'https://www.ibm.com/watsonx', createUrl: 'https://cloud.ibm.com/watsonx', defaultModel: 'ibm/granite-20b-instruct', color: '#1f2937', icon: '🔷', region: 'global', logo: 'https://logo.clearbit.com/ibm.com' },
  { id: 'databricks-mosaic', name: 'Databricks Mosaic', siteUrl: 'https://www.databricks.com', createUrl: 'https://www.databricks.com/product/mosaic-ai', defaultModel: 'db/mpt-7b-instruct', color: '#f43f5e', icon: '🧩', region: 'global', logo: 'https://logo.clearbit.com/databricks.com' },
  { id: 'snowflake-cortex', name: 'Snowflake Cortex', siteUrl: 'https://www.snowflake.com', createUrl: 'https://www.snowflake.com/en/data-cloud/cortex/', defaultModel: 'snowflake/llm', color: '#60a5fa', icon: '❄️', region: 'global', logo: 'https://logo.clearbit.com/snowflake.com' },
  { id: 'baidu-ernie', name: 'Baidu ERNIE', siteUrl: 'https://ai.baidu.com', createUrl: 'https://console.bce.baidu.com/ai/', defaultModel: 'ERNIE-4.0', color: '#2563eb', icon: '🔵', region: 'china', logo: 'https://logo.clearbit.com/baidu.com' },
  { id: 'ali-qianwen', name: 'Alibaba Tongyi Qianwen', siteUrl: 'https://tongyi.aliyun.com', createUrl: 'https://dashscope.console.aliyun.com/', defaultModel: 'qwen-turbo', color: '#f59e0b', icon: '🟡', region: 'china', logo: 'https://logo.clearbit.com/aliyun.com' },
  { id: 'tencent-hunyuan', name: 'Tencent Hunyuan', siteUrl: 'https://hunyuan.tencent.com', createUrl: 'https://cloud.tencent.com/product/hunyuan', defaultModel: 'hunyuan-large', color: '#0ea5e9', icon: '☁️', region: 'china', logo: 'https://logo.clearbit.com/tencent.com' },
  { id: 'iflytek-spark', name: 'iFLYTEK Spark', siteUrl: 'https://www.xfyun.cn', createUrl: 'https://console.xfyun.cn/', defaultModel: 'spark', color: '#ef4444', icon: '🔴', region: 'china', logo: 'https://logo.clearbit.com/xfyun.cn' },
  { id: 'bytedance-volc', name: 'Volcengine (ByteDance)', siteUrl: 'https://www.volcengine.com', createUrl: 'https://console.volcengine.com/iam/keymanage', defaultModel: 'skylark', color: '#06b6d4', icon: '🌀', region: 'china', logo: 'https://logo.clearbit.com/volcengine.com' },
  { id: 'zhipu-glm', name: 'Zhipu GLM', siteUrl: 'https://www.zhipuai.cn', createUrl: 'https://open.bigmodel.cn/dev/api', defaultModel: 'glm-4', color: '#9333ea', icon: '🟣', region: 'china', logo: 'https://logo.clearbit.com/zhipuai.cn' },
  { id: 'moonshot-kimi', name: 'Moonshot Kimi', siteUrl: 'https://kimi.moonshot.cn', createUrl: 'https://platform.moonshot.cn/console', defaultModel: 'kimi-2-large', color: '#14b8a6', icon: '🟩', region: 'china', logo: 'https://logo.clearbit.com/moonshot.cn' },
  { id: 'baichuan', name: 'Baichuan AI', siteUrl: 'https://www.baichuan-ai.com', createUrl: 'https://platform.baichuan-ai.com/console', defaultModel: 'baichuan2-53b', color: '#f43f5e', icon: '🟥', region: 'china', logo: 'https://logo.clearbit.com/baichuan-ai.com' },
  { id: 'minimax', name: 'MiniMax', siteUrl: 'https://www.minimax-zh.com', createUrl: 'https://www.minimax-zh.com/account/keys', defaultModel: 'abab-6.5', color: '#22c55e', icon: '🟩', region: 'china', logo: 'https://logo.clearbit.com/minimax-zh.com' },
  { id: 'sensetime-sensenova', name: 'SenseTime SenseNova', siteUrl: 'https://www.sensetime.com', createUrl: 'https://open-platform.sensetime.com/', defaultModel: 'sensechat-5', color: '#e11d48', icon: '💮', region: 'china', logo: 'https://logo.clearbit.com/sensetime.com' },
  { id: 'deepseek', name: 'DeepSeek', siteUrl: 'https://www.deepseek.com', createUrl: 'https://platform.deepseek.com/api_keys', defaultModel: 'deepseek-chat', color: '#3b82f6', icon: '🔵', region: 'china', logo: 'https://logo.clearbit.com/deepseek.com' },
  { id: 'huawei-pangu', name: 'Huawei Pangu', siteUrl: 'https://www.huaweicloud.com/intl/en-us/product/pangu', createUrl: 'https://console.huaweicloud.com/apig', defaultModel: 'pangu-3', color: '#ef4444', icon: '🔴', region: 'china', logo: 'https://logo.clearbit.com/huaweicloud.com' },
  { id: 'jd-yanxi', name: 'JD Yanxi', siteUrl: 'https://www.jdcloud.com', createUrl: 'https://console.jdcloud.com/ai', defaultModel: 'yanxi', color: '#dc2626', icon: '🟥', region: 'china', logo: 'https://logo.clearbit.com/jdcloud.com' },
  { id: '360-zhinao', name: '360 Zhinao', siteUrl: 'https://ai.360.cn', createUrl: 'https://ai.360.cn/', defaultModel: 'zhinao', color: '#16a34a', icon: '🟢', region: 'china', logo: 'https://logo.clearbit.com/360.cn' },
  { id: 'tencent-qq', name: 'QQ AI', siteUrl: 'https://www.qq.com', createUrl: 'https://qq.com/', defaultModel: 'qq-ai', color: '#0ea5e9', icon: '🔷', region: 'china', logo: 'https://logo.clearbit.com/qq.com' },
  { id: 'netease', name: 'NetEase AI', siteUrl: 'https://www.163.com', createUrl: 'https://netease.com/', defaultModel: 'netease-ai', color: '#ef4444', icon: '🔴', region: 'china', logo: 'https://logo.clearbit.com/163.com' },
  { id: '01ai-yi', name: '01.AI Yi', siteUrl: 'https://01.ai', createUrl: 'https://01.ai/', defaultModel: 'yi-34b-chat', color: '#0ea5e9', icon: '🔷', region: 'china', logo: 'https://logo.clearbit.com/01.ai' },
  { id: 'kunlun-ai', name: 'Kunlun AI', siteUrl: 'https://www.kunlun.ai', createUrl: 'https://www.kunlun.ai/', defaultModel: 'kunlun-large', color: '#16a34a', icon: '🟢', region: 'china', logo: 'https://logo.clearbit.com/kunlun.ai' },
];

import PropTypes from 'prop-types';
import { useSessionToken } from '../../hooks/useSessionToken';
import { useNavigate } from 'react-router-dom';

const TopBar = ({ onToggleBottom, onToggleLeft, isLeftOpen, onToggleStatus, isStatusOpen, onToggleBorderSettings, isBorderSettingsOpen, isSuperAdmin, onToggleRight: _onToggleRight, isRightOpen: _isRightOpen, isBottomOpen }) => {
  const { clearToken } = useSessionToken();
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);
  const brandRef = React.useRef(null);
  const [eyeOffset, setEyeOffset] = React.useState({ x: 0, y: 0 });
  const [activity, setActivity] = React.useState('ready');
  const [outfit, setOutfit] = React.useState('suit');
  const [mascotScale, setMascotScale] = React.useState(1);
  const [lang, setLang] = React.useState(() => {
    try { return localStorage.getItem('lang') === 'ar' ? 'ar' : 'en'; } catch { return 'en'; }
  });
  const [factoryMode, setFactoryMode] = React.useState('online');
  const [offlineReady, setOfflineReady] = React.useState(false);
  const [loadingModel, setLoadingModel] = React.useState(false);
  const [loadingSeconds, setLoadingSeconds] = React.useState(0);
  const [loadingStage, setLoadingStage] = React.useState('');
  const [loadingPercent, setLoadingPercent] = React.useState(0);
  
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
  };
  React.useEffect(() => {
    (async () => {
      try {
        const { data } = await apiClient.get('/api/v1/runtime-mode/status');
        if (data?.success && data?.mode) setFactoryMode(data.mode);
        setOfflineReady(Boolean(data?.offlineReady));
      } catch (e) { void e; }
    })();
  }, []);
  const toggleFactoryMode = async () => {
    try {
      const getStatus = async () => {
        const { data } = await apiClient.get('/api/v1/runtime-mode/status');
        return { mode: data?.mode, ready: Boolean(data?.offlineReady), loading: !!data?.loading, stage: data?.stage || '', percent: Number(data?.percent || 0) };
      };

      // If switching to offline and not ready, load then poll readiness
      if (factoryMode !== 'offline') {
        const status = await getStatus();
        if (!status.ready) {
          setLoadingModel(true);
          setLoadingSeconds(0);
          const start = Date.now();
          const timer = setInterval(() => {
            setLoadingSeconds(Math.floor((Date.now() - start) / 1000));
          }, 500);
          try {
            await apiClient.post('/api/v1/runtime-mode/load');
            let attempts = 0;
            while (attempts < 120) {
              const s = await getStatus();
              setOfflineReady(s.ready);
              setLoadingStage(s.stage);
              setLoadingPercent(s.percent);
              if (s.ready) break;
              await new Promise((r) => setTimeout(r, 1000));
              attempts++;
            }
          } finally {
            clearInterval(timer);
            setLoadingModel(false);
          }
        }
      }

      const { data } = await apiClient.post('/api/v1/runtime-mode/toggle');
      if (data?.success) {
        setFactoryMode(data.mode);
        // Refresh offlineReady and mode to reflect backend state
        const status = await getStatus();
        setFactoryMode(status.mode || data.mode);
        setOfflineReady(status.ready);
      }
    } catch (e) { void e; }
  };
  const handleLoadModel = async () => {
    try {
      const { data } = await apiClient.post('/api/v1/runtime-mode/load');
      setOfflineReady(Boolean(data?.offlineReady));
    } catch (e) { void e; }
  };
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
          <div className="text">
            jo<span>e</span>
          </div>
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
      <div className="flex items-center gap-2">
        <button
          onClick={toggleFactoryMode}
          className={`p-2 px-3 h-9 inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${loadingModel ? 'bg-blue-600 text-white hover:bg-blue-700' : (factoryMode==='offline' ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-800 text-gray-200 hover:bg-gray-700 border border-yellow-600/40')}`}
          title={factoryMode==='offline' ? 'وضع المصنع الذاتي مفعل' : 'الوضع الحالي'}
          disabled={loadingModel}
        >
          {loadingModel ? (
            <span className="inline-flex items-center gap-2">
              <span>{lang==='ar' ? 'جاري تحميل النموذج' : 'Loading model'}</span>
              <span>{loadingSeconds}s</span>
              {!!loadingStage && <span>{lang==='ar' ? loadingStage : loadingStage}</span>}
              <span>{Math.max(0, Math.min(100, loadingPercent))}%</span>
              <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </span>
          ) : (
            factoryMode==='offline' ? 'مصنع ذاتي' : 'النظام الحالي'
          )}
        </button>
        <button
          onClick={onToggleLeft}
          className={`p-2 w-9 h-9 inline-flex items-center justify-center rounded-lg transition-colors ${
            isLeftOpen ? 'bg-yellow-600 text-black hover:bg-yellow-700' : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-yellow-600/40'
          }`}
          title={isLeftOpen ? (lang==='ar'?'إخفاء لوحة المحادثات':'Hide Chats Panel') : (lang==='ar'?'إظهار لوحة المحادثات':'Show Chats Panel')}
        >
          <FiSidebar size={18} />
        </button>


        {/* Toggle System Status Panel */}
        <button
          onClick={onToggleStatus}
          className={`p-2 w-9 h-9 inline-flex items-center justify-center rounded-lg transition-colors ${
            isStatusOpen 
              ? 'bg-yellow-600 text-black hover:bg-yellow-700' 
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-yellow-600/40'
          }`}
          title={isStatusOpen ? (lang==='ar'?'إخفاء حالة النظام':'Hide System Status') : (lang==='ar'?'إظهار حالة النظام':'Show System Status')}
        >
          <FiActivity size={18} />
        </button>

        {isSuperAdmin && (
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen((v) => !v)}
              className={`p-2 w-9 h-9 inline-flex items-center justify-center rounded-lg transition-colors ${
                userMenuOpen || isBorderSettingsOpen
                  ? 'bg-yellow-600 text-black hover:bg-yellow-700'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-yellow-600/40'
              }`}
              title="إدارة المستخدمين"
            >
              <FiUsers size={18} />
            </button>
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

        {/* AI Providers Button */}
        <AIMenuButton />

        {/* Language Toggle */}
        <button
          onClick={toggleLang}
          className="p-2 w-9 h-9 inline-flex items-center justify-center rounded-lg bg-yellow-600 hover:bg-yellow-700 text-black border border-yellow-600 transition-colors"
          title={lang === 'ar' ? 'AR' : 'EN'}
        >
          <span className="text-xs font-semibold">{lang === 'ar' ? 'AR' : 'EN'}</span>
        </button>

        {/* Mascot Size Slider */}
        <div className="hidden md:flex items-center px-2 py-1 bg-gray-800 text-gray-300 border border-yellow-600/40 rounded-lg" title={lang==='ar'?'حجم جو':'Joe Size'}>
          <input type="range" min="0.8" max="1.4" step="0.02" value={mascotScale} onChange={(e)=>setMascotScale(parseFloat(e.target.value))} className="w-24" style={{ accentColor: '#eab308' }} />
        </div>

        {/* Toggle Bottom Panel */}
        <button
          onClick={onToggleBottom}
          className={`p-2 w-9 h-9 inline-flex items-center justify-center rounded-lg transition-colors ${
            isBottomOpen 
              ? 'bg-yellow-600 text-black hover:bg-yellow-700' 
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-yellow-600/40'
          }`}
          title={isBottomOpen ? (lang==='ar'?'إخفاء لوحة السجل':'Hide Logs Panel') : (lang==='ar'?'إظهار لوحة السجل':'Show Logs Panel')}
        >
          <FiTerminal size={18} />
        </button>

        {/* Fullscreen Toggle (Optional) */}
        <button
          onClick={() => {
            if (document.fullscreenElement) {
              document.exitFullscreen();
            } else {
              document.documentElement.requestFullscreen();
            }
          }}
          className="p-2 w-9 h-9 inline-flex items-center justify-center rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 border border-yellow-600/40 transition-colors"
          title={lang==='ar'?'ملء الشاشة':'Toggle Fullscreen'}
        >
          <FiMaximize2 size={18} />
        </button>

        <button
          onClick={handleExit}
          className={`p-2 w-9 h-9 inline-flex items-center justify-center rounded-lg transition-colors bg-red-600 text-white hover:bg-red-700`}
          title={lang==='ar'?'خروج إلى الرئيسية':'Exit to Home (Logout)'}
        >
          <FiLogOut size={18} />
        </button>
      </div>
    </div>
  );
};

TopBar.propTypes = {
  onToggleRight: PropTypes.func.isRequired,
  onToggleBottom: PropTypes.func.isRequired,
  isRightOpen: PropTypes.bool.isRequired,
  isBottomOpen: PropTypes.bool.isRequired,
  onToggleLeft: PropTypes.func.isRequired,
  isLeftOpen: PropTypes.bool.isRequired,
  onToggleStatus: PropTypes.func.isRequired,
  isStatusOpen: PropTypes.bool.isRequired,
  onToggleBorderSettings: PropTypes.func.isRequired,
  isBorderSettingsOpen: PropTypes.bool.isRequired,
  isSuperAdmin: PropTypes.bool,
};

const AIMenuButton = () => {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [providers, setProviders] = React.useState([]);
  const [active, setActive] = React.useState({ provider: null, model: null });
  const [keys, setKeys] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem('aiProviderKeys') || '{}'); } catch { return {}; }
  });
  const [valid, setValid] = React.useState({});
  const [validationError, setValidationError] = React.useState({});
  const [activationError, setActivationError] = React.useState({});
  const [closing, setClosing] = React.useState(false);
  const [logoError, setLogoError] = React.useState({});

  const handlePanelClose = React.useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, 180);
  }, []);

  const loadProviders = async () => {
    setLoading(true);
    try {
      const data = await getAIProviders();
      const list = data.providers && data.providers.length ? data.providers : DEFAULT_AI_PROVIDERS;
      setProviders(list);
      setActive({ provider: data.activeProvider, model: data.activeModel });
    } catch {
      setProviders(DEFAULT_AI_PROVIDERS);
    } finally { setLoading(false); }
  };

  const [search, setSearch] = React.useState('');
  const [region, setRegion] = React.useState('all');
  const filtered = providers.filter(p => {
    const byName = p.name.toLowerCase().includes(search.toLowerCase());
    const byRegion = region === 'all' ? true : (p.region === region);
    return byName && byRegion;
  });

  React.useEffect(() => {
    if (open) loadProviders();
  }, [open]);

  React.useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener('joe:openProviders', onOpen);
    return () => window.removeEventListener('joe:openProviders', onOpen);
  }, []);

  React.useEffect(() => {
    const handleKeyDown = (e) => { if (e.key === 'Escape' && open) handlePanelClose(); };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, handlePanelClose]);


  const onKeyChange = (id, value) => {
    const next = { ...keys, [id]: value };
    setKeys(next);
    try { localStorage.setItem('aiProviderKeys', JSON.stringify(next)); } catch { void 0; }
  };

  const handleValidate = async (id) => {
    try {
      setLoading(true);
      const k = keys[id];
      const res = await validateAIKey(id, k);
      setValid(v => ({ ...v, [id]: !!res.valid }));
      setValidationError(e => ({ ...e, [id]: '' }));
    } catch (err) {
      setValid(v => ({ ...v, [id]: false }));
      const msg = (err && err.message) ? err.message : 'فشل التحقق من المفتاح';
      setValidationError(e => ({ ...e, [id]: msg }));
    }
    finally { setLoading(false); }
  };

  const handleActivate = async (id, model) => {
    try {
      setLoading(true);
      await activateAIProvider(id, model);
      setActive({ provider: id, model });
      try { localStorage.setItem('aiSelectedModel', model); } catch { void 0; }
      setActivationError(e => ({ ...e, [id]: '' }));
    } catch (err) {
      const msg = (err && err.message) ? err.message : 'فشل تفعيل المزود (يتطلب صلاحية Super Admin)';
      setActivationError(e => ({ ...e, [id]: msg }));
    }
    finally { setLoading(false); }
  };

  const Panel = (
    <div className={`fixed inset-0 z-[100] flex items-start justify-center pt-16 bg-black/40 backdrop-blur-sm transition-opacity duration-200 ${closing ? 'opacity-0' : 'opacity-100'}`} onClick={handlePanelClose}>
      <style>{`
        @keyframes panelIn { from { opacity: 0; transform: translateY(10px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes panelOut { from { opacity: 1; transform: translateY(0) scale(1); } to { opacity: 0; transform: translateY(8px) scale(0.98); } }
        .ai-panel { animation: panelIn 200ms ease-out; transform-origin: center; will-change: transform, opacity; }
        .ai-panel.closing { animation: panelOut 180ms ease-in; }
      `}</style>
      <div className={`ai-panel ${closing ? 'closing' : ''} w-[940px] max-w-[96vw] bg-[#0b0f1a] border border-yellow-600/40 rounded-2xl shadow-2xl max-h-[80vh] overflow-hidden`} onClick={(e)=>e.stopPropagation()}>
      <div className="px-5 py-4 border-b border-yellow-600/40 flex items-center justify-between sticky top-0 bg-[#0b0f1a]">
        <div className="flex items-center gap-2 text-white"><Sparkles className="w-5 h-5 text-yellow-400"/> <span className="font-semibold">مزودي الذكاء الصناعي</span></div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <input value={search} onChange={(e)=>setSearch(e.target.value)} className="pl-8 px-3 py-2 rounded-lg bg-[#0e1524] border border-yellow-600/30 text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500" placeholder="بحث عن مزود"/>
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400"><SearchIcon className="w-4 h-4"/></span>
          </div>
          <select value={region} onChange={(e)=>setRegion(e.target.value)} className="px-3 py-2 rounded-lg bg-[#0e1524] border border-yellow-600/30 text-white text-sm">
            <option value="all">الكل</option>
            <option value="global">العالمي</option>
            <option value="china">الصين</option>
          </select>
          <button onClick={handlePanelClose} className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white">إغلاق</button>
        </div>
      </div>
      <div className="p-5 max-h-[70vh] overflow-y-auto">
        {loading && <div className="text-sm text-gray-400 mb-3">جاري التحميل...</div>}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(p => {
          const isActive = active.provider === p.id;
          const isValid = valid[p.id] === true;
          return (
            <div key={p.id} className="rounded-2xl border border-yellow-600/20 bg-gradient-to-br from-[#0e1524] to-[#0b1220] shadow-lg">
              <div className="p-4 border-b border-yellow-600/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <a href={p.createUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:opacity-90">
                    {(!logoError[p.id] && p.logo) ? (
                      <img
                        src={p.logo}
                        alt={p.name}
                        className="w-6 h-6 rounded"
                        referrerPolicy="no-referrer"
                        crossOrigin="anonymous"
                        loading="lazy"
                        onError={() => setLogoError(e => ({ ...e, [p.id]: true }))}
                      />
                    ) : (
                      <span className="text-xl" style={{ color: p.color }}>{p.icon || '🤖'}</span>
                    )}
                    <span className="text-white font-semibold underline decoration-dotted">{p.name}</span>
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  {p.siteUrl && (
                    <a href={p.siteUrl} target="_blank" rel="noopener noreferrer" className="p-2 bg-gray-800 border border-yellow-600/40 text-gray-200 rounded inline-flex items-center gap-1 hover:bg-yellow-600 hover:text-black"><ExternalLink className="w-3 h-3"/> زيارة الموقع</a>
                  )}
                  <a href={p.createUrl} target="_blank" rel="noopener noreferrer" className="p-2 bg-gray-800 border border-yellow-600/40 text-gray-200 rounded inline-flex items-center gap-1 hover:bg-yellow-600 hover:text-black"><ExternalLink className="w-3 h-3"/> إنشاء مفتاح</a>
                </div>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full inline-flex items-center gap-1 ${isActive ? 'bg-green-600/20 text-green-300 ring-1 ring-yellow-500' : 'bg-red-600/20 text-red-300 ring-1 ring-yellow-500'}`}>{isActive ? <CheckCircle className="w-3 h-3"/> : <XCircle className="w-3 h-3"/>}{isActive ? 'النظام يعمل على المزود' : 'غير مفعل'}</span>
                  <span className={`text-xs px-2 py-1 rounded-full inline-flex items-center gap-1 ${isValid ? 'bg-emerald-600/20 text-emerald-300 ring-1 ring-yellow-500' : 'bg-red-600/20 text-red-300 ring-1 ring-yellow-500'}`}>{isValid ? <CheckCircle className="w-3 h-3"/> : <XCircle className="w-3 h-3"/>}{isValid ? 'المفتاح صالح' : 'المفتاح غير صالح'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-yellow-300"/>
                  <input className="flex-1 px-3 py-2 rounded-lg bg-[#0e1524] border border-yellow-600/30 text-white" placeholder="أدخل المفتاح" value={keys[p.id] || ''} onChange={(e)=>onKeyChange(p.id, e.target.value)} />
                  <button onClick={()=>handleValidate(p.id)} className="p-2 rounded-lg bg-yellow-600 hover:bg-yellow-700 text-black border border-yellow-600">تحقق</button>
                  {!!validationError[p.id] && (
                    <span className="text-xs text-red-400 ml-2">{validationError[p.id]}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <select defaultValue={p.defaultModel} className="px-3 py-2 rounded-lg bg-[#0e1524] border border-yellow-600/30 text-white">
                    <option value={p.defaultModel}>{p.defaultModel}</option>
                  </select>
                  <button onClick={()=>handleActivate(p.id, p.defaultModel)} className="p-2 rounded-lg bg-yellow-600 hover:bg-yellow-700 text-black">تفعيل المزود</button>
                  {!!activationError[p.id] && (
                    <span className="text-xs text-red-400 ml-2">{activationError[p.id]}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        </div>
      </div>
      </div>
    </div>
  );

  return (
    <div className="relative">
      <button
        onClick={()=>{ if (open) handlePanelClose(); else setOpen(true); }}
        className={`relative z-[101] p-2 w-9 h-9 inline-flex items-center justify-center rounded-lg transition-colors ${open ? 'bg-yellow-600 text-black hover:bg-yellow-700' : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-yellow-600/40'}`}
        title="مزودي الذكاء الصناعي"
      >
        <Sparkles className="w-4 h-4"/>
      </button>
      {open && Panel}
    </div>
  );
};

export default TopBar;
