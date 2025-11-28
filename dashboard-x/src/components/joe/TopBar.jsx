import React from 'react';
import { FiTerminal, FiMaximize2, FiLogOut, FiSidebar, FiActivity, FiUsers } from 'react-icons/fi';
import { Sparkles, Key, CheckCircle, XCircle, ExternalLink, Search as SearchIcon } from 'lucide-react';
import ReactDOM from 'react-dom';
import { getAIProviders, validateAIKey, activateAIProvider } from '../../api/system';

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

import { useSessionToken } from '../../hooks/useSessionToken'; // Import hook for token clearing
import { useNavigate } from 'react-router-dom'; // Import hook for navigation

const TopBar = ({ onToggleRight, onToggleBottom, isRightOpen, isBottomOpen, onToggleLeft, isLeftOpen, onToggleStatus, isStatusOpen, onToggleBorderSettings, isBorderSettingsOpen, isSuperAdmin }) => {
  const { clearToken } = useSessionToken();
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);

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
          .joe-brand .cube { width: 56px; height: 56px; background: linear-gradient(135deg, #eab308, #fbbf24); position: relative; border-radius: 12px; transform-style: preserve-3d; animation: cubeSpin 4s infinite linear; box-shadow: 0 0 22px rgba(234, 179, 8, 0.5); }
          .joe-brand .eyes { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); display: flex; gap: 8px; z-index: 10; }
          .joe-brand .eye { width: 6px; height: 6px; background: #000; border-radius: 50%; animation: goldPulse 1.5s infinite; }
          @keyframes cubeSpin { 0% { transform: rotateX(0deg) rotateY(0deg); } 100% { transform: rotateX(360deg) rotateY(360deg); } }
          @keyframes goldPulse { 0%, 100% { box-shadow: 0 0 0 0 #eab308; } 50% { box-shadow: 0 0 12px 4px #eab308; } }
        `}</style>
        <div className="joe-brand">
          <div className="text">
            jo<span>e</span>
          </div>
          <div className="cube">
            <div className="eyes">
              <div className="eye"></div>
              <div className="eye"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Control Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleLeft}
          className={`p-2 rounded-lg transition-colors ${
            isLeftOpen 
              ? 'bg-blue-600 text-white hover:bg-blue-700' 
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
          title={isLeftOpen ? "Hide Chats Panel" : "Show Chats Panel"}
        >
          <FiSidebar size={18} />
        </button>

        {/* Toggle System Status Panel */}
        <button
          onClick={onToggleStatus}
          className={`p-2 rounded-lg transition-colors ${
            isStatusOpen 
              ? 'bg-green-600 text-white hover:bg-green-700' 
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
          title={isStatusOpen ? "Hide System Status" : "Show System Status"}
        >
          <FiActivity size={18} />
        </button>
        {/* Exit Button (Replaces Toggle Right Panel) */}
        <button
          onClick={handleExit}
          className={`p-2 rounded-lg transition-colors bg-red-600 text-white hover:bg-red-700`}
          title="Exit to Home (Logout)"
        >
          <FiLogOut size={18} />
        </button>

        {isSuperAdmin && (
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen((v) => !v)}
              className={`p-2 rounded-lg transition-colors ${
                userMenuOpen || isBorderSettingsOpen
                  ? 'bg-purple-600 text-white hover:bg-purple-700'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
              title="إدارة المستخدمين"
            >
              <FiUsers size={18} />
            </button>
            {userMenuOpen && (
              <div className="absolute right-0 top-12 z-50 w-56 bg-gray-900 border border-gray-800 rounded-lg shadow-xl p-2">
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

        {/* Toggle Bottom Panel */}
        <button
          onClick={onToggleBottom}
          className={`p-2 rounded-lg transition-colors ${
            isBottomOpen 
              ? 'bg-blue-600 text-white hover:bg-blue-700' 
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
          title={isBottomOpen ? "Hide Logs Panel" : "Show Logs Panel"}
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
          className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:bg-gray-700 transition-colors"
          title="Toggle Fullscreen"
        >
          <FiMaximize2 size={18} />
        </button>
      </div>
    </div>
  );
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

  const loadProviders = async () => {
    setLoading(true);
    try {
      const data = await getAIProviders();
      const list = data.providers && data.providers.length ? data.providers : DEFAULT_AI_PROVIDERS;
      setProviders(list);
      setActive({ provider: data.activeProvider, model: data.activeModel });
    } catch (e) {
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
    const onDoc = (e) => { if (open) setOpen(false); };
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') onDoc(e); });
    return () => document.removeEventListener('keydown', onDoc);
  }, [open]);

  const onKeyChange = (id, value) => {
    const next = { ...keys, [id]: value };
    setKeys(next);
    try { localStorage.setItem('aiProviderKeys', JSON.stringify(next)); } catch {}
  };

  const handleValidate = async (id) => {
    try {
      setLoading(true);
      const k = keys[id];
      const res = await validateAIKey(id, k);
      setValid(v => ({ ...v, [id]: !!res.valid }));
    } catch { setValid(v => ({ ...v, [id]: false })); }
    finally { setLoading(false); }
  };

  const handleActivate = async (id, model) => {
    try {
      setLoading(true);
      await activateAIProvider(id, model);
      setActive({ provider: id, model });
      try { localStorage.setItem('aiSelectedModel', model); } catch {}
    } catch {}
    finally { setLoading(false); }
  };

  const Panel = (
    <div className="absolute right-4 top-16 z-[100] w-[940px] max-w-[96vw] bg-[#0b0f1a] border border-[#132036] rounded-2xl shadow-2xl max-h-[80vh] overflow-hidden">
      <div className="px-5 py-4 border-b border-[#132036] flex items-center justify-between sticky top-0 bg-[#0b0f1a]">
        <div className="flex items-center gap-2 text-white"><Sparkles className="w-5 h-5 text-fuchsia-400"/> <span className="font-semibold">مزودي الذكاء الصناعي</span></div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <input value={search} onChange={(e)=>setSearch(e.target.value)} className="pl-8 px-3 py-2 rounded-lg bg-[#0e1524] border border-[#1f2a46] text-white text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500" placeholder="بحث عن مزود"/>
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400"><SearchIcon className="w-4 h-4"/></span>
          </div>
          <select value={region} onChange={(e)=>setRegion(e.target.value)} className="px-3 py-2 rounded-lg bg-[#0e1524] border border-[#1f2a46] text-white text-sm">
            <option value="all">الكل</option>
            <option value="global">العالمي</option>
            <option value="china">الصين</option>
          </select>
          <button onClick={()=>setOpen(false)} className="px-3 py-2 rounded-lg bg-[#0e1524] border border-[#1f2a46] text-gray-300 hover:bg-[#141c2e]">إغلاق</button>
        </div>
      </div>
      <div className="p-5 max-h-[70vh] overflow-y-auto">
        {loading && <div className="text-sm text-gray-400 mb-3">جاري التحميل...</div>}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(p => {
          const isActive = active.provider === p.id;
          const isValid = valid[p.id] === true;
          return (
            <div key={p.id} className="rounded-2xl border border-[#1f2a46] bg-gradient-to-br from-[#0e1524] to-[#0b1220] shadow-lg">
              <div className="p-4 border-b border-[#1f2a46] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <a href={p.createUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:opacity-90">
                    {p.logo ? <img src={p.logo} alt={p.name} className="w-6 h-6 rounded"/> : <span className="text-xl" style={{color:p.color}}>{p.icon || '🤖'}</span>}
                    <span className="text-white font-semibold underline decoration-dotted">{p.name}</span>
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  {p.siteUrl && (
                    <a href={p.siteUrl} target="_blank" rel="noopener noreferrer" className="text-xs px-2 py-1 bg-[#0e1524] border border-[#1f2a46] text-white rounded inline-flex items-center gap-1"><ExternalLink className="w-3 h-3"/> زيارة الموقع</a>
                  )}
                  <a href={p.createUrl} target="_blank" rel="noopener noreferrer" className="text-xs px-2 py-1 bg-[#0e1524] border border-[#1f2a46] text-white rounded inline-flex items-center gap-1"><ExternalLink className="w-3 h-3"/> إنشاء مفتاح</a>
                </div>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full inline-flex items-center gap-1 ${isActive ? 'bg-green-600/20 text-green-300 ring-1 ring-green-600' : 'bg-red-600/20 text-red-300 ring-1 ring-red-600'}`}>{isActive ? <CheckCircle className="w-3 h-3"/> : <XCircle className="w-3 h-3"/>}{isActive ? 'النظام يعمل على المزود' : 'غير مفعل'}</span>
                  <span className={`text-xs px-2 py-1 rounded-full inline-flex items-center gap-1 ${isValid ? 'bg-emerald-600/20 text-emerald-300 ring-1 ring-emerald-600' : 'bg-red-600/20 text-red-300 ring-1 ring-red-600'}`}>{isValid ? <CheckCircle className="w-3 h-3"/> : <XCircle className="w-3 h-3"/>}{isValid ? 'المفتاح صالح' : 'المفتاح غير صالح'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-yellow-300"/>
                  <input className="flex-1 px-3 py-2 rounded-lg bg-[#0e1524] border border-[#1f2a46] text-white" placeholder="أدخل المفتاح" value={keys[p.id] || ''} onChange={(e)=>onKeyChange(p.id, e.target.value)} />
                  <button onClick={()=>handleValidate(p.id)} className="px-3 py-2 rounded-lg bg-[#141c2e] border border-[#1f2a46] text-white hover:bg-[#192338]">تحقق</button>
                </div>
                <div className="flex items-center gap-2">
                  <select defaultValue={p.defaultModel} className="px-3 py-2 rounded-lg bg-[#0e1524] border border-[#1f2a46] text-white">
                    <option value={p.defaultModel}>{p.defaultModel}</option>
                  </select>
                  <button onClick={()=>handleActivate(p.id, p.defaultModel)} className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white">تفعيل المزود</button>
                </div>
              </div>
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative">
      <button
        onClick={()=>setOpen(v=>!v)}
        className={`p-2 rounded-lg transition-colors ${open ? 'bg-fuchsia-600 text-white hover:bg-fuchsia-700' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
        title="مزودي الذكاء الصناعي"
      >
        <Sparkles className="w-4 h-4"/>
      </button>
      {open && Panel}
    </div>
  );
};

export default TopBar;
