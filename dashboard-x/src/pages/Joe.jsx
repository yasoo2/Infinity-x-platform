import { useState, useRef, useEffect } from 'react';
import apiClient from '../api/client';
import VoiceInput from '../components/VoiceInput';
import BrowserViewer from '../components/BrowserViewer';
import ChatSidebar from '../components/ChatSidebar';

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
    github: localStorage.getItem('joe_github_token') || '',
    githubUsername: localStorage.getItem('joe_github_username') || '',
    cloudflare: localStorage.getItem('joe_cloudflare_token') || '',
    render: localStorage.getItem('joe_render_token') || ''
  });
  const [buildResult, setBuildResult] = useState(null);
  const [canStop, setCanStop] = useState(false);
  const [browserSessionId, setBrowserSessionId] = useState(null);
  const [showBrowser, setShowBrowser] = useState(false);
  
  // Chat History
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [userId] = useState(localStorage.getItem('userId') || 'user-' + Date.now());
  
  const messagesEndRef = useRef(null);
  const formRef = useRef(null);
  const stopTypingRef = useRef(false);

  useEffect(() => {
    // Save userId
    if (!localStorage.getItem('userId')) {
      localStorage.setItem('userId', userId);
    }
    
    // Create initial conversation
    createNewConversation();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const createNewConversation = async () => {
    try {
      const response = await apiClient.post(`${API_BASE}/api/chat-history/create`, {
        userId,
        title: 'محادثة جديدة'
      });

      if (response.data.ok) {
        setCurrentConversationId(response.data.conversationId);
        setMessages([]);
        setBuildResult(null);
      }
    } catch (error) {
      console.error('Create conversation error:', error);
    }
  };

  const loadConversation = async (conversationId) => {
    try {
      const response = await apiClient.post(`${API_BASE}/api/chat-history/get`, {
        conversationId
      });

      if (response.data.ok) {
        setCurrentConversationId(conversationId);
        setMessages(response.data.conversation.messages || []);
        setBuildResult(null);
      }
    } catch (error) {
      console.error('Load conversation error:', error);
    }
  };

  const saveMessage = async (message) => {
    if (!currentConversationId) return;

    try {
      await apiClient.post(`${API_BASE}/api/chat-history/add-message`, {
        conversationId: currentConversationId,
        message
      });

      // Generate title if this is the first user message
      if (messages.length === 0 && message.type === 'user') {
        await apiClient.post(`${API_BASE}/api/chat-history/generate-title`, {
          conversationId: currentConversationId,
          firstMessage: message.content
        });
      }
    } catch (error) {
      console.error('Save message error:', error);
    }
  };

  const addMessage = (content, type = 'assistant', isTyping = false) => {
    const msg = {
      id: Date.now() + Math.random(),
      content,
      type,
      timestamp: new Date().toLocaleTimeString(),
      isTyping
    };
    setMessages(prev => [...prev, msg]);
    
    // Save to database (don't wait)
    if (!isTyping) {
      saveMessage(msg);
    }
    
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
        const key = type === 'github' ? 'joe_github_token' : 
                    type === 'cloudflare' ? 'joe_cloudflare_token' :
                    type === 'render' ? 'joe_render_token' : '';
        const token = localStorage.getItem(key);
        if (token) {
          clearInterval(checkToken);
          setShowTokenModal(false);
          resolve(token);
        }
      }, 500);
    });
  };

  const closeTokenModal = () => {
    setShowTokenModal(false);
    setTokenType('');
    setTokenValue('');
  };

  const saveToken = () => {
    if (tokenType === 'github') {
      localStorage.setItem('joe_github_token', tokenValue);
      localStorage.setItem('joe_github_username', tokens.githubUsername);
      setTokens(prev => ({ ...prev, github: tokenValue }));
    } else if (tokenType === 'cloudflare') {
      localStorage.setItem('joe_cloudflare_token', tokenValue);
      setTokens(prev => ({ ...prev, cloudflare: tokenValue }));
    } else if (tokenType === 'render') {
      localStorage.setItem('joe_render_token', tokenValue);
      setTokens(prev => ({ ...prev, render: tokenValue }));
    }
    setTokenValue('');
    setShowTokenModal(false);
  };

  const simulateTyping = async (text, delay = 30) => {
    const msgId = addMessage('', 'assistant', true);
    setCanStop(true);
    stopTypingRef.current = false;
    
    for (let i = 0; i <= text.length; i++) {
      if (stopTypingRef.current) {
        const finalContent = text.substring(0, i) + ' [متوقف]';
        updateMessage(msgId, finalContent);
        // Save stopped message
        await saveMessage({ content: finalContent, type: 'assistant' });
        break;
      }
      await new Promise(resolve => setTimeout(resolve, delay));
      updateMessage(msgId, text.substring(0, i));
    }
    
    // Save complete message
    if (!stopTypingRef.current) {
      await saveMessage({ content: text, type: 'assistant' });
    }
    
    setCanStop(false);
  };

  const stopTyping = () => {
    stopTypingRef.current = true;
    setCanStop(false);
  };

  const handleSelfEvolve = async () => {
    try {
      await simulateTyping('🧬 حسناً! سأبدأ بتحليل نفسي...');
      setCurrentStep('تحليل ذاتي');
      setProgress(20);

      const response = await apiClient.post(`${API_BASE}/api/self-evolution/evolve`, {
        githubToken: tokens.github || await requestToken('github'),
        owner: tokens.githubUsername || 'yasoo2',
        repo: 'Infinity-x-platform'
      });

      if (!response.data.ok) throw new Error(response.data.error);

      setProgress(60);
      await simulateTyping(`✅ تم التحليل!\n\n📊 النتائج:\n- إجمالي الملفات: ${response.data.analysis.totalFiles}\n- ملفات الكود: ${response.data.analysis.codeFiles}\n- ملفات الإعدادات: ${response.data.analysis.configFiles}`);

      setProgress(80);
      await simulateTyping('\n\n💡 اقتراحات التحسين:\n' + 
        response.data.suggestions.improvements.slice(0, 3).map((imp, i) => 
          `${i + 1}. ${imp.title}: ${imp.description}`
        ).join('\n')
      );

      setProgress(100);
      await simulateTyping('\n\n✨ التحليل اكتمل! هل تريد مني تطبيق هذه التحسينات؟');

    } catch (error) {
      await simulateTyping(`❌ حدث خطأ: ${error.message}`);
    } finally {
      setProgress(0);
      setCurrentStep('');
    }
  };

  const startBrowserSession = async (url = 'https://www.google.com') => {
    try {
      const response = await apiClient.post(`${API_BASE}/api/browser/start`, {
        sessionId: `joe-${Date.now()}`,
        url
      });

      if (response.data.ok) {
        setBrowserSessionId(response.data.sessionId);
        setShowBrowser(true);
        await simulateTyping(`✅ تم فتح المتصفح! الآن يمكنك مشاهدة ما أفعله...`);
      }
    } catch (error) {
      await simulateTyping(`❌ خطأ في فتح المتصفح: ${error.message}`);
    }
  };

  const handleBuildProject = async (userMessage) => {
    try {
      await simulateTyping('🤔 فهمت! سأبني لك هذا المشروع...');
      setCurrentStep('فهم المتطلبات');
      setProgress(10);
      await new Promise(r => setTimeout(r, 1000));

      await simulateTyping('🤖 الآن سأستخدم Gemini AI لتوليد الكود الكامل...');
      setCurrentStep('توليد الكود بواسطة AI');
      setProgress(25);

      const response = await apiClient.post(`${API_BASE}/api/page-builder/create`, {
        projectType: userMessage.includes('متجر') ? 'store' : 'website',
        description: userMessage,
        style: 'modern',
        features: ['Responsive design', 'Modern UI', 'Fast loading'],
        githubToken: tokens.github || await requestToken('github'),
        githubUsername: tokens.githubUsername,
        repoName: `project-${Date.now()}`
      });

      if (!response.data.ok) throw new Error(response.data.error);

      setProgress(50);
      await simulateTyping('✅ تم توليد الكود بنجاح!');
      
      setCurrentStep('رفع الكود على GitHub');
      setProgress(75);
      await simulateTyping('📤 جاري الرفع على GitHub...');
      
      await new Promise(r => setTimeout(r, 2000));
      setProgress(100);
      await simulateTyping(`🎉 تم بنجاح!\n\nالمستودع: ${response.data.githubUrl}`);

      setBuildResult(response.data);

    } catch (error) {
      await simulateTyping(`❌ حدث خطأ: ${error.message}`);
    } finally {
      setProgress(0);
      setCurrentStep('');
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!input.trim() || isProcessing) return;

    const userMessage = input.trim();
    setInput('');
    addMessage(userMessage, 'user');
    setIsProcessing(true);
    setBuildResult(null);

    try {
      // Get JOE's response
      const chatResponse = await apiClient.post(`${API_BASE}/api/joe/chat`, {
        message: userMessage,
        context: messages.slice(-5).map(m => ({
          role: m.type === 'user' ? 'user' : 'assistant',
          content: m.content
        }))
      });

      if (!chatResponse.data.ok) throw new Error(chatResponse.data.error);

      const { response, action } = chatResponse.data;

      // Type JOE's response
      await simulateTyping(response);

      // Execute action if needed
      if (action === 'self-evolve') {
        await handleSelfEvolve();
      } else if (action === 'build-project' || action === 'build-store' || action === 'build-website') {
        await handleBuildProject(userMessage);
      } else if (userMessage.includes('متصفح') || userMessage.includes('browser')) {
        await startBrowserSession();
      }

    } catch (error) {
      console.error('Error:', error);
      await simulateTyping(`❌ حدث خطأ: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAutoSubmit = () => {
    if (formRef.current) {
      formRef.current.requestSubmit();
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Chat Sidebar */}
      <ChatSidebar
        userId={userId}
        currentConversationId={currentConversationId}
        onSelectConversation={loadConversation}
        onNewConversation={createNewConversation}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/20 to-secondary/20 border-b border-borderDim p-6">
          <h1 className="text-3xl font-bold mb-2">
            <span className="text-neonGreen">Infinity</span>
            <span className="text-neonBlue">X</span>
            <span className="text-textDim text-xl ml-3">JOE - Just One Engine</span>
          </h1>
          <p className="text-textDim">
            اكتب أو تحدث معي، وسأقوم بكل شيء تلقائياً! 🚀
          </p>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-bgDark">
          {messages.length === 0 && (
            <div className="text-center text-textDim py-12">
              <div className="text-6xl mb-4">🤖</div>
              <h2 className="text-2xl font-bold mb-2">مرحباً! أنا JOE</h2>
              <p className="mb-4">تحدث معي أو اكتب ما تريد!</p>
              <div className="text-sm space-y-2">
                <p>💬 مثال: "مرحباً جو"</p>
                <p>🏪 مثال: "ابني متجر إلكتروني للإكسسوارات"</p>
                <p>🧬 مثال: "طور نفسك"</p>
                <p>🌐 مثال: "صمم موقع لمطعم"</p>
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
          <form ref={formRef} onSubmit={handleSubmit} className="flex gap-3">
            <VoiceInput 
              onTranscript={(text) => setInput(text)}
              onAutoSubmit={handleAutoSubmit}
              disabled={isProcessing}
            />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="اكتب أو تحدث... (مثال: مرحباً جو، ابني متجر، طور نفسك)"
              className="input-field flex-1 text-lg"
              disabled={isProcessing}
            />
            {canStop && (
              <button
                type="button"
                onClick={stopTyping}
                className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg transition-all duration-200"
              >
                ⏹️ إيقاف
              </button>
            )}
            <button
              type="submit"
              className="btn-primary px-8"
              disabled={isProcessing || !input.trim()}
            >
              {isProcessing ? '⚙️ جاري...' : '🚀 إرسال'}
            </button>
          </form>
        </div>
      </div>

      {/* Token Modal */}
      {showTokenModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-cardDark border border-borderDim rounded-lg p-6 max-w-md w-full relative">
            <button
              onClick={closeTokenModal}
              className="absolute top-4 right-4 text-textDim hover:text-white text-2xl"
            >
              ×
            </button>
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

            <div className="flex gap-3">
              <button
                onClick={closeTokenModal}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-all duration-200"
              >
                ❌ Cancel
              </button>
              <button
                onClick={saveToken}
                className="flex-1 btn-primary"
                disabled={!tokenValue || (tokenType === 'github' && !tokens.githubUsername)}
              >
                💾 Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Browser Viewer */}
      {showBrowser && browserSessionId && (
        <BrowserViewer
          sessionId={browserSessionId}
          onClose={() => {
            setShowBrowser(false);
            setBrowserSessionId(null);
          }}
        />
      )}
    </div>
  );
}
