
import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { FiPlus, FiMessageSquare, FiMoreVertical } from 'react-icons/fi';

const SidePanel = ({ conversations, onConversationSelect, onNewConversation, onDeleteAllConversations, currentConversationId, onRenameConversation, onDeleteConversation, onPinToggle, onDuplicate, onClear, lang = 'ar' }) => {
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
  }, [openMenuId, menuRef]);
  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-950 w-full flex-shrink-0 p-3 flex flex-col border border-gray-800 rounded-xl ring-1 ring-yellow-600/10" style={{ gridArea: 'side' }}>
      <div className="flex items-center justify-between mb-4 px-2">
        <h2 className="text-sm font-semibold text-yellow-400 tracking-wider">{lang === 'ar' ? 'المحادثات' : 'Chats'}</h2>
        <div className="flex items-center gap-2">
          <button 
            onClick={onNewConversation}
            className="p-2 text-black bg-yellow-600 hover:bg-yellow-700 rounded-md border border-yellow-600/40"
            title={lang === 'ar' ? 'محادثة جديدة' : 'New Chat'}
          >
            <FiPlus size={20} />
          </button>
          {!!onDeleteAllConversations && (
            <button 
              onClick={() => { if (confirm(lang==='ar'?'حذف جميع المحادثات؟':'Delete all conversations?')) onDeleteAllConversations(); }}
              className="px-2 py-2 text-sm bg-red-600 hover:bg-red-700 rounded-md border border-red-600/40 text-white"
              title={lang === 'ar' ? 'حذف الكل' : 'Delete All'}
            >
              {lang==='ar' ? 'حذف الكل' : 'Delete All'}
            </button>
          )}
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto -mx-2">
        {conversations.map(convo => (
          <div 
            key={convo.id}
            onClick={() => { setOpenMenuId(null); onConversationSelect(convo.id); }}
            className={`relative flex items-center px-4 py-2.5 mx-2 my-1 rounded-lg cursor-pointer transition-colors duration-200 border ${
              currentConversationId === convo.id 
                ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-black border-yellow-600 shadow-md' 
                : 'bg-gray-800/80 text-gray-200 hover:bg-gray-700/80 border-gray-700'
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
              <div ref={menuRef} className="fixed z-40 w-48 bg-gray-900 text-white border border-yellow-600 rounded-lg shadow-2xl" style={{ top: menuPos.top, left: menuPos.left }}>
                <button onClick={(e)=>{ e.stopPropagation(); onPinToggle(convo.id); setOpenMenuId(null); }} className="w-full text-left px-3 py-2 hover:bg-yellow-600 hover:text-black text-sm">{lang === 'ar' ? (convo.pinned ? 'إلغاء التثبيت' : 'تثبيت') : (convo.pinned ? 'Unpin' : 'Pin')}</button>
                <button onClick={(e)=>{ e.stopPropagation(); const t = prompt(lang === 'ar' ? 'إعادة تسمية المحادثة' : 'Rename conversation', convo.title || ''); if (t!=null) onRenameConversation(convo.id, t); setOpenMenuId(null); }} className="w-full text-left px-3 py-2 hover:bg-yellow-600 hover:text:black text-sm">{lang === 'ar' ? 'إعادة تسمية' : 'Rename'}</button>
                <button onClick={(e)=>{ e.stopPropagation(); onDuplicate(convo.id); setOpenMenuId(null); }} className="w-full text-left px-3 py-2 hover:bg-yellow-600 hover:text:black text-sm">{lang === 'ar' ? 'نسخ' : 'Duplicate'}</button>
                <button onClick={(e)=>{ e.stopPropagation(); if (confirm(lang === 'ar' ? 'مسح الرسائل؟' : 'Clear messages?')) onClear(convo.id); setOpenMenuId(null); }} className="w-full text-left px-3 py-2 hover:bg-yellow-600 hover:text:black text-sm">{lang === 'ar' ? 'مسح الرسائل' : 'Clear Messages'}</button>
                <button onClick={(e)=>{ e.stopPropagation(); if (confirm(lang === 'ar' ? 'حذف المحادثة؟' : 'Delete conversation?')) onDeleteConversation(convo.id); setOpenMenuId(null); }} className="w-full text-left px-3 py-2 hover:bg-red-700 text-sm text-red-400">{lang === 'ar' ? 'حذف' : 'Delete'}</button>
              </div>
            )}
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
  onDeleteAllConversations: PropTypes.func,
  currentConversationId: PropTypes.string,
  onRenameConversation: PropTypes.func.isRequired,
  onDeleteConversation: PropTypes.func.isRequired,
  onPinToggle: PropTypes.func.isRequired,
  onDuplicate: PropTypes.func.isRequired,
  onClear: PropTypes.func.isRequired,
  lang: PropTypes.string,
};
