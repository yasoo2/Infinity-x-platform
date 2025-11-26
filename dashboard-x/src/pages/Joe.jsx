import React, { useState } from 'react';
import { FiMenu, FiX, FiMessageSquare, FiPlus } from 'react-icons/fi';
import MainConsole from '../components/joe/MainConsole';
import { useJoeChat } from '../hooks/useJoeChat';

const Joe = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const { 
    conversations, 
    currentConversation, 
    handleConversationSelect, 
    handleNewConversation,
  } = useJoeChat();

  return (
    <div className="h-screen w-screen flex bg-gray-900 text-white overflow-hidden">
      {/* Sidebar Toggle Button - Fixed Position */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 transition-colors"
        title={isSidebarOpen ? "Close Sidebar" : "Open Sidebar"}
      >
        {isSidebarOpen ? <FiX size={20} /> : <FiMenu size={20} />}
      </button>

      {/* Sidebar - Collapsible */}
      <div
        className={`fixed left-0 top-0 h-full bg-gray-800 border-r border-gray-700 transition-transform duration-300 z-40 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ width: '280px' }}
      >
        <div className="flex flex-col h-full pt-16 px-3">
          {/* New Chat Button */}
          <button
            onClick={handleNewConversation}
            className="flex items-center gap-2 w-full px-4 py-3 mb-4 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors font-medium"
          >
            <FiPlus size={18} />
            New Chat
          </button>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto space-y-2">
            <h3 className="text-xs uppercase text-gray-400 font-semibold mb-2 px-2">Recent Chats</h3>
            {conversations.length === 0 ? (
              <p className="text-sm text-gray-500 px-2">No conversations yet</p>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => handleConversationSelect(conv.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors flex items-center gap-2 ${
                    conv.id === currentConversation
                      ? 'bg-gray-700 text-white'
                      : 'text-gray-300 hover:bg-gray-700/50'
                  }`}
                >
                  <FiMessageSquare size={16} className="flex-shrink-0" />
                  <span className="truncate text-sm">{conv.title || 'New Conversation'}</span>
                </button>
              ))
            )}
          </div>

          {/* Footer Info */}
          <div className="pt-4 pb-4 border-t border-gray-700">
            <p className="text-xs text-gray-500 text-center">Joe AI Assistant</p>
            <p className="text-xs text-gray-600 text-center mt-1">Powered by Infinity-X</p>
          </div>
        </div>
      </div>

      {/* Main Content Area - Full Width */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarOpen ? 'ml-[280px]' : 'ml-0'}`}>
        {/* Top Bar - Minimal */}
        <div className="h-14 border-b border-gray-800 flex items-center px-6 bg-gray-900/50 backdrop-blur-sm">
          <div className="flex-1 flex items-center justify-center">
            <h1 className="text-lg font-semibold text-gray-200">Joe AI Assistant</h1>
          </div>
        </div>

        {/* Main Console - Takes Full Remaining Space */}
        <div className="flex-1 overflow-hidden">
          <MainConsole />
        </div>
      </div>
    </div>
  );
};

export default Joe;
