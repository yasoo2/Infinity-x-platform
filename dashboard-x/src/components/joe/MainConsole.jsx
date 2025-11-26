import React, { useEffect, useRef } from 'react';
import { FiMic, FiPaperclip, FiSend, FiStopCircle, FiCompass } from 'react-icons/fi';
import { useJoeChat } from '../../hooks/useJoeChat.js';

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

  const { 
    messages, isProcessing, progress, currentStep, 
    input, setInput, isListening, handleSend, stopProcessing, 
    handleVoiceInput, transcript
  } = useJoeChat();

  // Auto-scroll to the latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-8 py-6">
          {messages.length === 0 ? (
            <WelcomeScreen />
          ) : (
            <div className="space-y-5">
              {messages.map((msg, index) => (
                <div 
                  key={msg.id || index} 
                  className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[75%] rounded-2xl px-5 py-4 shadow-lg ${
                      msg.type === 'user' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-800 text-gray-100 border border-gray-700'
                    }`}
                  >
                    <p className="text-base leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
              
              {/* Progress Bar */}
              {isProcessing && (
                <div className="flex justify-start">
                  <div className="max-w-[75%] bg-gray-800 border border-gray-700 rounded-2xl px-5 py-4">
                    <div className="w-full bg-gray-700 rounded-full h-2.5 mb-2">
                      <div 
                        className="bg-blue-500 h-2.5 rounded-full transition-all duration-300" 
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
      </div>

      {/* Input Area - Fixed at Bottom, Centered and Spacious */}
      <div className="border-t border-gray-800 bg-gray-900/98 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-8 py-5">
          <div className="flex items-end gap-3 bg-gray-800 border border-gray-700 rounded-2xl px-5 py-4 focus-within:ring-2 focus-within:ring-blue-500 transition-all">
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
                className="p-2.5 text-gray-400 hover:text-blue-400 hover:bg-gray-700 rounded-lg transition-colors" 
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
                    : 'text-gray-400 hover:text-blue-400 hover:bg-gray-700'
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
                  className="p-2.5 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
        </div>
      </div>
    </div>
  );
};

export default MainConsole;
