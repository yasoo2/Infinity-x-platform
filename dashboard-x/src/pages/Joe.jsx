import React, { useEffect, useState, useRef } from 'react';
import ChatSidebar from '../components/ChatSidebar';
import FileUpload from '../components/FileUpload';
import { useJoeChat } from '../hooks/useJoeChat.js';
import JoeScreen from '../components/JoeScreen.jsx';

const Joe = () => {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isScreenVisible, setIsScreenVisible] = useState(false);
  
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
    transcript,
    wsLog,
    aiEngine, // Added aiEngine
    setAiEngine, // Added setAiEngine
  } = useJoeChat();

  React.useEffect(() => {
    if (transcript) {
      setInput(transcript);
    }
  }, [transcript, setInput]);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <>
    <div className="min-h-[calc(100vh-4rem)] flex flex-col md:flex-row bg-gray-950 text-white relative">
      {/* Mobile Sidebar Toggle Button */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="md:hidden fixed top-20 left-4 z-50 bg-cyan-500 hover:bg-cyan-600 text-white p-3 rounded-lg shadow-lg shadow-cyan-500/50 transition-all duration-200"
      >
        {isSidebarOpen ? '✕' : '☰'}
      </button>

      {/* Chat Sidebar - Responsive */}
      <div className={`
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
        fixed md:relative
        inset-y-0 left-0
        z-40
        w-72 md:w-80
        transition-transform duration-300 ease-in-out
        md:block
      `}>
        <ChatSidebar
          userId={userId}
          conversations={conversations}
          currentConversation={currentConversation}
          onConversationSelect={(conv) => {
            handleConversationSelect(conv);
            setIsSidebarOpen(false);
          }}
          onNewConversation={() => {
            handleNewConversation();
            setIsSidebarOpen(false);
          }}
        />
      </div>

      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Chat Area - Responsive */}
      <div className="flex-1 flex flex-col backdrop-blur-sm bg-gray-900/80 h-screen md:min-h-0">
        {/* Header - Responsive */}
        <div className="border-b border-fuchsia-500/50 p-3 sm:p-4 md:p-6 bg-gray-900/50 backdrop-blur-md shadow-xl shadow-fuchsia-900/20 flex-shrink-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-1 md:mb-2">
            <span className="text-cyan-400 drop-shadow-[0_0_5px_rgba(0,255,255,0.8)]">xElite</span>
            <span className="text-fuchsia-400 drop-shadow-[0_0_5px_rgba(255,0,255,0.8)]">Solutions</span>
            <span className="text-gray-500 text-sm sm:text-base md:text-xl ml-2 md:ml-3">| AGI Platform</span>
          </h1>
          <p className="text-gray-400 font-light text-xs sm:text-sm md:text-base">
            🚀 Your intelligent assistant for building and developing projects
          </p>
          <button
            onClick={() => setIsScreenVisible(true)}
            className="lg:hidden bg-fuchsia-500 hover:bg-fuchsia-600 text-white text-xs px-2 py-1 rounded transition-all duration-200 mt-2"
          >
            🕹️ شاشة جو
          </button>
          {/* AI Engine Switcher */}
          <div className="flex gap-2 items-center mt-2">
            <span className="text-sm text-gray-400 font-medium">AI Engine:</span>
            <button
              onClick={() => setAiEngine('openai')}
              className={`px-3 py-1 rounded-lg transition-all duration-200 font-medium text-xs ${
                aiEngine === 'openai'
                  ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/50'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              }`}
            >
              🤖 OpenAI
            </button>
            <button
              onClick={() => setAiEngine('gemini')}
              className={`px-3 py-1 rounded-lg transition-all duration-200 font-medium text-xs ${
                aiEngine === 'gemini'
                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/50'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              }`}
            >
              ✨ Gemini
            </button>
            <button
              onClick={() => setAiEngine('grok')}
              className={`px-3 py-1 rounded-lg transition-all duration-200 font-medium text-xs ${
                aiEngine === 'grok'
                  ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/50'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              }`}
            >
              ⚡ Grok
            </button>
          </div>
        </div>

        {/* Messages Area - Responsive */}
        <div id="messages-container" className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 space-y-3 md:space-y-4 bg-transparent">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 py-8 sm:py-10 md:py-12 bg-gray-800/20 border border-cyan-500/10 rounded-xl p-4 sm:p-6 md:p-8 shadow-inner shadow-cyan-900/30">
              <div className="text-4xl sm:text-5xl md:text-6xl mb-3 md:mb-4 animate-pulse">🤖</div>
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-2 text-cyan-400 drop-shadow-[0_0_5px_rgba(0,255,255,0.5)]">Welcome to xEliteSolutions AGI</h2>
              <p className="text-gray-400 mb-3 md:mb-4 text-sm sm:text-base">Talk to me or type what you want!</p>
              <div className="text-xs sm:text-sm space-y-1 sm:space-y-2 text-gray-400">
                <p>💬 Example: "Hello Joe"</p>
                <p>🏪 Example: "Build an e-commerce store"</p>
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
                className={`max-w-[90%] sm:max-w-[85%] md:max-w-[80%] rounded-lg p-3 sm:p-4 shadow-sm ${
                  msg.type === 'user'
                    ? 'bg-indigo-500/80 text-white shadow-lg shadow-indigo-500/30'
                    : 'bg-gray-700/50 border border-gray-600 text-gray-200 shadow-md'
                }`}
              >
                <div className="flex items-start gap-2 sm:gap-3">
                  <div className="flex-1">
                    <div className="font-medium mb-1 text-sm sm:text-base">
                      {msg.type === 'user' ? 'You' : 'JOE'}
                    </div>
                    <div className="leading-relaxed text-sm sm:text-base break-words">
                      {msg.content}
                      {msg.isTyping && <span className="animate-pulse">▊</span>}
                    </div>
                    <div className="text-xs text-gray-400 mt-1 sm:mt-2">{msg.timestamp}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} /> {/* Scroll target */}

          {/* Progress Bar - Responsive */}
          {isProcessing && progress > 0 && (
            <div className="bg-gray-800/50 border border-fuchsia-500/50 rounded-lg p-3 sm:p-4 shadow-xl shadow-fuchsia-900/30">
              <div className="flex justify-between text-xs sm:text-sm mb-2">
                <span className="text-gray-400 truncate pr-2">{currentStep}</span>
                <span className="text-cyan-400 font-bold whitespace-nowrap">{progress}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2 sm:h-3">
                <div
                  className="bg-gradient-to-r from-cyan-400 to-fuchsia-400 h-2 sm:h-3 rounded-full transition-all duration-500 shadow-lg shadow-cyan-500/50"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Build Result - Responsive */}
          {buildResult && (
            <div className="bg-gray-800/50 border border-green-500/50 rounded-lg p-4 sm:p-5 md:p-6 shadow-2xl shadow-green-500/20">
              <h3 className="text-lg sm:text-xl font-bold text-green-400 mb-3 sm:mb-4 drop-shadow-[0_0_5px_rgba(0,255,0,0.5)]">🎉 Project Ready!</h3>
              <div className="space-y-2 sm:space-y-3">
                <div>
                  <p className="text-xs sm:text-sm text-gray-400 mb-1">GitHub Repository:</p>
                  <a
                    href={buildResult.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-400 hover:underline break-all text-xs sm:text-sm"
                  >
                    {buildResult.githubUrl} ↗
                  </a>
                </div>
                {buildResult.liveUrl && (
                  <div>
                    <p className="text-xs sm:text-sm text-gray-400 mb-1">Live Website:</p>
                    <a
                      href={buildResult.liveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-fuchsia-400 hover:underline break-all text-xs sm:text-sm"
                    >
                      {buildResult.liveUrl} ↗
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Input Area - Responsive */}
        <div className="border-t border-cyan-500/50 bg-gray-900/50 p-3 sm:p-4 backdrop-blur-md shadow-2xl shadow-cyan-900/20 flex-shrink-0">
          {/* Input Controls - Responsive */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            {/* Voice and Input Row */}
            <div className="flex gap-2 sm:gap-3 flex-1">
              <button
                onClick={handleVoiceInput}
                className={`p-2 sm:p-3 rounded-lg transition-all duration-200 ${
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
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !isProcessing && input.trim()) {
                    handleSend();
                  }
                }}
                placeholder="Type or speak..."
                className="input-field flex-1 text-sm sm:text-base md:text-lg bg-gray-700/50 border border-indigo-700 text-white placeholder-gray-400 focus:ring-cyan-500 focus:border-cyan-500 rounded-lg px-3 sm:px-4 py-2 sm:py-3"
                disabled={isProcessing}
              />
            </div>

            {/* Action Buttons Row */}
            <div className="flex gap-2 sm:gap-3">
              <button
                onClick={() => alert('Attachment functionality will be implemented here.')}
                className="p-2 sm:p-3 rounded-lg transition-all duration-200 bg-gray-700 hover:bg-gray-600 text-gray-300 shadow-md"
                title="Attach File"
              >
                📎
              </button>
              {canStop && (
                <button
                  onClick={stopProcessing}
                  className="flex-1 sm:flex-none bg-red-500 hover:bg-red-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg transition-all duration-200 shadow-lg shadow-red-500/50 text-sm sm:text-base"
                >
                  ⏹️ Stop
                </button>
              )}
              
              <button
                onClick={handleSend}
                disabled={isProcessing || !input.trim()}
                className="flex-1 sm:flex-none bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg transition-all duration-200 shadow-lg shadow-cyan-500/50 text-sm sm:text-base"
              >
                ➤ Send
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Token Modal - Responsive */}
      {showTokenModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-fuchsia-500/50 rounded-lg p-4 sm:p-6 max-w-md w-full relative shadow-2xl shadow-fuchsia-900/50 max-h-[90vh] overflow-y-auto">
            <button
              onClick={closeTokenModal}
              className="absolute top-2 sm:top-4 right-2 sm:right-4 text-gray-400 hover:text-cyan-400 text-2xl"
            >
              ×
            </button>
            <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 text-cyan-400">
              {tokenType === 'github' && '🔑 GitHub Token Required'}
              {tokenType === 'cloudflare' && '🔑 Cloudflare Token Required'}
              {tokenType === 'render' && '🔑 Render Token Required'}
            </h3>
            {tokenType === 'github' && (
              <>
                <div className="mb-3 sm:mb-4">
                  <label className="block text-xs sm:text-sm font-medium text-gray-400 mb-2">
                    GitHub Username
                  </label>
                  <input
                    type="text"
                    value={tokens.githubUsername}
                    onChange={(e) => setTokens(prev => ({ ...prev, githubUsername: e.target.value }))}
                    className="input-field w-full bg-gray-700/50 border border-indigo-700 text-white placeholder-gray-400 focus:ring-cyan-500 focus:border-cyan-500 text-sm sm:text-base rounded-lg px-3 py-2"
                    placeholder="your-username"
                  />
                </div>
                <div className="mb-3 sm:mb-4">
                  <label className="block text-xs sm:text-sm font-medium text-gray-400 mb-2">
                    Personal Access Token
                  </label>
                  <input
                    type="password"
                    value={tokenValue}
                    onChange={(e) => setTokenValue(e.target.value)}
                    className="input-field w-full bg-gray-700/50 border border-indigo-700 text-white placeholder-gray-400 focus:ring-cyan-500 focus:border-cyan-500 text-sm sm:text-base rounded-lg px-3 py-2"
                    placeholder="ghp_xxxxxxxxxxxx"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Get it from: <a href="https://github.com/settings/tokens" target="_blank" className="text-cyan-400 hover:underline">GitHub Settings</a>
                  </p>
                </div>
              </>
            )}
            <div className="flex gap-2 sm:gap-3">
              <button
                onClick={closeTokenModal}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-3 sm:px-4 py-2 rounded-lg transition-all duration-200 text-sm sm:text-base"
              >
                ❌ Cancel
              </button>
              <button
                onClick={saveToken}
                className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white px-3 sm:px-4 py-2 rounded-lg transition-all duration-200 shadow-lg shadow-cyan-500/50 text-sm sm:text-base"
                disabled={!tokenValue || (tokenType === 'github' && !tokens.githubUsername)}
              >
                💾 Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    
    {/* Joe's Computer Screen - Responsive (Hidden on mobile) */}
    {/* Joe's Computer Screen - Responsive */}
    <div className={`
      fixed inset-0 z-50 bg-gray-950/90 backdrop-blur-sm
      ${isScreenVisible ? 'block' : 'hidden'}
      lg:relative lg:block lg:z-auto lg:bg-transparent lg:backdrop-blur-none
      lg:w-1/3 lg:flex-shrink-0 lg:p-4
    `}>
      <JoeScreen 
        isProcessing={isProcessing} 
        progress={progress} 
        wsLog={wsLog}
        onTakeover={() => alert('User Takeover logic will be implemented here.')}
      />
      <button
        onClick={() => setIsScreenVisible(false)}
        className="lg:hidden absolute top-4 right-4 text-white text-3xl z-50"
      >
        ×
      </button>
    </div>
    </>
  );
};

export default Joe;
