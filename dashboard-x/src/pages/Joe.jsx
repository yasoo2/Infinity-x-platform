
import React, { useEffect, useState, useRef } from 'react';
import { FiMic, FiPaperclip, FiSend } from 'react-icons/fi'; // Using react-icons for a cleaner look
import ChatSidebar from '../components/ChatSidebar';
import { useJoeChat } from '../hooks/useJoeChat.js';
import JoeScreen from '../components/JoeScreen.jsx';

const Joe = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isScreenExpanded, setIsScreenExpanded] = useState(false);
  const fileInputRef = useRef(null);
  
  const {
    // ... (rest of useJoeChat hooks remain the same)
    userId,
    conversations,
    currentConversation,
    messages,
    isProcessing,
    progress,
    currentStep,
    canStop,
    input,
    setInput,
    isListening,
    handleConversationSelect,
    handleNewConversation,
    handleSend,
    stopProcessing,
    handleVoiceInput,
    transcript,
    wsLog,
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
    <div className="flex h-screen bg-gray-950 text-white font-sans">
      {/* Chat Sidebar */}
      <div className={`transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:w-80 w-72 fixed md:relative z-40 h-full`}>
        <ChatSidebar
          userId={userId}
          conversations={conversations}
          currentConversation={currentConversation}
          onConversationSelect={handleConversationSelect}
          onNewConversation={handleNewConversation}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative">
        {/* Messages Area - takes up the remaining space */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg, index) => (
             <div key={index} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
               <div className={`max-w-2xl rounded-lg px-4 py-3 shadow-md ${msg.type === 'user' ? 'bg-indigo-600' : 'bg-gray-800'}`}>
                 <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
               </div>
             </div>
          ))}
           {isProcessing && (
            <div className="w-full bg-gray-800 rounded-full h-2.5 mt-4">
                <div className="bg-cyan-400 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                <p className="text-xs text-center text-gray-400 mt-1">{currentStep}</p>
            </div>
          )}
        </div>

        {/* "Manus-style" Input Area at the bottom */}
        <div className="p-4 bg-gray-900/50 backdrop-blur-md border-t border-cyan-500/20">
          <div className="flex items-end gap-4">
            
            {/* Live Screen (JoeScreen) - Small and to the left */}
            <div 
              className={`relative cursor-pointer transition-all duration-300 ease-in-out ${isScreenExpanded ? 'w-full h-full fixed inset-0 z-50' : 'w-48 h-28'}`}
              onClick={() => setIsScreenExpanded(!isScreenExpanded)}
            >
                <JoeScreen wsLog={wsLog} isProcessing={isProcessing} progress={progress} />
                <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity">
                    <p className="text-white font-bold">{isScreenExpanded ? 'Click to Shrink' : 'Click to Expand'}</p>
                </div>
            </div>

            {/* Smart Input Box - takes up the remaining space */}
            <div className="flex-1 flex items-center bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-cyan-500">
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
                className="flex-1 bg-transparent outline-none resize-none text-white placeholder-gray-500 pr-3"
                rows={1}
                style={{ maxHeight: '100px'}} // Prevents the input from growing too large
              />
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
              <button onClick={handleFileClick} className="text-gray-400 hover:text-cyan-400 p-2"><FiPaperclip /></button>
              <button onClick={handleVoiceInput} className={`p-2 ${isListening ? 'text-red-500 animate-pulse' : 'text-gray-400 hover:text-cyan-400'}`}><FiMic /></button>
              <button onClick={handleSend} disabled={isProcessing || !input.trim()} className="text-gray-400 hover:text-cyan-400 p-2 disabled:text-gray-600"><FiSend /></button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Joe;
