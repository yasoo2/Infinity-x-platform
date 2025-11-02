import React, { useState, useEffect } from 'react';
import { Terminal, Code, Cpu } from 'lucide-react';

const JoeScreen = ({ isProcessing, progress, wsLog }) => {
  // Use the real-time log passed from the hook
  const log = wsLog;

  // Scroll to the bottom of the log whenever it updates
  const logEndRef = React.useRef(null);
  const scrollToBottom = () => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [log]);

  // Removed all simulated log logic (useEffect with currentStep and setInterval)

  const getStatusIcon = () => {
    if (isProcessing) return <Cpu className="w-4 h-4 text-fuchsia-400 animate-pulse" />;
    return <Terminal className="w-4 h-4 text-cyan-400" />;
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 h-64 bg-gray-900 border border-cyan-500/50 rounded-lg shadow-2xl shadow-cyan-900/50 overflow-hidden backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-2 bg-gray-800/70 border-b border-cyan-500/50">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="text-sm font-bold text-white">طرفية جو (JOE's Terminal)</span>
        </div>
        <span className="text-xs text-gray-400">{isProcessing ? `التقدم: ${progress}%` : 'جاهز'}</span>
      </div>

      {/* Log Area */}
      <div className="h-full p-2 overflow-y-auto text-xs font-mono" style={{ height: 'calc(100% - 32px)' }}>
        {log.map((entry, index) => (
          <div key={entry.id || index} className={`flex gap-1 ${entry.type === 'system' ? 'text-gray-400' : entry.type === 'error' ? 'text-red-400' : 'text-cyan-400'}`}>
            <span className="text-fuchsia-400">[{new Date(entry.id || Date.now()).toLocaleTimeString()}]</span>
            <span>{entry.text}</span>
          </div>
        ))}
        <div ref={logEndRef} />
      </div>
    </div>
  );
};

export default JoeScreen;
