import React, { useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { FiTerminal, FiCircle, FiChevronDown, FiChevronUp, FiCopy, FiTrash2 } from 'react-icons/fi';

const BottomPanel = ({ logs, collapsed, onToggleCollapse, onAddLogToChat, onAddAllLogs, onClearLogs }) => {
  const [okKey, setOkKey] = React.useState(null);
  const [okKind, setOkKind] = React.useState('success');
  const okPulse = (key, kind = 'success') => { setOkKey(key); setOkKind(kind); setTimeout(() => { setOkKey(null); setOkKind('success'); }, 800); };
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!collapsed && scrollRef.current) {
      const el = scrollRef.current;
      const atBottom = (el.scrollHeight - el.scrollTop - el.clientHeight) <= 80;
      if (atBottom) el.scrollTop = el.scrollHeight;
    }
  }, [logs, collapsed]);

  const getLogType = (log) => {
    const text = typeof log === 'string' ? log : (log?.text || '');
    if (text.includes('Error') || text.includes('error')) return 'error';
    if (text.includes('established') || text.includes('success')) return 'success';
    if (text.includes('Warning') || text.includes('warning')) return 'warning';
    return typeof log === 'object' ? (log.type || 'info') : 'info';
  };

  const getLogColor = (type) => {
    switch (type) {
      case 'error': return 'text-red-400';
      case 'success': return 'text-green-400';
      case 'warning': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-950/90 backdrop-blur-sm p-5 border border-gray-800 rounded-t-xl shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 border-b border-gray-800 pb-3">
        <div className="flex items-center gap-3">
          <FiTerminal className="text-blue-500" size={20} />
          <h2 className="text-lg font-bold text-white">WebSocket Live Log</h2>
          <div className="flex items-center gap-2 px-3 py-1 bg-gray-800 rounded-full">
            <FiCircle className="text-green-500 animate-pulse" size={8} fill="currentColor" />
            <span className="text-xs text-gray-400">Live</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs text-gray-500 border border-gray-700 rounded px-2 py-0.5">
            {logs?.length || 0} messages
          </div>
          <button
            onClick={() => onClearLogs && onClearLogs()}
            className="px-2 py-1 rounded border border-red-600/40 bg-red-600 text-white text-xs hover:bg-red-700 flex items-center gap-1"
            title="حذف جميع اللوجز"
          >
            <FiTrash2 size={12} /> <span>حذف الكل</span>
          </button>
          <div className="relative inline-flex items-center">
          <button
            onClick={() => { okPulse('addAll'); onAddAllLogs && onAddAllLogs(); }}
            className="px-2 py-1 rounded border border-violet-600/40 bg-violet-600 text-white text-[11px] hover:bg-violet-700"
            title="إضافة كل اللوجز للمحادثة"
          >
            Add All to Chat
          </button>
          {okKey==='addAll' && (<span className={`absolute -top-1 -right-1 text-[10px] px-1 py-0.5 rounded-full ${okKind==='toggle' ? 'bg-yellow-500 border-yellow-400' : 'bg-green-600 border-green-500'} text-black shadow-sm`}>✓</span>)}
          </div>
          <button
            onClick={() => {
              const text = (logs || []).map((log) => {
                if (typeof log === 'string') return log;
                if (log && typeof log === 'object') return log.text || JSON.stringify(log);
                return '';
              }).join('\n');
              try { navigator.clipboard.writeText(text); } catch { /* noop */ }
            }}
            className="px-2 py-1 rounded border border-violet-600/40 bg-violet-600 text-white text-[11px] hover:bg-violet-700 flex items-center gap-1"
            title="نسخ جميع اللوجز"
          >
            <FiCopy size={12} /> <span>نسخ الكل</span>
          </button>
          <div className="relative inline-flex items-center">
          <button
            onClick={() => { okPulse('collapse','toggle'); onToggleCollapse && onToggleCollapse(); }}
            className="p-1.5 rounded border border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white transition"
            title={collapsed ? 'إظهار البانيل' : 'إخفاء البانيل'}
          >
            {collapsed ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
          </button>
          {okKey==='collapse' && (<span className={`absolute -top-1 -right-1 text-[10px] px-1 py-0.5 rounded-full ${okKind==='toggle' ? 'bg-yellow-500 border-yellow-400' : 'bg-green-600 border-green-500'} text-black shadow-sm`}>✓</span>)}
          </div>
        </div>
      </div>

      {/* Log Content */}
      {collapsed ? (
        <div className="hidden" />
      ) : (
        <div 
          ref={scrollRef} 
          className="joe-logs-scroll flex-1 overflow-y-auto bg-gray-900/80 backdrop-blur-sm rounded-lg border border-gray-800 p-4 font-mono text-sm ring-1 ring-white/5"
          style={{ overscrollBehavior: 'contain', overflowAnchor: 'none' }}
        >
          {logs && logs.length > 0 ? (
            <div className="space-y-1.5">
              {logs.map((log, index) => {
                const type = getLogType(log);
                const color = getLogColor(type);
                const text = typeof log === 'string' ? log : (log?.text || JSON.stringify(log));
                return (
                  <div key={log?.id ?? index} className="flex items-start gap-3 hover:bg-gray-800/50 px-2 py-1 rounded transition-colors border border-gray-800">
                    <span className="text-gray-600 text-xs mt-0.5 flex-shrink-0">
                      {String(index + 1).padStart(3, '0')}
                    </span>
                    <span className={`${color} flex-1 leading-relaxed`}>
                      {text}
                    </span>
                    <div className="ml-auto flex items-center gap-1">
                      <div className="relative inline-flex items-center">
                      <button
                        onClick={() => { okPulse('addOne'); onAddLogToChat && onAddLogToChat(log); }}
                        className="px-2 py-1 rounded border border-blue-400/40 bg-blue-600 text-white text-[11px] hover:bg-blue-700"
                        title="Add to chat"
                      >
                        Add to Chat
                      </button>
                      {okKey==='addOne' && (<span className={`absolute -top-1 -right-1 text-[10px] px-1 py-0.5 rounded-full ${okKind==='toggle' ? 'bg-yellow-500 border-yellow-400' : 'bg-green-600 border-green-500'} text-black shadow-sm`}>✓</span>)}
                      </div>
                      <button
                        onClick={() => {
                          const value = typeof log === 'string' ? log : (log?.text || JSON.stringify(log));
                          try { navigator.clipboard.writeText(value); } catch { /* noop */ }
                        }}
                        className="px-2 py-1 rounded border border-violet-600/40 bg-violet-600 text-white text-[11px] hover:bg-violet-700 flex items-center gap-1"
                        title="نسخ هذا اللوج"
                      >
                        <FiCopy size={12} /> <span>نسخ</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <FiTerminal className="mx-auto mb-2" size={32} />
                <p className="text-sm">Awaiting WebSocket connection...</p>
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`
        .joe-logs-scroll { scrollbar-width: thin; scrollbar-color: #444 #0b0f1a; }
        .joe-logs-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
        .joe-logs-scroll::-webkit-scrollbar-track { background: rgba(11,15,26,0.6); border-radius: 8px; }
        .joe-logs-scroll::-webkit-scrollbar-thumb { background: rgba(68,68,68,0.9); border-radius: 8px; border: 2px solid rgba(17,24,39,0.9); }
        .joe-logs-scroll::-webkit-scrollbar-thumb:hover { background: rgba(90,90,90,0.95); }
      `}</style>

      {collapsed && (
        <div className="fixed z-40 select-none pointer-events-none" style={{ bottom: 'calc(var(--joe-input-h, 56px) + env(safe-area-inset-bottom, 0px) + 4px)', left: 'var(--joe-input-left, 16px)', width: 'var(--joe-input-width, 640px)', maxWidth: 'calc(100vw - 32px)' }}>
          <div className="w-full flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-900/80 border border-gray-700 shadow-md backdrop-blur-sm">
            <button
              onClick={() => onToggleCollapse && onToggleCollapse()}
              className="p-1 rounded border border-gray-700 bg-gray-800/80 text-gray-300 hover:bg-gray-700 hover:text-white transition pointer-events-auto"
              title="إظهار اللوجز"
            >
              <FiChevronUp size={16} />
            </button>
            <span className="flex-1 truncate text-[11px] text-gray-300/90">
              {(() => {
                const last = Array.isArray(logs) && logs.length ? logs[logs.length - 1] : '';
                if (typeof last === 'string') return last;
                if (last && typeof last === 'object') return last.text || JSON.stringify(last);
                return '';
              })()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default BottomPanel;

BottomPanel.propTypes = {
  logs: PropTypes.array,
  collapsed: PropTypes.bool,
  onToggleCollapse: PropTypes.func,
  onAddLogToChat: PropTypes.func,
  onAddAllLogs: PropTypes.func,
  onClearLogs: PropTypes.func,
};
