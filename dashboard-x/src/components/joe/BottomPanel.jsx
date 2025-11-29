import React, { useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { FiTerminal, FiCircle, FiChevronDown, FiChevronUp } from 'react-icons/fi';

const BottomPanel = ({ logs, collapsed, onToggleCollapse, onAddLogToChat, onAddAllLogs }) => {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!collapsed && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
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
    <div className="h-full flex flex-col bg-gray-950 p-5 border border-gray-800 rounded-t-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <FiTerminal className="text-blue-500" size={20} />
          <h2 className="text-lg font-bold text-white">WebSocket Live Log</h2>
          <div className="flex items-center gap-2 px-3 py-1 bg-gray-800 rounded-full">
            <FiCircle className="text-green-500 animate-pulse" size={8} fill="currentColor" />
            <span className="text-xs text-gray-400">Live</span>
          </div>
        </div>
          <div className="flex items-center gap-3">
            <div className="text-xs text-gray-500">
              {logs?.length || 0} messages
            </div>
            <button
              onClick={() => onAddAllLogs && onAddAllLogs()}
              className="px-2 py-1 rounded bg-yellow-600 text-black text-xs hover:bg-yellow-700"
              title="Add all to chat"
            >
              Add All to Chat
            </button>
            <button
              onClick={() => onToggleCollapse && onToggleCollapse()}
              className="p-1.5 rounded bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white transition"
              title={collapsed ? 'إظهار البانيل' : 'إخفاء البانيل'}
            >
              {collapsed ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
            </button>
          </div>
      </div>

      {/* Log Content */}
      {collapsed ? (
        <div className="hidden" />
      ) : (
        <div 
          ref={scrollRef} 
          className="flex-1 overflow-y-auto bg-gray-900 rounded-lg border border-gray-800 p-4 font-mono text-sm"
        >
          {logs && logs.length > 0 ? (
            <div className="space-y-1.5">
              {logs.map((log, index) => {
                const type = getLogType(log);
                const color = getLogColor(type);
                const text = typeof log === 'string' ? log : (log?.text || JSON.stringify(log));
                return (
                  <div key={index} className="flex items-start gap-3 hover:bg-gray-800/50 px-2 py-1 rounded transition-colors">
                    <span className="text-gray-600 text-xs mt-0.5 flex-shrink-0">
                      {String(index + 1).padStart(3, '0')}
                    </span>
                    <span className={`${color} flex-1 leading-relaxed`}>
                      {text}
                    </span>
                    <button
                      onClick={() => onAddLogToChat && onAddLogToChat(log)}
                      className="ml-auto px-2 py-1 rounded bg-blue-600 text-white text-[10px] hover:bg-blue-700"
                      title="Add to chat"
                    >
                      Add to Chat
                    </button>
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

      {collapsed && (
        <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 select-none pointer-events-none">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-950/90 border border-gray-800 shadow-lg">
            <button
              onClick={() => onToggleCollapse && onToggleCollapse()}
              className="p-1 rounded bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white transition pointer-events-auto"
              title="إظهار اللوجز"
            >
              <FiChevronUp size={16} />
            </button>
            <span className="max-w-[60vw] md:max-w-[40vw] lg:max-w-[30vw] truncate text-xs text-gray-300">
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
};
