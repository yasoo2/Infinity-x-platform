import React from 'react';
import ChatSidebar from '../components/ChatSidebar';
import FileUpload from '../components/FileUpload';
import { useJoeChat } from '../hooks/useJoeChat.js';
import JoeDesktopView from '../components/JoeDesktopView.jsx';

const Joe = () => {
  // AI Engine State
  const [aiEngine, setAiEngine] = React.useState('openai');
  // Sidebar State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);

  // These state variables and handlers need to be defined within the component.
  // I'm assuming they come from a custom hook like `useJoeChat`.
  const {
    userId,
    conversations,
    currentConversation,
    messages,
    isProcessing,
    progress,
    currentStep,
    buildResult,
    canStop,
    input,
    setInput,
    isListening,
    showTokenModal,
    tokenType,
    tokenValue,
    setTokenValue,
    tokens,
    setTokens,
    handleConversationSelect,
    handleNewConversation,
    handleSend,
    stopProcessing,
    handleVoiceInput,
    saveToken,
    closeTokenModal,
    transcript, // إضافة transcript
    wsLog, // إضافة سجل WebSocket
  } = useJoeChat();

  // Wrap handleSend to include aiEngine
  const handleSendWithEngine = async () => {
    await handleSend(aiEngine);
  };

  // تأثير جانبي للتعامل مع نتيجة الإملاء الصوتي
  React.useEffect(() => {
    if (transcript) {
      setInput(transcript);
    }
  }, [transcript, setInput]);

  return (
    <>
    <div className="min-h-[calc(100vh-4rem)] flex bg-gray-950 text-white">


      {/* Chat Sidebar */}
      {!isSidebarCollapsed && (
        <ChatSidebar
          userId={userId}
          conversations={conversations}
          currentConversation={currentConversation}
          onConversationSelect={handleConversationSelect}
          onNewConversation={handleNewConversation}
          onCollapse={() => setIsSidebarCollapsed(true)}
        />
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col backdrop-blur-sm bg-gray-900/80">
        {/* Header */}
        <div className="border-b border-fuchsia-500/50 p-6 bg-gray-900/50 backdrop-blur-md shadow-xl shadow-fuchsia-900/20">
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                  className="bg-gray-800 hover:bg-gray-700 text-white p-3 rounded-lg shadow-md transition-all duration-200"
                  title={isSidebarCollapsed ? 'Show Sidebar' : 'Hide Sidebar'}
                >
                  {isSidebarCollapsed ? '☰' : '✕'}
                </button>
                <h1 className="text-3xl font-bold">
                <span className="text-cyan-400 drop-shadow-[0_0_5px_rgba(0,255,255,0.8)]">xElite</span>
                <span className="text-fuchsia-400 drop-shadow-[0_0_5px_rgba(255,0,255,0.8)]">Solutions</span>
                <span className="text-gray-500 text-xl ml-3">| AGI Platform</span>
              </h1>
              </div>
              <p className="text-gray-400 font-light">
                🚀 Your intelligent assistant for building and developing projects
              </p>
            </div>
            {/* AI Engine Switcher */}
            <div className="flex gap-2 items-center">
              <span className="text-sm text-gray-400 font-medium">AI Engine:</span>
              <button
                onClick={() => setAiEngine('openai')}
                className={`px-4 py-2 rounded-lg transition-all duration-200 font-medium ${
                  aiEngine === 'openai'
                    ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/50'
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                }`}
              >
                🤖 OpenAI
              </button>
              <button
                onClick={() => setAiEngine('gemini')}
                className={`px-4 py-2 rounded-lg transition-all duration-200 font-medium ${
                  aiEngine === 'gemini'
                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/50'
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                }`}
              >
                ✨ Gemini
              </button>
              <button
                onClick={() => setAiEngine('grok')}
                className={`px-4 py-2 rounded-lg transition-all duration-200 font-medium ${
                  aiEngine === 'grok'
                    ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/50'
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                }`}
              >
                ⚡ Grok
              </button>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-transparent flex">
          <div className="flex-1 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 py-12 bg-gray-800/20 border border-cyan-500/10 rounded-xl p-8 shadow-inner shadow-cyan-900/30">
              <div className="text-6xl mb-4 animate-pulse">🤖</div>
              <h2 className="text-2xl font-bold mb-2 text-cyan-400 drop-shadow-[0_0_5px_rgba(0,255,255,0.5)]">Welcome to xEliteSolutions AGI</h2>
              <p className="text-gray-400 mb-4">Talk to me or type what you want!</p>
              <div className="text-sm space-y-2 text-gray-400">
                <p>💬 Example: "Hello Joe"</p>
                <p>🏪 Example: "Build an e-commerce store for accessories"</p>
                <p>🧬 Example: "Evolve yourself"</p>
              </div>
            </div>
          )}

          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-4 shadow-sm break-words overflow-wrap-anywhere ${
                  msg.type === 'user'
                    ? 'bg-indigo-500/80 text-white shadow-lg shadow-indigo-500/30'
                    : 'bg-gray-700/50 border border-gray-600 text-gray-200 shadow-md'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="font-medium mb-1">
                      {msg.type === 'user' ? 'You' : 'JOE'}
                    </div>
                    <div className="leading-relaxed">
                      {msg.content}
                      {msg.isTyping && <span className="animate-pulse">▊</span>}
                    </div>
                    <div className="text-xs text-gray-400 mt-2">{msg.timestamp}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Progress Bar */}
          {isProcessing && progress > 0 && (
            <div className="bg-gray-800/50 border border-fuchsia-500/50 rounded-lg p-4 shadow-xl shadow-fuchsia-900/30">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">{currentStep}</span>
                <span className="text-cyan-400 font-bold">{progress}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-cyan-400 to-fuchsia-400 h-3 rounded-full transition-all duration-500 shadow-lg shadow-cyan-500/50"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Build Result */}
          {buildResult && (
            <div className="bg-gray-800/50 border border-green-500/50 rounded-lg p-6 shadow-2xl shadow-green-500/20">
              <h3 className="text-xl font-bold text-green-400 mb-4 drop-shadow-[0_0_5px_rgba(0,255,0,0.5)]">🎉 Project Ready!</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-400 mb-1">GitHub Repository:</p>
                  <a
                    href={buildResult.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-400 hover:underline break-all"
                  >
                    {buildResult.githubUrl} ↗
                  </a>
                </div>
                {buildResult.liveUrl && (
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Live Website:</p>
                    <a
                      href={buildResult.liveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-fuchsia-400 hover:underline break-all"
                    >
                      {buildResult.liveUrl} ↗
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
          </div>
          <div className="w-1/3 p-4">
            <JoeDesktopView 
              isProcessing={isProcessing} 
              progress={progress} 
              wsLog={wsLog}
              onVoiceInput={handleVoiceInput}
            />
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-cyan-500/50 bg-gray-900/50 p-4 backdrop-blur-md shadow-2xl shadow-cyan-900/20">
          {/* File Upload */}
          <div className="mb-4">
            <FileUpload onFileAnalyzed={(data) => {
              setInput(prev => prev + `\n\nUploaded file: ${data.fileName}\n${data.content}`);
            }} />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleVoiceInput}
              className={`p-3 rounded-lg transition-all duration-200 ${
                isListening 
                  ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/50' 
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300 shadow-md'
              }`}
            >
              {isListening ? '🎤...' : '🎤'}
            </button>
            
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendWithEngine();
                }
              }}
              placeholder="Type or speak... (e.g., Hello Joe, build a store, evolve yourself)"
              className="input-field flex-1 text-lg bg-gray-700/50 border border-indigo-700 text-white placeholder-gray-400 focus:ring-cyan-500 focus:border-cyan-500"
              disabled={isProcessing}
            />
            
            {canStop && (
              <button
                onClick={stopProcessing}
                className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg transition-all duration-200 shadow-lg shadow-red-500/50"
              >
                ⏹️ Stop
              </button>
            )}
            
            <button
              onClick={handleSendWithEngine}
              disabled={isProcessing || !input.trim()}
              className="bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg transition-all duration-200 shadow-lg shadow-cyan-500/50"
            >
              ➤ Send
            </button>
          </div>
        </div>
      </div>

      {/* Token Modal */}
      {showTokenModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-fuchsia-500/50 rounded-lg p-6 max-w-md w-full relative shadow-2xl shadow-fuchsia-900/50">
            <button
              onClick={closeTokenModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-cyan-400 text-2xl"
            >
              ×
            </button>
            <h3 className="text-xl font-bold mb-4 text-cyan-400">
              {tokenType === 'github' && '🔑 GitHub Token Required'}
              {tokenType === 'cloudflare' && '🔑 Cloudflare Token Required'}
              {tokenType === 'render' && '🔑 Render Token Required'}
            </h3>

            {tokenType === 'github' && (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    GitHub Username
                  </label>
                  <input
                    type="text"
                    value={tokens.githubUsername}
                    onChange={(e) => setTokens(prev => ({ ...prev, githubUsername: e.target.value }))}
                    className="input-field w-full bg-gray-700/50 border border-indigo-700 text-white placeholder-gray-400 focus:ring-cyan-500 focus:border-cyan-500"
                    placeholder="your-username"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Personal Access Token
                  </label>
                  <input
                    type="password"
                    value={tokenValue}
                    onChange={(e) => setTokenValue(e.target.value)}
                    className="input-field w-full bg-gray-700/50 border border-indigo-700 text-white placeholder-gray-400 focus:ring-cyan-500 focus:border-cyan-500"
                    placeholder="ghp_xxxxxxxxxxxx"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Get it from: <a href="https://github.com/settings/tokens" target="_blank" className="text-cyan-400 hover:underline">GitHub Settings</a>
                  </p>
                </div>
              </>
            )}
            <div className="flex gap-3">
              <button
                onClick={closeTokenModal}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-all duration-200"
              >
                ❌ Cancel
              </button>
              <button
                onClick={saveToken}
                className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg transition-all duration-200 shadow-lg shadow-cyan-500/50"
                disabled={!tokenValue || (tokenType === 'github' && !tokens.githubUsername)}
              >
                💾 Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>

    </>
  );
};

export default Joe;
