
import React, { useEffect, useRef, useState } from 'react';
import { FiPlus, FiMessageSquare, FiEdit2, FiTrash2, FiMoreVertical } from 'react-icons/fi';

const SidePanel = ({ conversations, onConversationSelect, onNewConversation, currentConversationId, onRenameConversation, onDeleteConversation, onPinToggle, onDuplicate, onClear }) => {
  const [openMenuId, setOpenMenuId] = useState(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const menuRef = useRef(null);
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

  useEffect(() => {
    const onDocClick = (ev) => {
      if (!openMenuId) return;
      if (menuRef.current && !menuRef.current.contains(ev.target)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', onDocClick, true);
    return () => document.removeEventListener('mousedown', onDocClick, true);
  }, [openMenuId]);
  return (
    <div className="bg-gray-900 w-full flex-shrink-0 p-3 flex flex-col" style={{ gridArea: 'side' }}>
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
            onClick={() => { setOpenMenuId(null); onConversationSelect(convo.id); }}
            className={`relative flex items-center px-4 py-2.5 mx-2 my-1 rounded-md cursor-pointer transition-colors duration-200 ${
              currentConversationId === convo.id 
                ? 'bg-indigo-600 text-white' 
                : 'text-gray-300 hover:bg-gray-700/50'
            }`}>
            <FiMessageSquare className="mr-3 flex-shrink-0" size={16} />
            <span className="text-sm font-medium truncate flex-1">{convo.title || 'New Conversation'}</span>
            <button
              onClick={(e) => { e.stopPropagation(); toggleMenu(e, convo.id); }}
              className="p-2 rounded-md hover:bg-gray-700 text-gray-300"
              title="Options"
            >
              <FiMoreVertical size={16} />
            </button>
            {openMenuId === convo.id && (
              <div ref={menuRef} className="fixed z-40 w-44 bg-gray-800 border border-gray-700 rounded-md shadow-lg" style={{ top: menuPos.top, left: menuPos.left }}>
                <button onClick={(e)=>{ e.stopPropagation(); onPinToggle(convo.id); setOpenMenuId(null); }} className="w-full text-left px-3 py-2 hover:bg-gray-700 text-sm">{convo.pinned ? 'Unpin' : 'Pin'}</button>
                <button onClick={(e)=>{ e.stopPropagation(); const t = prompt('Rename conversation', convo.title || ''); if (t!=null) onRenameConversation(convo.id, t); setOpenMenuId(null); }} className="w-full text-left px-3 py-2 hover:bg-gray-700 text-sm">Rename</button>
                <button onClick={(e)=>{ e.stopPropagation(); onDuplicate(convo.id); setOpenMenuId(null); }} className="w-full text-left px-3 py-2 hover:bg-gray-700 text-sm">Duplicate</button>
                <button onClick={(e)=>{ e.stopPropagation(); if (confirm('Clear messages?')) onClear(convo.id); setOpenMenuId(null); }} className="w-full text-left px-3 py-2 hover:bg-gray-700 text-sm">Clear Messages</button>
                <button onClick={(e)=>{ e.stopPropagation(); if (confirm('Delete conversation?')) onDeleteConversation(convo.id); setOpenMenuId(null); }} className="w-full text-left px-3 py-2 hover:bg-gray-700 text-sm text-red-400">Delete</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SidePanel;
