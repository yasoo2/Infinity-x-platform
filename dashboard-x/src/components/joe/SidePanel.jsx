
import React from 'react';
import { FiPlus, FiMessageSquare } from 'react-icons/fi';

const SidePanel = ({ conversations, onConversationSelect, onNewConversation, currentConversationId }) => {
  return (
    <div className="bg-gray-900 w-72 flex-shrink-0 p-3 flex flex-col" style={{ gridArea: 'side' }}>
      <div className="flex items-center justify-between mb-4 px-2">
        <h2 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">Chats</h2>
        <button 
          onClick={onNewConversation}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-md"
          title="New Chat"
        >
          <FiPlus size={20} />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto -mx-2">
        {conversations.map(convo => (
          <div 
            key={convo.id}
            onClick={() => onConversationSelect(convo.id)}
            className={`flex items-center px-4 py-2.5 mx-2 my-1 rounded-md cursor-pointer transition-colors duration-200 ${
              currentConversationId === convo.id 
                ? 'bg-indigo-600 text-white' 
                : 'text-gray-300 hover:bg-gray-700/50'
            }`}>
            <FiMessageSquare className="mr-3 flex-shrink-0" size={16} />
            <span className="text-sm font-medium truncate">{convo.title || 'New Conversation'}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SidePanel;
