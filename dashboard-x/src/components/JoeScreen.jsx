import React, { useState, useEffect } from 'react';
import Draggable from 'react-draggable';
import { ResizableBox } from 'react-resizable';

import { Terminal, Code, Cpu, Globe, Monitor, ChevronDown, ChevronUp } from 'lucide-react';

const JoeScreen = ({ isProcessing, progress, wsLog, onTakeover, onClose }) => {
  const [isTakeoverActive, setIsTakeoverActive] = useState(false);
  const [activeTab, setActiveTab] = useState('terminal'); // 'terminal' or 'browser'
  const [browserUrl, setBrowserUrl] = useState('https://xelitesolutions.com');
  const [isCollapsed, setIsCollapsed] = useState(false);

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

  const getStatusIcon = () => {
    if (isProcessing) return <Cpu className="w-4 h-4 text-purple-400 animate-pulse" />;
    return <Terminal className="w-4 h-4 text-blue-400" />;
  };

  return (
    <Draggable handle=".handle">
      <ResizableBox
        width={600}
        height={isCollapsed ? 50 : 400}
        minConstraints={[400, 50]}
        maxConstraints={[1000, 800]}
        className="absolute bottom-4 right-4 z-50"
      >
        <div className="w-full h-full flex flex-col bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-2 border-purple-500/30 rounded-xl shadow-2xl shadow-purple-900/50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-800/90 to-gray-900/90 border-b-2 border-purple-500/30 flex-shrink-0">
            <div className="flex items-center gap-3 handle cursor-move">
              {getStatusIcon()}
              <span className="text-sm font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                JOE's Computer
              </span>
              <div className="flex items-center gap-1 ml-4 text-gray-400">
                <Monitor className="w-3 h-3" />
                <span className="text-xs">
                  {activeTab === 'terminal' ? 'Terminal' : 'Browser'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">
                {isProcessing ? `${progress}%` : 'Ready'}
              </span>
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="text-gray-400 hover:text-white transition-colors"
                title={isCollapsed ? "Expand" : "Collapse"}
              >
                {isCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-red-500 transition-colors"
                title="Close"
              >
                ×
              </button>
            </div>
          </div>

          {!isCollapsed && (
            <>
              {/* Tab Switcher */}
              <div className="flex bg-gray-800/50 border-b border-gray-700/50">
                <button
                  onClick={() => setActiveTab('terminal')}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-medium transition-all ${
                    activeTab === 'terminal'
                      ? 'bg-gray-900 text-blue-400 border-b-2 border-blue-400'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                  }`}
                >
                  <Terminal className="w-3 h-3" />
                  Terminal
                </button>
                <button
                  onClick={() => setActiveTab('browser')}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-medium transition-all ${
                    activeTab === 'browser'
                      ? 'bg-gray-900 text-purple-400 border-b-2 border-purple-400'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                  }`}
                >
                  <Globe className="w-3 h-3" />
                  Browser
                </button>
              </div>

              {/* Content Area */}
              <div className="flex-1 overflow-hidden">
                {activeTab === 'terminal' ? (
                  <div className="h-full p-3 overflow-y-auto text-xs font-mono bg-black/40 backdrop-blur-sm">
                    {isTakeoverActive && (
                      <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-white text-lg font-bold z-10 backdrop-blur-sm">
                        <div className="text-center">
                          <Monitor className="w-12 h-12 mx-auto mb-2 text-purple-400 animate-pulse" />
                          <p>User Control Active</p>
                          <button
                            onClick={handleRelease}
                            className="mt-4 bg-red-500 hover:bg-red-600 text-white text-sm px-4 py-2 rounded transition-all duration-200"
                          >
                            Release Control
                          </button>
                        </div>
                      </div>
                    )}
                    {log.map((entry, index) => (
                      <div
                        key={entry.id || index}
                        className={`flex gap-2 mb-1 ${
                          entry.type === 'system'
                            ? 'text-gray-400'
                            : entry.type === 'error'
                            ? 'text-red-400'
                            : 'text-blue-300'
                        }`}
                      >
                        <span className="text-purple-400">
                          [{new Date(entry.id || Date.now()).toLocaleTimeString()}]
                        </span>
                        <span>{entry.text}</span>
                      </div>
                    ))}
                    <div ref={logEndRef} />
                  </div>
                ) : (
                  <div className="h-full flex flex-col bg-gray-900">
                    {/* Browser Address Bar */}
                    <div className="flex items-center gap-2 p-2 bg-gray-800 border-b border-gray-700">
                      <Globe className="w-4 h-4 text-purple-400" />
                      <input
                        type="text"
                        value={browserUrl}
                        onChange={(e) => setBrowserUrl(e.target.value)}
                        className="flex-1 bg-gray-900 text-gray-300 text-xs px-3 py-1.5 rounded border border-gray-700 focus:border-purple-500 focus:outline-none"
                        placeholder="Enter URL..."
                      />
                      <button className="bg-purple-500 hover:bg-purple-600 text-white text-xs px-3 py-1.5 rounded transition-colors">
                        Go
                      </button>
                    </div>
                    {/* Browser Content Area */}
                    <div className="flex-1 bg-white overflow-auto">
                      <iframe
                        src={browserUrl}
                        className="w-full h-full border-0"
                        title="JOE Browser"
                        sandbox="allow-same-origin allow-scripts allow-forms"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Status Bar */}
              <div className="flex items-center justify-between px-3 py-1.5 bg-gray-800/70 border-t border-gray-700/50 text-xs">
                <div className="flex items-center gap-3">
                  <span className="text-gray-400">
                    Status: <span className="text-green-400">{isProcessing ? 'Processing' : 'Idle'}</span>
                  </span>
                  {isProcessing && (
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="text-purple-400">{progress}%</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={handleTakeover}
                  className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white text-xs px-3 py-1 rounded transition-all duration-200"
                  title="Take Over Control"
                  disabled={isTakeoverActive}
                >
                  {isTakeoverActive ? '🛑 Active' : '🕹️ Take Control'}
                </button>
              </div>
            </>
          )}
        </div>
      </ResizableBox>
    </Draggable>
  );
};

export default JoeScreen;
