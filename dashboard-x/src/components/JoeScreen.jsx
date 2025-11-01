import React, { useState, useEffect } from 'react';
import { Terminal, Code, Cpu } from 'lucide-react';

const JoeScreen = ({ currentStep, isProcessing, progress }) => {
  const [log, setLog] = useState([]);

  useEffect(() => {
    if (currentStep) {
      setLog(prevLog => {
        // Prevent adding the same step multiple times
        if (prevLog.length > 0 && prevLog[prevLog.length - 1].text === currentStep) {
          return prevLog;
        }
        return [...prevLog, { id: Date.now(), text: currentStep, type: 'info' }];
      });
    }
  }, [currentStep]);

  // Simulate a dynamic log for demonstration
  useEffect(() => {
    if (isProcessing) {
      const interval = setInterval(() => {
        const messages = [
          "Running pre-flight checks...",
          "Establishing secure connection to Render...",
          "Parsing instructions for next action...",
          "Executing code analysis on target file...",
          "Applying xEliteSolutions theme changes...",
          "Compiling new component: JoeScreen.jsx...",
          "Git: Staging changes for commit...",
          "Git: Pushing to remote repository...",
        ];
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        setLog(prevLog => {
          if (prevLog.length > 10) {
            prevLog.shift(); // Keep log size manageable
          }
          return [...prevLog, { id: Date.now() + Math.random(), text: randomMessage, type: 'system' }];
        });
      }, 1500);
      return () => clearInterval(interval);
    }
  }, [isProcessing]);

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
          <span className="text-sm font-bold text-white">JOE's Terminal</span>
        </div>
        <span className="text-xs text-gray-400">{isProcessing ? `Progress: ${progress}%` : 'Idle'}</span>
      </div>

      {/* Log Area */}
      <div className="h-full p-2 overflow-y-auto text-xs font-mono" style={{ height: 'calc(100% - 32px)' }}>
        {log.map((entry) => (
          <div key={entry.id} className={`flex gap-1 ${entry.type === 'system' ? 'text-gray-400' : 'text-cyan-400'}`}>
            <span className="text-fuchsia-400">[{new Date(entry.id).toLocaleTimeString()}]</span>
            <span>{entry.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default JoeScreen;
