
import React from 'react';
import PropTypes from 'prop-types';
import { FiPlus, FiMessageSquare } from 'react-icons/fi';

const SidePanel = ({ conversations, onConversationSelect, onNewConversation, currentConversationId, lang = 'ar' }) => {
  const lastMessageOf = (convo) => {
    try { return (convo?.messages || []).at(-1) || null; } catch { return null; }
  };
  const snippet = (s, n = 60) => {
    const t = String(s || '').replace(/\s+/g, ' ').trim();
    return t.length > n ? (t.slice(0, n - 1) + '…') : t;
  };
  const timeAgo = (ts) => {
    const t = typeof ts === 'number' ? ts : 0;
    if (!t) return '';
    const diff = Date.now() - t;
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return lang==='ar' ? 'الآن' : 'now';
    const min = Math.floor(sec / 60);
    if (min < 60) return lang==='ar' ? `${min}د` : `${min}m`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return lang==='ar' ? `${hr}س` : `${hr}h`;
    const d = Math.floor(hr / 24);
    return lang==='ar' ? `${d}ي` : `${d}d`;
  };

  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-950 w-full flex-shrink-0 p-3 flex flex-col border border-gray-800 rounded-xl ring-1 ring-yellow-600/10" style={{ gridArea: 'side' }}>
      <div className="flex items-center justify-between mb-4 px-2">
        <h2 className="text-sm font-semibold text-yellow-400 tracking-wider">{lang === 'ar' ? 'جلسات الدردشة' : 'Chat Sessions'}</h2>
        <div className="flex items:center gap-2">
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
            className={`relative px-4 py-2.5 mx-2 my-1 rounded-lg cursor-pointer transition-colors duration-200 border ${
              currentConversationId === convo.id 
                ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-black border-yellow-600 shadow-md' 
                : 'bg-gray-800/80 text-gray-200 hover:bg-gray-700/80 border-gray-700'
            }`}>
            <div className="flex items-center">
              <FiMessageSquare className="mr-3 flex-shrink-0" size={16} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{convo.title || (lang==='ar'?'جلسة جديدة':'New Session')}</div>
                {(() => {
                  const last = lastMessageOf(convo);
                  const t1 = typeof last?.createdAt === 'number' ? last.createdAt : 0;
                  const t2 = typeof convo?.lastModified === 'number' ? convo.lastModified : 0;
                  const ts = Math.max(t1, t2);
                  const text = last ? snippet(last.content) : '';
                  return (
                    <div className={`text-[11px] ${currentConversationId===convo.id ? 'text-black/70' : 'text-gray-400'} truncate`}>{text}</div>
                  );
                })()}
              </div>
              {(() => {
                const last = lastMessageOf(convo);
                const t1 = typeof last?.createdAt === 'number' ? last.createdAt : 0;
                const t2 = typeof convo?.lastModified === 'number' ? convo.lastModified : 0;
                const ts = Math.max(t1, t2);
                const tag = timeAgo(ts);
                return (<span className={`ml-3 text-[11px] ${currentConversationId===convo.id ? 'text-black/60' : 'text-gray-400'}`}>{tag}</span>);
              })()}
            </div>
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
