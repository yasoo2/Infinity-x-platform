import React, { useState, useEffect } from 'react';
import { Terminal, Code, Cpu } from 'lucide-react';

const JoeScreen = ({ isProcessing, progress, wsLog, onTakeover }) => {
  const [isTakeoverActive, setIsTakeoverActive] = useState(false);

  const handleTakeover = () => {
    setIsTakeoverActive(true);
    onTakeover();
  };

  const handleRelease = () => {
    setIsTakeoverActive(false);
  };
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
    <div className="w-full h-full flex flex-col bg-gray-900 border border-cyan-500/50 rounded-lg shadow-2xl shadow-cyan-900/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-2 bg-gray-800/70 border-b border-cyan-500/50 flex-shrink-0">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="text-sm font-bold text-white">شاشة جو (JOE's Screen)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{isProcessing ? `التقدم: ${progress}%` : 'جاهز'}</span>
          {isTakeoverActive ? (
            <button
              onClick={handleRelease}
              className="bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-1 rounded transition-all duration-200"
              title="Release Control"
            >
              🛑 تحرير
            </button>
          ) : (
            <button
              onClick={handleTakeover}
              className="bg-fuchsia-500 hover:bg-fuchsia-600 text-white text-xs px-2 py-1 rounded transition-all duration-200"
              title="Take Over Control"
            >
              🕹️ تحكم
            </button>
          )}
        </div>
      </div>

      {/* Log Area */}
      <div className="flex-1 p-2 overflow-y-auto text-xs font-mono bg-gray-950/90 relative">
        {isTakeoverActive && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-lg font-bold">
            التحكم للمستخدم (User Control)
          </div>
        )}
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
