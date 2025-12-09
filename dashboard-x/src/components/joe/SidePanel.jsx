
import React from 'react';
import PropTypes from 'prop-types';
import { FiPlus, FiMessageSquare, FiPin, FiMoreVertical } from 'react-icons/fi';

const SidePanel = ({ conversations, onConversationSelect, onNewConversation, currentConversationId, onRenameConversation, onDeleteConversation, onPinToggle, onDuplicate, onClear, lang = 'ar' }) => {
  const [openMenuId, setOpenMenuId] = React.useState(null);
  const [menuPos, setMenuPos] = React.useState({ top: 0, left: 0 });
  const menuRef = React.useRef(null);
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

  const activityTs = (convo) => {
    const last = lastMessageOf(convo);
    const t1 = typeof last?.createdAt === 'number' ? last.createdAt : 0;
    const t2 = typeof convo?.lastModified === 'number' ? convo.lastModified : 0;
    return Math.max(t1, t2);
  };
  const lastViewedKey = (id) => `joe:lastViewed:${id}`;
  const getLastViewed = (id) => {
    try { const v = localStorage.getItem(lastViewedKey(id)); return v ? Number(v) : 0; } catch { return 0; }
  };
  const setLastViewed = (id, ts) => { try { localStorage.setItem(lastViewedKey(id), String(ts)); } catch { void 0; } };
  React.useEffect(() => {
    try {
      conversations.forEach((c) => {
        const k = lastViewedKey(c.id);
        const exists = localStorage.getItem(k) != null;
        if (!exists) {
          const init = activityTs(c) || Date.now();
          localStorage.setItem(k, String(init));
        }
      });
    } catch { void 0; }
  }, [conversations]);
  const unreadCount = (convo) => {
    try {
      if (currentConversationId === convo.id) return 0;
      const lv = getLastViewed(convo.id);
      return (convo.messages || []).filter((m) => m.type === 'joe' && typeof m.createdAt === 'number' && m.createdAt > lv).length;
    } catch { return 0; }
  };
  const sorted = [...conversations].sort((a, b) => {
    const p = Number(!!b.pinned) - Number(!!a.pinned);
    if (p !== 0) return p;
    return (activityTs(b) || 0) - (activityTs(a) || 0);
  });

  const exportConversation = (convo, format = 'json') => {
    try {
      const baseName = String(convo?.title || 'conversation').replace(/[^\p{L}\p{N}\s-_]+/gu, '').trim() || 'conversation';
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      let blob;
      let filename;
      if (format === 'md') {
        const lines = [];
        lines.push(`# ${convo?.title || (lang==='ar'?'جلسة':'Session')}`);
        lines.push('');
        (convo?.messages || []).forEach((m) => {
          const who = m.type === 'user' ? (lang==='ar'?'المستخدم':'User') : 'Joe';
          const time = typeof m.createdAt === 'number' ? new Date(m.createdAt).toLocaleString() : '';
          lines.push(`**${who}** ${time ? `(${time})` : ''}`);
          lines.push('');
          lines.push(String(m.content || ''));
          lines.push('');
          lines.push('---');
          lines.push('');
        });
        const md = lines.join('\n');
        blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
        filename = `${baseName}-${ts}.md`;
      } else {
        const payload = {
          id: convo?.id,
          title: convo?.title,
          lastModified: convo?.lastModified,
          messages: (convo?.messages || []).map((m) => ({ type: m.type, content: m.content, createdAt: m.createdAt })),
        };
        blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
        filename = `${baseName}-${ts}.json`;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { try { document.body.removeChild(a); URL.revokeObjectURL(url); } catch { /* ignore */ } }, 0);
    } catch { /* noop */ }
  };

  const toggleMenu = (e, id) => {
    e.stopPropagation();
    if (openMenuId === id) { setOpenMenuId(null); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    const width = 176;
    const top = rect.bottom + window.scrollY + 6;
    let left = rect.right + window.scrollX - width;
    left = Math.max(8, left);
    setMenuPos({ top, left });
    setOpenMenuId(id);
  };

  React.useEffect(() => {
    const onDocClick = (ev) => {
      if (!openMenuId) return;
      if (menuRef.current && !menuRef.current.contains(ev.target)) setOpenMenuId(null);
    };
    document.addEventListener('mousedown', onDocClick, true);
    return () => document.removeEventListener('mousedown', onDocClick, true);
  }, [openMenuId]);

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
        {sorted.map(convo => (
          <div 
            key={convo.id}
            onClick={() => { setLastViewed(convo.id, Date.now()); onConversationSelect(convo.id); }}
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
              <div className="ml-3 flex items-center gap-2">
                {convo.pinned && (<FiPin className={`${currentConversationId===convo.id ? 'text-black/70' : 'text-yellow-400'}`} size={12} />)}
                {(() => {
                  const last = lastMessageOf(convo);
                  const t1 = typeof last?.createdAt === 'number' ? last.createdAt : 0;
                  const t2 = typeof convo?.lastModified === 'number' ? convo.lastModified : 0;
                  const ts = Math.max(t1, t2);
                  const tag = timeAgo(ts);
                  return (<span className={`text-[11px] ${currentConversationId===convo.id ? 'text-black/60' : 'text-gray-400'}`}>{tag}</span>);
                })()}
              {(() => {
                const n = unreadCount(convo);
                if (n <= 0) return null;
                return (
                  <span className={`min-w-[18px] h-[18px] inline-flex items-center justify-center rounded-full text-[10px] px-1 ${currentConversationId===convo.id ? 'bg-black/20 text-black' : 'bg-yellow-600 text-black'}`}>{n}</span>
                );
              })()}
              <button
                onClick={(e) => toggleMenu(e, convo.id)}
                className={`p-1 rounded-md ${currentConversationId===convo.id ? 'hover:bg-black/20 text-black' : 'hover:bg-gray-700 text-gray-300'}`}
                title={lang==='ar'?'خيارات':'Options'}
              >
                <FiMoreVertical size={14} />
              </button>
            </div>
            {openMenuId === convo.id && (
              <div ref={menuRef} className="fixed z-40 w-44 bg-gray-900 text-white border border-yellow-600 rounded-lg shadow-2xl" style={{ top: menuPos.top, left: menuPos.left }} onClick={(e)=>e.stopPropagation()}>
                <button onClick={(e)=>{ e.stopPropagation(); onPinToggle(convo.id); setOpenMenuId(null); }} className="w-full text-right px-3 py-2 hover:bg-yellow-600 hover:text-black text-sm">{lang === 'ar' ? (convo.pinned ? 'إلغاء التثبيت' : 'تثبيت') : (convo.pinned ? 'Unpin' : 'Pin')}</button>
                <button onClick={(e)=>{ e.stopPropagation(); const t = prompt(lang === 'ar' ? 'إعادة تسمية الجلسة' : 'Rename session', convo.title || ''); if (t!=null) onRenameConversation(convo.id, t); setOpenMenuId(null); }} className="w-full text-right px-3 py-2 hover:bg-yellow-600 hover:text-black text-sm">{lang === 'ar' ? 'إعادة تسمية' : 'Rename'}</button>
                <button onClick={(e)=>{ e.stopPropagation(); onDuplicate(convo.id); setOpenMenuId(null); }} className="w-full text-right px-3 py-2 hover:bg-yellow-600 hover:text-black text-sm">{lang === 'ar' ? 'نسخ' : 'Duplicate'}</button>
                <div className="border-t border-yellow-600/20 my-1" />
                <button onClick={(e)=>{ e.stopPropagation(); exportConversation(convo, 'json'); setOpenMenuId(null); }} className="w-full text-right px-3 py-2 hover:bg-gray-700 text-sm">{lang === 'ar' ? 'تصدير (JSON)' : 'Export (JSON)'}</button>
                <button onClick={(e)=>{ e.stopPropagation(); exportConversation(convo, 'md'); setOpenMenuId(null); }} className="w-full text-right px-3 py-2 hover:bg.gray-700 text-sm">{lang === 'ar' ? 'تصدير (Markdown)' : 'Export (Markdown)'}</button>
                <button onClick={(e)=>{ e.stopPropagation(); if (confirm(lang === 'ar' ? 'مسح الرسائل؟' : 'Clear messages?')) onClear(convo.id); setOpenMenuId(null); }} className="w-full text-right px-3 py-2 hover:bg-yellow-600 hover:text-black text-sm">{lang === 'ar' ? 'مسح الرسائل' : 'Clear Messages'}</button>
                <button onClick={(e)=>{ e.stopPropagation(); if (confirm(lang === 'ar' ? 'حذف الجلسة؟' : 'Delete session?')) onDeleteConversation(convo.id); setOpenMenuId(null); }} className="w-full text-right px-3 py-2 hover:bg-red-700 text-sm text-red-300">{lang === 'ar' ? 'حذف' : 'Delete'}</button>
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
  currentConversationId: PropTypes.string,
  onRenameConversation: PropTypes.func.isRequired,
  onDeleteConversation: PropTypes.func.isRequired,
  onPinToggle: PropTypes.func.isRequired,
  onDuplicate: PropTypes.func.isRequired,
  onClear: PropTypes.func.isRequired,
  lang: PropTypes.string,
};
