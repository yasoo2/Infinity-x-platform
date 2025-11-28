import React, { useEffect, useRef } from 'react';
import { FiMic, FiPaperclip, FiSend, FiStopCircle, FiCompass, FiArrowDown } from 'react-icons/fi';
import { useJoeChatContext } from '../../context/JoeChatContext.jsx';

const WelcomeScreen = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-6">
    <div className="max-w-3xl">
      <FiCompass size={72} className="mb-6 text-blue-500 mx-auto" />
      <h1 className="text-3xl font-bold text-white mb-4">Welcome to Joe AI Assistant</h1>
      <p className="text-lg text-gray-400 mb-8">
        Your AI-powered engineering partner with 82 tools and functions. 
        Start by typing an instruction below, attaching a file, or using your voice.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
        <div className="p-5 bg-gray-800 rounded-xl border border-gray-700 hover:border-blue-500 transition-colors">
          <div className="text-3xl mb-3">💬</div>
          <h3 className="font-semibold text-white mb-2">Chat & Ask</h3>
          <p className="text-sm text-gray-400">Get instant answers and explanations</p>
        </div>
        <div className="p-5 bg-gray-800 rounded-xl border border-gray-700 hover:border-blue-500 transition-colors">
          <div className="text-3xl mb-3">🛠️</div>
          <h3 className="font-semibold text-white mb-2">Build & Create</h3>
          <p className="text-sm text-gray-400">Generate projects and applications</p>
        </div>
        <div className="p-5 bg-gray-800 rounded-xl border border-gray-700 hover:border-blue-500 transition-colors">
          <div className="text-3xl mb-3">🔍</div>
          <h3 className="font-semibold text-white mb-2">Analyze & Process</h3>
          <p className="text-sm text-gray-400">Work with data and generate insights</p>
        </div>
      </div>
    </div>
  </div>
);

const MainConsole = () => {
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const showScrollRef = useRef(false);
  const [showScrollButton, setShowScrollButton] = React.useState(false);
  const [lang, setLang] = React.useState(() => {
    try { return localStorage.getItem('lang') === 'ar' ? 'ar' : 'en'; } catch { return 'ar'; }
  });

  const { 
    messages, isProcessing, progress, currentStep, 
    input, setInput, isListening, handleSend, stopProcessing, 
    handleVoiceInput, transcript, currentConversation
  } = useJoeChatContext();

  // Auto-scroll to the latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    // Hide scroll-to-bottom when new messages push to bottom
    setShowScrollButton(false);
  }, [messages, currentConversation]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 180) + 'px';
    }
  }, [input]);

  useEffect(() => {
    if (transcript) {
      setInput(transcript);
    }
  }, [transcript, setInput]);

  useEffect(() => {
    const onLang = () => {
      try { setLang(localStorage.getItem('lang') === 'ar' ? 'ar' : 'en'); } catch {}
    };
    window.addEventListener('joe:lang', onLang);
    return () => window.removeEventListener('joe:lang', onLang);
  }, []);

  const checkScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const threshold = 80;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
    showScrollRef.current = !atBottom;
    setShowScrollButton(!atBottom);
  };

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkScroll);
    // initial check
    checkScroll();
    return () => el.removeEventListener('scroll', checkScroll);
  }, []);

  const handleFileClick = () => fileInputRef.current.click();

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      const fileInfo = `Attached file: ${file.name}\n\n\`\`\`\n${content}\n\`\`\``;
      setInput(prev => prev ? `${prev}\n${fileInfo}` : fileInfo);
    };
    reader.readAsText(file);
  };


  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Messages Area - Spacious and Centered */}
      <div className="flex-1 overflow-y-auto" ref={scrollContainerRef}>
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-6">
          {messages.length === 0 || (messages.length === 1 && messages[0].type === 'joe' && messages[0].content.includes('Welcome to Joe AI Assistant')) ? (
            <WelcomeScreen />
          ) : (
            <div className="space-y-5">
              {messages.map((msg, index) => (
                <div 
                  key={msg.id || index} 
                  className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[90%] sm:max-w-[85%] md:max-w-[75%] rounded-2xl px-5 py-4 shadow-lg ${
                      msg.type === 'user' 
                        ? 'bg-yellow-600 text-black border border-yellow-600 ring-1 ring-yellow-600/20' 
                        : 'bg-gray-800 text-gray-100 border border-yellow-500/50 ring-1 ring-yellow-500/30'
                    }`}
                  >
                    <p className="text-base leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                  </div>
                </div>
              ))}
              
              {/* Progress Bar */}
              {isProcessing && (
                <div className="flex justify-start">
                  <div className="max-w-[75%] bg-gray-800 border border-gray-700 rounded-2xl px-5 py-4">
                    <div className="w-full bg-gray-700 rounded-full h-2.5 mb-2">
                      <div 
                        className="bg-yellow-500 h-2.5 rounded-full transition-all duration-300" 
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    <p className="text-sm text-gray-400">{currentStep || 'Processing your request...'}</p>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
        {/* Scroll To Bottom - Floating Button */}
        <button
          onClick={() => {
            const el = scrollContainerRef.current;
            if (!el) return;
            el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            setShowScrollButton(false);
          }}
          title={lang==='ar'?'إلى الأسفل':'Scroll to Bottom'}
          className={`fixed bottom-40 right-6 z-50 ${showScrollButton ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'} transition-opacity`}
        >
          <span className="w-10 h-10 inline-flex items-center justify-center rounded-full bg-yellow-600 text-black hover:bg-yellow-700 border border-yellow-600 shadow-lg">
            <FiArrowDown size={18} />
          </span>
        </button>
      </div>

      {/* Conversations strip removed to avoid duplication with left SidePanel */}

      {/* Input Area - Fixed at Bottom, Centered and Spacious */}
      <div className="border-t border-gray-800 bg-gray-900/98 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-5">
          <div className="flex items-end gap-3 bg-gray-800 border border-gray-700 rounded-2xl px-5 py-4 focus-within:ring-2 focus-within:ring-yellow-500 transition-all">
            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !isProcessing && input.trim()) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Message Joe... (Shift+Enter for new line)"
              className="flex-1 bg-transparent outline-none resize-none text-white placeholder-gray-500 text-base leading-relaxed"
              rows={1}
              style={{ minHeight: '28px', maxHeight: '180px' }}
              disabled={isProcessing}
            />

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
              />
              
              <button 
                onClick={handleFileClick} 
                className="p-2.5 text-gray-400 hover:text-yellow-400 hover:bg-gray-700 rounded-lg transition-colors" 
                disabled={isProcessing}
                title="Attach File"
              >
                <FiPaperclip size={20} />
              </button>
              
              <button 
                onClick={handleVoiceInput} 
                className={`p-2.5 rounded-lg transition-colors ${
                  isListening 
                    ? 'text-red-500 bg-red-500/10 animate-pulse' 
                    : 'text-gray-400 hover:text-yellow-400 hover:bg-gray-700'
                }`}
                disabled={isProcessing}
                title="Voice Input"
              >
                <FiMic size={20} />
              </button>

              {isProcessing ? (
                <button 
                  onClick={stopProcessing} 
                  className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                >
                  <FiStopCircle size={18} />
                  Stop
                </button>
              ) : (
                <button 
                  onClick={handleSend} 
                  disabled={!input.trim()} 
                  className="p-2.5 text-black bg-yellow-600 hover:bg-yellow-700 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Send Message"
                >
                  <FiSend size={20} />
                </button>
              )}
            </div>
          </div>
          
        {/* Helper Text */}
        <p className="text-xs text-gray-500 text-center mt-3">
          Joe can make mistakes. Consider checking important information.
        </p>
        {/* Robot moved to Joe page and enhanced */}
      </div>
    </div>
  </div>
  );
};

export default MainConsole;
