import React, { useState } from 'react';
import ChatSidebar from '../components/ChatSidebar';

const JoeV2 = () => {
  const [aiEngine, setAiEngine] = useState('openai');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [userId] = useState('test-user-123');
  const [conversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);

  const handleSend = () => {
    if (!input.trim() || isProcessing) return;

    const userMessage = {
      type: 'user',
      content: input.trim(),
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsProcessing(true);

    setTimeout(() => {
      const joeMessage = {
        type: 'joe',
        content: `I received your message: "${userMessage.content}". Using ${aiEngine} engine.`,
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages(prev => [...prev, joeMessage]);
      setIsProcessing(false);
    }, 1000);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleConversationSelect = (convId) => {
    setCurrentConversation(convId);
  };

  const handleNewConversation = () => {
    setMessages([]);
    setCurrentConversation(null);
  };

  return (
    <div className="min-h-screen flex bg-gray-950 text-white">
      {/* Chat Sidebar */}
      <ChatSidebar
        userId={userId}
        conversations={conversations}
        currentConversation={currentConversation}
        onConversationSelect={handleConversationSelect}
        onNewConversation={handleNewConversation}
      />

      {/* Main Content - Making it resizable and movable is complex and requires external libraries (like react-draggable, react-resizable). For a quick fix, I will make it a central, contained, and scrollable area. */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-4xl h-[calc(100vh-4rem)] flex flex-col bg-gray-900 rounded-xl shadow-2xl shadow-fuchsia-900/50 overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-fuchsia-500/50 p-6 bg-gray-900/50 backdrop-blur-md shadow-xl shadow-fuchsia-900/20">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                <span className="text-cyan-400 drop-shadow-[0_0_5px_rgba(0,255,255,0.8)]">xElite</span>
                <span className="text-fuchsia-400 drop-shadow-[0_0_5px_rgba(255,0,255,0.8)]">Solutions</span>
                <span className="text-gray-500 text-xl ml-3">| AGI Platform</span>
              </h1>
              <p className="text-gray-400 font-light">
                🚀 Your intelligent assistant - Version 2 with ChatSidebar
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
        <div className="flex-1 overflow-y-auto p-6 bg-transparent space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-gray-500 py-12 bg-gray-800/20 border border-cyan-500/10 rounded-xl p-8">
                <div className="text-6xl mb-4 animate-pulse">🤖</div>
                <h2 className="text-2xl font-bold mb-2 text-cyan-400">Welcome to JOE v2</h2>
                <p className="text-gray-400 mb-4">Testing with ChatSidebar component</p>
              </div>
            )}

            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-4 shadow-sm ${
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
                      <div className="leading-relaxed">{msg.content}</div>
                      <div className="text-xs text-gray-400 mt-2">{msg.timestamp}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {isProcessing && (
              <div className="flex justify-start">
                <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-4">
                  <div className="animate-pulse">🤖 JOE is thinking...</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="flex-shrink-0 border-t border-cyan-500/50 bg-gray-900/50 p-4 backdrop-blur-md shadow-2xl shadow-cyan-900/20">
          <div className="w-full flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="flex-1 text-lg bg-gray-700/50 border border-indigo-700 text-white placeholder-gray-400 focus:ring-cyan-500 focus:border-cyan-500 rounded-lg px-4 py-3"
              disabled={isProcessing}
            />
            
            <button
              onClick={handleSend}
              disabled={isProcessing || !input.trim()}
              className="bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg transition-all duration-200 shadow-lg shadow-cyan-500/50"
            >
              ➤ Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JoeV2;


