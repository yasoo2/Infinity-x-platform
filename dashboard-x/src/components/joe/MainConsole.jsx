
import React, { useEffect, useRef } from 'react';
import { FiMic, FiPaperclip, FiSend, FiStopCircle } from 'react-icons/fi';
import { useJoeChat } from '../../hooks/useJoeChat.js';
import JoeScreen from '../JoeScreen.jsx'; // We'll integrate this visually later

const MainConsole = () => {
  const fileInputRef = useRef(null);
  const {
    messages,
    isProcessing,
    progress,
    currentStep,
    input,
    setInput,
    isListening,
    handleSend,
    stopProcessing,
    handleVoiceInput,
    transcript,
    wsLog, // We'll use this for the bottom panel later
  } = useJoeChat();

  useEffect(() => {
    if (transcript) {
      setInput(transcript);
    }
  }, [transcript, setInput]);

  const handleFileClick = () => {
    fileInputRef.current.click();
  };

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
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
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
              <button
                onClick={stopProcessing}
                className="bg-red-600 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-red-700 flex items-center gap-2 ml-2 transition-all duration-200"
              >
                <FiStopCircle />
                Stop
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="text-gray-300 hover:text-cyan-400 p-2 disabled:text-gray-600 disabled:cursor-not-allowed ml-2 transition-all duration-200"
                title="Send Message"
              >
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
