import React, { useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { FiTerminal, FiCircle, FiChevronDown, FiChevronUp, FiCopy, FiTrash2 } from 'react-icons/fi';

const BottomPanel = ({ logs, collapsed, onToggleCollapse, onAddLogToChat, onAddAllLogs, onClearLogs }) => {
  const [okKey, setOkKey] = React.useState(null);
  const [okKind, setOkKind] = React.useState('success');
  const [autoScroll, setAutoScroll] = React.useState(true);
  const [filter, setFilter] = React.useState('all');
  const [search, setSearch] = React.useState('');
  const [atBottom, setAtBottom] = React.useState(true);
  const okPulse = (key, kind = 'success') => { setOkKey(key); setOkKind(kind); setTimeout(() => { setOkKey(null); setOkKind('success'); }, 800); };
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!collapsed && scrollRef.current && autoScroll) {
      const el = scrollRef.current;
      el.scrollTop = el.scrollHeight;
    }
  }, [logs, collapsed, autoScroll]);

  const onScroll = React.useCallback(() => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    const diff = el.scrollHeight - el.scrollTop - el.clientHeight;
    setAtBottom(diff <= 4);
  }, []);

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

  const getLogBgClass = (type) => {
    switch (type) {
      case 'error': return 'bg-red-600/10 border border-red-600/30 hover:bg-red-600/20';
      case 'success': return 'bg-green-600/10 border border-green-600/30 hover:bg-green-600/20';
      case 'warning': return 'bg-yellow-500/10 border border-yellow-600/30 hover:bg-yellow-500/20';
      case 'info': return 'bg-blue-600/10 border border-blue-600/30 hover:bg-blue-600/20';
      default: return 'bg-gray-800/40 border border-gray-800 hover:bg-gray-800/60';
    }
  };

  const filteredLogs = React.useMemo(() => {
    const arr = Array.isArray(logs) ? logs : [];
    const q = String(search || '').toLowerCase();
    return arr.filter((log) => {
      const text = typeof log === 'string' ? log : (log?.text || JSON.stringify(log));
      if (q && !String(text).toLowerCase().includes(q)) return false;
      const t = getLogType(log);
      return filter === 'all' ? true : t === filter;
    });
  }, [logs, filter, search]);

  const formatTime = (ms) => {
    try { const d = new Date(ms); const hh = String(d.getHours()).padStart(2,'0'); const mm = String(d.getMinutes()).padStart(2,'0'); const ss = String(d.getSeconds()).padStart(2,'0'); return `${hh}:${mm}:${ss}`; } catch { return ''; }
  };
  const getLogTimestamp = (log) => {
    if (log && typeof log === 'object') {
      const v = log.timestamp ?? log.ts ?? log.time ?? log?.metadata?.timestamp;
      if (v) {
        const ms = typeof v === 'number' ? v : Date.parse(String(v));
        if (Number.isFinite(ms)) return formatTime(ms);
      }
    }
    return '';
  };

  return (
    <div className="h-full flex flex-col bg-gray-950 p-5 border border-gray-800 rounded-t-xl">
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
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <div className="text-xs text-gray-400 border border-gray-700 rounded px-2 py-0.5 bg-gray-800/60">
            {filteredLogs.length} / {logs?.length || 0} messages
          </div>
          <div className="hidden md:flex items-center text-[11px] rounded-lg overflow-hidden border border-gray-700">
            <button onClick={()=>setFilter('all')} className={`px-2 py-1 ${filter==='all'?'bg-yellow-600 text-black':'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>الكل</button>
            <button onClick={()=>setFilter('error')} className={`px-2 py-1 ${filter==='error'?'bg-red-600 text-white':'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>أخطاء</button>
            <button onClick={()=>setFilter('warning')} className={`px-2 py-1 ${filter==='warning'?'bg-yellow-500 text-black':'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>تحذيرات</button>
            <button onClick={()=>setFilter('success')} className={`px-2 py-1 ${filter==='success'?'bg-green-600 text:white':'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>نجاح</button>
            <button onClick={()=>setFilter('info')} className={`px-2 py-1 ${filter==='info'?'bg-blue-600 text:white':'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>معلومات</button>
          </div>
          <input
            value={search}
            onChange={(e)=>setSearch(e.target.value)}
            placeholder="بحث في اللوجز..."
            className="px-2 py-1 text-[12px] bg-gray-800 border border-gray-700 rounded-md text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-yellow-500/50"
            style={{ minWidth: 160 }}
          />
          <button
            onClick={() => { setAutoScroll(v=>!v); okPulse('auto','toggle'); }}
            className={`px-2 py-1 rounded border ${autoScroll?'border-green-500/50 bg-green-600 text-black':'border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700'} text-[11px]`}
            title={autoScroll ? 'إيقاف التمرير التلقائي' : 'تشغيل التمرير التلقائي'}
          >
            {autoScroll ? 'Auto Scroll: On' : 'Auto Scroll: Off'}
          </button>
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
            className="px-2 py-1 rounded border border-yellow-600/40 bg-yellow-600 text-black text-[11px] hover:bg-yellow-700"
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
            className="px-2 py-1 rounded border border-yellow-600/40 bg-yellow-600 text-black text-[11px] hover:bg-yellow-700 flex items-center gap-1"
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
          className="joe-logs-scroll flex-1 overflow-y-auto bg-gray-900 rounded-lg border border-gray-800 p-4 font-mono text-sm relative"
          style={{ overscrollBehavior: 'contain', overflowAnchor: 'none' }}
          onScroll={onScroll}
        >
          {filteredLogs && filteredLogs.length > 0 ? (
            <div className="space-y-1.5">
              {filteredLogs.map((log, index) => {
                const type = getLogType(log);
                const color = getLogColor(type);
                const text = typeof log === 'string' ? log : (log?.text || JSON.stringify(log));
                const time = getLogTimestamp(log);
                const bg = getLogBgClass(type);
                return (
                  <div key={log?.id ?? index} className={`flex items-start gap-3 px-2 py-1 rounded transition-colors ${bg}`}>
                    <span className="text-gray-600 text-xs mt-0.5 flex-shrink-0">
                      {String(index + 1).padStart(3, '0')}
                    </span>
                    <span className={`${color} flex-1 leading-relaxed`}>
                      {text}
                    </span>
                    {time ? (<span className="text-[10px] text-gray-500 ml-2 mt-0.5">{time}</span>) : null}
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
                        className="px-2 py-1 rounded border border-yellow-600/40 bg-yellow-600 text-black text-[11px] hover:bg-yellow-700 flex items-center gap-1"
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
          {(!atBottom || !autoScroll) && filteredLogs && filteredLogs.length > 0 && (
            <button
              onClick={() => { setAutoScroll(true); if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; okPulse('toBottom'); }}
              className="absolute bottom-2 right-2 px-2 py-1 rounded-md bg-yellow-600 text-black text-[11px] border border-yellow-500/50 shadow hover:bg-yellow-700"
              title="الانتقال إلى الأسفل"
            >
              إلى الأسفل
            </button>
          )}
          {filteredLogs && filteredLogs.length > 0 && (
            <div className="absolute bottom-2 left-2 px-2 py-1 rounded-md bg-gray-800/70 text-gray-300 text-[10px] border border-gray-700/60 shadow-sm inline-flex items-center gap-2">
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded bg-red-500" />
                <span>خطأ</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded bg-yellow-400" />
                <span>تحذير</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded bg-green-500" />
                <span>نجاح</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded bg-blue-500" />
                <span>معلومات</span>
              </span>
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
