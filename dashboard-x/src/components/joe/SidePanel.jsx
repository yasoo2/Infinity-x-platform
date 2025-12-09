
import React from 'react';
import PropTypes from 'prop-types';
import { FiPlus, FiMessageSquare } from 'react-icons/fi';

const SidePanel = ({ conversations, onConversationSelect, onNewConversation, currentConversationId, lang = 'ar' }) => {
  const toggleMenu = (e, id) => {
    if (openMenuId === id) {
      setOpenMenuId(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const width = 176; // approximate menu width
    const top = rect.bottom + window.scrollY + 6;
    let left = rect.right + window.scrollX - width;
    left = Math.max(8, left);
    setMenuPos({ top, left });
    setOpenMenuId(id);
  };

  
  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-950 w-full flex-shrink-0 p-3 flex flex-col border border-gray-800 rounded-xl ring-1 ring-yellow-600/10" style={{ gridArea: 'side' }}>
      <div className="flex items-center justify-between mb-4 px-2">
        <h2 className="text-sm font-semibold text-yellow-400 tracking-wider">{lang === 'ar' ? 'جلسات الدردشة' : 'Chat Sessions'}</h2>
        <div className="flex items-center gap-2">
          <button 
            onClick={onNewConversation}
            className="p-2 text-black bg-yellow-600 hover:bg-yellow-700 rounded-md border border-yellow-600/40"
            title={lang === 'ar' ? 'جلسة جديدة' : 'New Session'}
          >
            <FiPlus size={20} />
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto -mx-2">
        {conversations.map(convo => (
          <div 
            key={convo.id}
            onClick={() => { onConversationSelect(convo.id); }}
            className={`relative flex items-center px-4 py-2.5 mx-2 my-1 rounded-lg cursor-pointer transition-colors duration-200 border ${
              currentConversationId === convo.id 
                ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-black border-yellow-600 shadow-md' 
                : 'bg-gray-800/80 text-gray-200 hover:bg-gray-700/80 border-gray-700'
            }`}>
            <FiMessageSquare className="mr-3 flex-shrink-0" size={16} />
            <span className="text-sm font-medium truncate flex-1">{convo.title || (lang==='ar'?'جلسة جديدة':'New Session')}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SidePanel;

SidePanel.propTypes = {
  conversations: PropTypes.array.isRequired,
  onConversationSelect: PropTypes.func.isRequired,
  onNewConversation: PropTypes.func.isRequired,
  currentConversationId: PropTypes.string,
  lang: PropTypes.string,
};
