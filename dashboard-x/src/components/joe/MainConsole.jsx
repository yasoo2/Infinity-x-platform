
import React, { useEffect, useRef } from 'react';
import { FiMic, FiPaperclip, FiSend, FiStopCircle, FiCompass } from 'react-icons/fi';
import { useJoeChat } from '../../hooks/useJoeChat.js';

const WelcomeScreen = () => (
  <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
    <FiCompass size={64} className="mb-4 text-gray-500" />
    <h1 className="text-2xl font-bold text-gray-200">Welcome to Joe</h1>
    <p className="max-w-md mt-2">Your AI-powered engineering partner. Start by typing an instruction below, attaching a file, or using your voice.</p>
  </div>
);

const MainConsole = () => {
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null); // Ref for the end of messages

  const { 
    messages, isProcessing, progress, currentStep, 
    input, setInput, isListening, handleSend, stopProcessing, 
    handleVoiceInput, transcript
  } = useJoeChat();

  // Auto-scroll to the latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
      const fileInfo = `Attached file: ${file.name}\n\n'''\n${content}\n'''`;
      setInput(prev => prev ? `${prev}\n${fileInfo}` : fileInfo);
    };
    reader.readAsText(file);
  };

  return (
    <div className="bg-gray-800 flex flex-col h-full" style={{ gridArea: 'main' }}>
      <div className="flex-1 overflow-y-auto p-6">
        {messages.length === 0 ? (
          <WelcomeScreen />
        ) : (
          <div className="space-y-6">
            {messages.map((msg, index) => (
              <div key={msg.id || index} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-3xl rounded-lg px-5 py-3 shadow-lg ${msg.type === 'user' ? 'bg-indigo-700' : 'bg-gray-700'}`}>
                  <p className="text-base text-gray-50 whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
             {isProcessing && (
                <div className="w-full max-w-3xl mx-auto bg-gray-700 rounded-full h-2 mt-4">
                  <div className="bg-cyan-500 h-2 rounded-full" style={{ width: `${progress}%` }}></div>
                  <p className="text-xs text-center text-gray-400 mt-1.5">{currentStep}</p>
                </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-gray-900/60 backdrop-blur-sm border-t border-cyan-500/20">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center bg-gray-800 border border-gray-600 rounded-lg px-3 py-2.5 focus-within:ring-2 focus-within:ring-cyan-500 transition-all duration-200">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !isProcessing && input.trim()) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Instruct Joe... (Shift+Enter for new line)"
              className="flex-1 bg-transparent outline-none resize-none text-white placeholder-gray-400 pr-4 text-base"
              rows={1}
              style={{ maxHeight: '150px' }}
            />
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
            <button onClick={handleFileClick} className="text-gray-400 hover:text-cyan-400 p-2" disabled={isProcessing} title="Attach File">
              <FiPaperclip size={20} />
            </button>
            <button onClick={handleVoiceInput} className={`p-2 ${isListening ? 'text-red-500 animate-pulse' : 'text-gray-400 hover:text-cyan-400'}`} disabled={isProcessing} title="Voice Input">
              <FiMic size={20} />
            </button>

            {isProcessing ? (
              <button onClick={stopProcessing} className="bg-red-600 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-red-700 flex items-center gap-2 ml-2">
                <FiStopCircle /> Stop
              </button>
            ) : (
              <button onClick={handleSend} disabled={!input.trim()} className="text-gray-300 hover:text-cyan-400 p-2 disabled:text-gray-600 ml-2">
                <FiSend size={22} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainConsole;
