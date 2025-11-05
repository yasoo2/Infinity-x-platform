import React, { useState, useEffect, useRef } from 'react';
import Draggable from 'react-draggable';
import { ResizableBox } from 'react-resizable';
import { Terminal, Code, Cpu, Globe, Monitor, ChevronDown, ChevronUp, RefreshCw, MousePointer, Maximize2 } from 'lucide-react';
import useBrowserWebSocket from '../hooks/useBrowserWebSocket';
import FullScreenBrowser from './FullScreenBrowser';

const JoeScreen = ({ isProcessing, progress, wsLog, onTakeover, onClose }) => {
  const [isTakeoverActive, setIsTakeoverActive] = useState(false);
  const [activeTab, setActiveTab] = useState('browser'); // 'terminal' or 'browser'
  const [browserUrl, setBrowserUrl] = useState('https://xelitesolutions.com');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const imageRef = useRef(null);

  const {
    screenshot,
    pageInfo,
    isConnected,
    isLoading,
    navigate,
    click,
    type,
    scroll,
    pressKey,
    getScreenshot,
    startStreaming,
    stopStreaming
  } = useBrowserWebSocket();

  useEffect(() => {
    // Update URL from page info
    if (pageInfo.url) {
      setBrowserUrl(pageInfo.url);
    }
  }, [pageInfo]);

  const handleTakeover = () => {
    setIsTakeoverActive(true);
    startStreaming();
    onTakeover();
  };

  const handleRelease = () => {
    setIsTakeoverActive(false);
    stopStreaming();
  };

  const handleNavigate = () => {
    if (browserUrl) {
      navigate(browserUrl);
    }
  };

  const handleImageClick = (e) => {
    if (!isTakeoverActive || !imageRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 1280;
    const y = ((e.clientY - rect.top) / rect.height) * 720;
    
    click(Math.round(x), Math.round(y));
  };

  const handleKeyDown = (e) => {
    if (!isTakeoverActive) return;

    e.preventDefault();
    
    if (e.key === 'Enter') {
      pressKey('Enter');
      setInputText('');
    } else if (e.key === 'Backspace') {
      pressKey('Backspace');
    } else if (e.key === 'Tab') {
      pressKey('Tab');
    } else if (e.key.length === 1) {
      type(e.key);
      setInputText(prev => prev + e.key);
    }
  };

  const handleWheel = (e) => {
    if (!isTakeoverActive) return;
    e.preventDefault();
    scroll(e.deltaY);
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
    if (isProcessing || isLoading) return <Cpu className="w-4 h-4 text-purple-400 animate-pulse" />;
    if (!isConnected) return <Monitor className="w-4 h-4 text-red-400" />;
    return <Terminal className="w-4 h-4 text-blue-400" />;
  };

  const getStatusText = () => {
    if (!isConnected) return 'Disconnected';
    if (isLoading) return 'Loading...';
    if (isProcessing) return `Processing ${progress}%`;
    return 'Ready';
  };

  return (
    <>
      {isFullScreen && (
        <FullScreenBrowser onClose={() => setIsFullScreen(false)} />
      )}
      <Draggable handle=".handle">
        <ResizableBox
        width={700}
        height={isCollapsed ? 50 : 500}
        minConstraints={[500, 50]}
        maxConstraints={[1200, 900]}
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
              <span className="text-xs text-gray-400">{getStatusText()}</span>
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
              </div>

              {/* Content Area */}
              <div className="flex-1 overflow-hidden">
                {activeTab === 'browser' ? (
                  <div className="h-full flex flex-col bg-gray-900">
                    {/* Browser Address Bar */}
                    <div className="flex items-center gap-2 p-2 bg-gray-800 border-b border-gray-700">
                      <Globe className="w-4 h-4 text-purple-400" />
                      <input
                        type="text"
                        value={browserUrl}
                        onChange={(e) => setBrowserUrl(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleNavigate()}
                        className="flex-1 bg-gray-900 text-gray-300 text-xs px-3 py-1.5 rounded border border-gray-700 focus:border-purple-500 focus:outline-none"
                        placeholder="Enter URL..."
                        disabled={!isConnected}
                      />
                      <button
                        onClick={handleNavigate}
                        disabled={!isConnected || isLoading}
                        className="bg-purple-500 hover:bg-purple-600 text-white text-xs px-3 py-1.5 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Go
                      </button>
                      <button
                        onClick={getScreenshot}
                        disabled={!isConnected}
                        className="bg-blue-500 hover:bg-blue-600 text-white text-xs p-1.5 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Refresh Screenshot"
                      >
                        <RefreshCw className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => setIsFullScreen(true)}
                        disabled={!isConnected}
                        className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-xs p-1.5 rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                        title="Open Full Screen Browser"
                      >
                        <Maximize2 className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Browser Content Area - Real Screenshot */}
                    <div className="flex-1 bg-white overflow-auto relative">
                      {screenshot ? (
                        <div className="relative w-full h-full">
                          <img
                            ref={imageRef}
                            src={`data:image/jpeg;base64,${screenshot}`}
                            alt="Browser Screenshot"
                            className="w-full h-full object-contain cursor-pointer"
                            onClick={handleImageClick}
                            onWheel={handleWheel}
                            style={{ pointerEvents: isTakeoverActive ? 'auto' : 'none' }}
                          />
                          {isTakeoverActive && (
                            <div className="absolute top-2 left-2 bg-purple-500/90 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                              <MousePointer className="w-3 h-3" />
                              <span>Control Active</span>
                            </div>
                          )}
                          {isLoading && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              <div className="bg-gray-800 px-4 py-2 rounded-lg flex items-center gap-2">
                                <RefreshCw className="w-4 h-4 text-purple-400 animate-spin" />
                                <span className="text-white text-sm">Loading...</span>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full bg-gray-900">
                          <div className="text-center">
                            <Monitor className="w-12 h-12 mx-auto mb-2 text-gray-600" />
                            <p className="text-gray-400 text-sm">
                              {isConnected ? 'Enter a URL to start browsing' : 'Connecting to browser...'}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Page Info */}
                    {pageInfo.title && (
                      <div className="px-3 py-1.5 bg-gray-800 border-t border-gray-700 text-xs text-gray-400 truncate">
                        <span className="font-medium text-purple-400">Title:</span> {pageInfo.title}
                      </div>
                    )}
                  </div>
                ) : (
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
                )}
              </div>

              {/* Status Bar */}
              <div className="flex items-center justify-between px-3 py-1.5 bg-gray-800/70 border-t border-gray-700/50 text-xs">
                <div className="flex items-center gap-3">
                  <span className="text-gray-400">
                    Status:{' '}
                    <span className={isConnected ? 'text-green-400' : 'text-red-400'}>
                      {isConnected ? (isLoading ? 'Loading' : 'Connected') : 'Disconnected'}
                    </span>
                  </span>
                  {(isProcessing || isLoading) && (
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-300"
                          style={{ width: `${progress || 50}%` }}
                        />
                      </div>
                      <span className="text-purple-400">{progress || 50}%</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={isTakeoverActive ? handleRelease : handleTakeover}
                  disabled={!isConnected}
                  className={`${
                    isTakeoverActive
                      ? 'bg-red-500 hover:bg-red-600'
                      : 'bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600'
                  } text-white text-xs px-3 py-1 rounded transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed`}
                  title={isTakeoverActive ? 'Release Control' : 'Take Control'}
                >
                  {isTakeoverActive ? '🛑 Release' : '🕹️ Take Control'}
                </button>
              </div>
            </>
          )}
        </div>
        </ResizableBox>
      </Draggable>
    </>
  );
};

export default JoeScreen;
