import React, { useRef, useEffect } from 'react';
import { FiTerminal, FiCircle } from 'react-icons/fi';

const BottomPanel = ({ logs }) => {
  const scrollRef = useRef(null);

  useEffect(() => {
    // Auto-scroll to bottom when new logs arrive
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const getLogType = (log) => {
    if (log.includes('Error') || log.includes('error')) return 'error';
    if (log.includes('established') || log.includes('success')) return 'success';
    if (log.includes('Warning') || log.includes('warning')) return 'warning';
    return 'info';
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
    <div className="h-full flex flex-col bg-gray-950 p-5">
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
        <div className="text-xs text-gray-500">
          {logs?.length || 0} messages
        </div>
      </div>

      {/* Log Content */}
      <div 
        ref={scrollRef} 
        className="flex-1 overflow-y-auto bg-gray-900 rounded-lg border border-gray-800 p-4 font-mono text-sm"
      >
        {logs && logs.length > 0 ? (
          <div className="space-y-1.5">
            {logs.map((log, index) => {
              const type = getLogType(log);
              const color = getLogColor(type);
              return (
                <div key={index} className="flex items-start gap-3 hover:bg-gray-800/50 px-2 py-1 rounded transition-colors">
                  <span className="text-gray-600 text-xs mt-0.5 flex-shrink-0">
                    {String(index + 1).padStart(3, '0')}
                  </span>
                  <span className={`${color} flex-1 leading-relaxed`}>
                    {log}
                  </span>
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
    </div>
  );
};

export default BottomPanel;
