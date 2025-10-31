import { useState, useRef, useEffect } from 'react';
import apiClient from '../api/client';
import VoiceInput from '../components/VoiceInput';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://api.xelitesolutions.com';

export default function Joe() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState('');
  const [progress, setProgress] = useState(0);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [tokenType, setTokenType] = useState('');
  const [tokenValue, setTokenValue] = useState('');
  const [tokens, setTokens] = useState({
    github: localStorage.getItem('manus_github_token') || '',
    githubUsername: localStorage.getItem('manus_github_username') || '',
    cloudflare: localStorage.getItem('manus_cloudflare_token') || '',
    render: localStorage.getItem('manus_render_token') || ''
  });
  const [buildResult, setBuildResult] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addMessage = (content, type = 'assistant', isTyping = false) => {
    const msg = {
      id: Date.now(),
      content,
      type,
      timestamp: new Date().toLocaleTimeString(),
      isTyping
    };
    setMessages(prev => [...prev, msg]);
    return msg.id;
  };

  const updateMessage = (id, content) => {
    setMessages(prev => prev.map(msg => 
      msg.id === id ? { ...msg, content, isTyping: false } : msg
    ));
  };

  const requestToken = (type) => {
    return new Promise((resolve) => {
      setTokenType(type);
      setShowTokenModal(true);
      
      const checkToken = setInterval(() => {
        const key = type === 'github' ? 'manus_github_token' : 
                    type === 'cloudflare' ? 'manus_cloudflare_token' :
                    type === 'render' ? 'manus_render_token' : '';
        const token = localStorage.getItem(key);
        if (token) {
          clearInterval(checkToken);
          setShowTokenModal(false);
          resolve(token);
        }
      }, 500);
    });
  };

  const saveToken = () => {
    if (tokenType === 'github') {
      localStorage.setItem('manus_github_token', tokenValue);
      localStorage.setItem('manus_github_username', tokens.githubUsername);
      setTokens(prev => ({ ...prev, github: tokenValue }));
    } else if (tokenType === 'cloudflare') {
      localStorage.setItem('manus_cloudflare_token', tokenValue);
      setTokens(prev => ({ ...prev, cloudflare: tokenValue }));
    } else if (tokenType === 'render') {
      localStorage.setItem('manus_render_token', tokenValue);
      setTokens(prev => ({ ...prev, render: tokenValue }));
    }
    setTokenValue('');
    setShowTokenModal(false);
  };

  const simulateTyping = async (text, delay = 30) => {
    const msgId = addMessage('', 'assistant', true);
    for (let i = 0; i <= text.length; i++) {
      await new Promise(resolve => setTimeout(resolve, delay));
      updateMessage(msgId, text.substring(0, i));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    const userMessage = input.trim();
    setInput('');
    addMessage(userMessage, 'user');
    setIsProcessing(true);
    setProgress(0);
    setBuildResult(null);

    try {
      // Step 1: Understanding
      await simulateTyping('🤔 فهمت طلبك! سأبني لك متجر إلكتروني للإكسسوارات والعطور...');
      setCurrentStep('فهم المتطلبات');
      setProgress(10);
      await new Promise(r => setTimeout(r, 1000));

      // Step 2: AI Generation
      await simulateTyping('🤖 الآن سأستخدم Gemini AI لتوليد الكود الكامل...');
      setCurrentStep('توليد الكود بواسطة AI');
      setProgress(25);

      const response = await apiClient.post(`${API_BASE}/api/page-builder/create`, {
        projectType: 'store',
        description: userMessage,
        style: 'modern',
        features: ['Product catalog', 'Shopping cart', 'Checkout', 'Search'],
        githubToken: tokens.github || await requestToken('github'),
        githubUsername: tokens.githubUsername,
        repoName: 'accessories-perfume-store'
      });

      if (!response.data.ok) throw new Error(response.data.error);

      setProgress(50);
      await simulateTyping('✅ تم توليد الكود بنجاح!\n\nالملفات المولدة:\n- index.html\n- styles.css\n- script.js\n- products.json');
      
      // Step 3: GitHub
      setCurrentStep('رفع الكود على GitHub');
      setProgress(60);
      await simulateTyping('📤 الآن سأرفع الكود على GitHub...');
      
      if (!tokens.github) {
        await simulateTyping('⚠️ أحتاج إلى GitHub Token للمتابعة...');
        const githubToken = await requestToken('github');
        setTokens(prev => ({ ...prev, github: githubToken }));
      }

      await new Promise(r => setTimeout(r, 2000));
      setProgress(75);
      await simulateTyping(`✅ تم الرفع على GitHub بنجاح!\n\nالمستودع: ${response.data.githubUrl}`);

      // Step 4: Deployment
      setCurrentStep('نشر المشروع');
      setProgress(85);
      await simulateTyping('🌐 الآن سأنشر المشروع على الإنترنت...');
      
      await new Promise(r => setTimeout(r, 2000));
      setProgress(95);

      if (response.data.liveUrl) {
        await simulateTyping(`🎉 تم النشر بنجاح!\n\nالموقع المباشر: ${response.data.liveUrl}`);
      } else {
        await simulateTyping('✅ المشروع جاهز على GitHub! يمكنك نشره يدوياً على Cloudflare Pages أو Netlify.');
      }

      setProgress(100);
      setCurrentStep('اكتمل!');
      setBuildResult(response.data);

      await simulateTyping('✨ المشروع جاهز! هل تريد بناء شيء آخر؟');

    } catch (error) {
      console.error('Error:', error);
      await simulateTyping(`❌ حدث خطأ: ${error.message}`);
    } finally {
      setIsProcessing(false);
      setCurrentStep('');
      setProgress(0);
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/20 to-secondary/20 border-b border-borderDim p-6">
        <h1 className="text-3xl font-bold mb-2">
          <span className="text-neonGreen">Infinity</span>
          <span className="text-neonBlue">X</span>
            <span className="text-textDim text-xl ml-3">JOE - Just One Engine</span>
        </h1>
        <p className="text-textDim">
          اكتب ما تريد بناءه، وسأقوم ببنائه ونشره تلقائياً! 🚀
        </p>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-bgDark">
        {messages.length === 0 && (
          <div className="text-center text-textDim py-12">
            <div className="text-6xl mb-4">🤖</div>
            <h2 className="text-2xl font-bold mb-2">مرحباً! أنا JOE</h2>
            <p className="mb-4">اكتب ما تريد بناءه وسأقوم بكل شيء تلقائياً!</p>
            <div className="text-sm space-y-2">
              <p>مثال: "أريد متجر إلكتروني للإكسسوارات والعطور"</p>
              <p>مثال: "بناء موقع لمطعم إيطالي مع قائمة طعام"</p>
              <p>مثال: "صفحة رئيسية لشركة تقنية"</p>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-4 ${
                msg.type === 'user'
                  ? 'bg-primary text-white'
                  : 'bg-cardDark border border-borderDim'
              }`}
            >
              <div className="flex items-start gap-3">
                {msg.type === 'assistant' && (
                  <div className="text-2xl">🤖</div>
                )}
                <div className="flex-1">
                  <div className="whitespace-pre-wrap">
                    {msg.content}
                    {msg.isTyping && <span className="animate-pulse">▊</span>}
                  </div>
                  <div className="text-xs text-textDim mt-2">{msg.timestamp}</div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Progress Bar */}
        {isProcessing && progress > 0 && (
          <div className="bg-cardDark border border-borderDim rounded-lg p-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-textDim">{currentStep}</span>
              <span className="text-primary font-bold">{progress}%</span>
            </div>
            <div className="w-full bg-bgDark rounded-full h-3">
              <div
                className="bg-gradient-to-r from-primary to-secondary h-3 rounded-full transition-all duration-500 animate-pulse"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Build Result */}
        {buildResult && (
          <div className="bg-gradient-to-br from-green-500/10 to-teal-500/10 border border-green-500/50 rounded-lg p-6">
            <h3 className="text-xl font-bold text-green-400 mb-4">🎉 المشروع جاهز!</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-textDim mb-1">GitHub Repository:</p>
                <a
                  href={buildResult.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline break-all"
                >
                  {buildResult.githubUrl} ↗
                </a>
              </div>
              {buildResult.liveUrl && (
                <div>
                  <p className="text-sm text-textDim mb-1">Live Website:</p>
                  <a
                    href={buildResult.liveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-secondary hover:underline break-all"
                  >
                    {buildResult.liveUrl} ↗
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-borderDim bg-cardDark p-4">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <VoiceInput 
            onTranscript={(text) => setInput(text)}
            disabled={isProcessing}
          />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="اكتب ما تريد بناءه... (مثال: أريد متجر إلكتروني للإكسسوارات)"
            className="input-field flex-1 text-lg"
            disabled={isProcessing}
          />
          <button
            type="submit"
            className="btn-primary px-8"
            disabled={isProcessing || !input.trim()}
          >
            {isProcessing ? '⚙️ جاري البناء...' : '🚀 ابني!'}
          </button>
        </form>
      </div>

      {/* Token Modal */}
      {showTokenModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-cardDark border border-borderDim rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">
              {tokenType === 'github' && '🔑 GitHub Token Required'}
              {tokenType === 'cloudflare' && '🔑 Cloudflare Token Required'}
              {tokenType === 'render' && '🔑 Render Token Required'}
            </h3>
            
            {tokenType === 'github' && (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-textDim mb-2">
                    GitHub Username
                  </label>
                  <input
                    type="text"
                    value={tokens.githubUsername}
                    onChange={(e) => setTokens(prev => ({ ...prev, githubUsername: e.target.value }))}
                    className="input-field w-full"
                    placeholder="your-username"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-textDim mb-2">
                    Personal Access Token
                  </label>
                  <input
                    type="password"
                    value={tokenValue}
                    onChange={(e) => setTokenValue(e.target.value)}
                    className="input-field w-full"
                    placeholder="ghp_xxxxxxxxxxxx"
                  />
                  <p className="text-xs text-textDim mt-2">
                    Get it from: <a href="https://github.com/settings/tokens" target="_blank" className="text-primary hover:underline">GitHub Settings</a>
                  </p>
                </div>
              </>
            )}

            {tokenType === 'cloudflare' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-textDim mb-2">
                  Cloudflare API Token
                </label>
                <input
                  type="password"
                  value={tokenValue}
                  onChange={(e) => setTokenValue(e.target.value)}
                  className="input-field w-full"
                  placeholder="Your Cloudflare API Token"
                />
              </div>
            )}

            {tokenType === 'render' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-textDim mb-2">
                  Render API Key
                </label>
                <input
                  type="password"
                  value={tokenValue}
                  onChange={(e) => setTokenValue(e.target.value)}
                  className="input-field w-full"
                  placeholder="rnd_xxxxxxxxxxxx"
                />
              </div>
            )}

            <button
              onClick={saveToken}
              className="btn-primary w-full"
              disabled={!tokenValue || (tokenType === 'github' && !tokens.githubUsername)}
            >
              💾 Save & Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
