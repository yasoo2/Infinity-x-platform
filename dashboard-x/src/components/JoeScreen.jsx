import React, { useState, useEffect, useRef } from 'react';
import Draggable from 'react-draggable';
import { ResizableBox } from 'react-resizable';
import { Terminal, Cpu, Globe, Monitor, ChevronDown, ChevronUp, RefreshCw, MousePointer, Maximize2, Search, Copy } from 'lucide-react';
import PropTypes from 'prop-types';
import useBrowserWebSocket from '../hooks/useBrowserWebSocket';
import FullScreenBrowser from './FullScreenBrowser';
import SearchPanel from './SearchPanel';
import apiClient from '../api/client';

const JoeScreen = ({ isProcessing, progress, wsLog, onTakeover, onClose }) => {
  const [isTakeoverActive, setIsTakeoverActive] = useState(false);
  const [activeTab, setActiveTab] = useState('browser'); // 'terminal' or 'browser'
  const [browserUrl, setBrowserUrl] = useState('https://www.xelitesolutions.com');
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [boxSize, setBoxSize] = useState({ width: 700, height: 500 });
  const [isLogCollapsed, setIsLogCollapsed] = useState(false);
  const imageRef = useRef(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [showSearchPanel, setShowSearchPanel] = useState(false);

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

  const runSearch = async () => {
    const q = String(searchQuery || '').trim();
    if (!q) return;
    try {
      setSearchLoading(true);
      setSearchError('');
      const { data } = await apiClient.post('/api/v1/web/search', { query: q, images: true });
      if (data?.success) {
        setSearchResults(data.results || []);
        setShowSearchPanel(true);
      } else {
        setSearchError(data?.error || 'فشل البحث');
        setShowSearchPanel(true);
      }
    } catch (e) {
      setSearchError(e?.response?.data?.error || e?.message || 'خطأ غير متوقع');
      setShowSearchPanel(true);
    } finally {
      setSearchLoading(false);
    }
  };

  const openFromSearch = (url) => {
    if (url) {
      setBrowserUrl(url);
      setShowSearchPanel(false);
      navigate(url);
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
    } else if (e.key === 'Backspace') {
      pressKey('Backspace');
    } else if (e.key === 'Tab') {
      pressKey('Tab');
    } else if (e.key.length === 1) {
      type(e.key);
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

  useEffect(() => {
    const computeSize = () => {
      const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
      const vh = typeof window !== 'undefined' ? window.innerHeight : 768;
      const width = Math.min(700, Math.max(320, vw - 32));
      const height = Math.min(500, Math.max(240, vh - 120));
      setBoxSize({ width, height });
    };
    computeSize();
    const onResize = () => computeSize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

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
      <Draggable handle=".handle" bounds="body">
        <ResizableBox
          width={boxSize.width}
          height={isCollapsed ? 50 : boxSize.height}
          minConstraints={[Math.min(500, Math.max(300, (typeof window!=='undefined'?window.innerWidth:800)-120)), 50]}
          maxConstraints={[Math.max(600, (typeof window!=='undefined'?window.innerWidth:800)-40), Math.max(400, (typeof window!=='undefined'?window.innerHeight:600)-120)]}
          className="absolute bottom-4 right-4 z-50"
        >
        <div className="w-full h-full flex flex-col bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-2 border-purple-500/30 rounded-xl shadow-2xl shadow-purple-900/50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-800/90 to-gray-900/90 border-b-2 border-purple-500/30 flex-shrink-0">
            <div className="flex items-center gap-3 handle cursor-move">
              {getStatusIcon()}
              <span className="text-sm font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                JOE&apos;s Computer
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
                className="text-red-500 hover:text-red-400 transition-colors"
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
                  <div className="h-full flex flex-col bg-gray-900" tabIndex={0} onKeyDown={handleKeyDown}>
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
                        className="bg-yellow-600 hover:bg-yellow-700 text-black text-xs px-3 py-1.5 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Go
                      </button>
                      <div className="w-px h-5 bg-gray-700 mx-2" />
                      <Search className="w-4 h-4 text-blue-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && runSearch()}
                        className="w-48 bg-gray-900 text-gray-300 text-xs px-3 py-1.5 rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
                        placeholder="بحث..."
                        disabled={isLoading}
                      />
                      <button
                        onClick={runSearch}
                        disabled={isLoading}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        بحث
                      </button>
                      <button
                        onClick={getScreenshot}
                        disabled={!isConnected}
                        className="bg-yellow-500 hover:bg-yellow-600 text-black text-xs p-1.5 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                      {showSearchPanel && (
                        <SearchPanel
                          results={searchResults}
                          loading={searchLoading}
                          error={searchError}
                          onClose={() => setShowSearchPanel(false)}
                          onOpen={openFromSearch}
                        />
                      )}
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
                  <div className="h-full flex flex-col bg-black/40 backdrop-blur-sm">
                    <div className="flex items-center justify-between px-2 py-1 bg-gray-800/60 border-b border-gray-700/50 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-300">Logs</span>
                        <button
                          onClick={() => {
                            const last = log[log.length - 1];
                            const value = last ? (typeof last === 'string' ? last : (last.text ?? JSON.stringify(last))) : '';
                            try { navigator.clipboard.writeText(String(value)); } catch { /* noop */ }
                          }}
                          className="px-2 py-0.5 rounded border border-gray-700 bg-gray-900 text-gray-200 hover:bg-gray-700 flex items-center gap-1"
                          title="نسخ آخر لوج"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Copy Last</span>
                        </button>
                        <button
                          onClick={() => {
                            const text = (log || []).map((entry) => {
                              if (typeof entry === 'string') return entry;
                              if (entry && typeof entry === 'object') return entry.text || JSON.stringify(entry);
                              return '';
                            }).join('\n');
                            try { navigator.clipboard.writeText(text); } catch { /* noop */ }
                          }}
                          className="px-2 py-0.5 rounded border border-gray-700 bg-gray-900 text-gray-200 hover:bg-gray-700 flex items-center gap-1"
                          title="نسخ جميع اللوجز"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Copy All</span>
                        </button>
                      </div>
                      <button
                        onClick={() => setIsLogCollapsed((v) => !v)}
                        className="text-gray-400 hover:text-white transition-colors"
                        title={isLogCollapsed ? 'Expand' : 'Collapse'}
                      >
                        {isLogCollapsed ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    {isLogCollapsed ? (
                      <div className="px-3 py-2 text-xs text-gray-500">Collapsed</div>
                    ) : (
                      <div className="flex-1 p-3 overflow-y-auto text-xs font-mono relative">
                        {isTakeoverActive && (
                          <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-white text-lg font-bold z-10">
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
                        {log.map((entry, index) => {
                          const isObj = typeof entry === 'object' && entry !== null;
                          const text = isObj ? (entry.text ?? JSON.stringify(entry)) : String(entry);
                          return (
                            <div
                              key={entry.id || index}
                              className={`flex gap-2 mb-1 items-start ${
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
                              <span className="flex-1 break-words">{text}</span>
                              <button
                                onClick={() => { try { navigator.clipboard.writeText(text); } catch { /* noop */ } }}
                                className="ml-auto px-2 py-0.5 rounded border border-gray-700 bg-gray-900 text-gray-200 hover:bg-gray-700 flex items-center gap-1"
                                title="نسخ هذا اللوج"
                              >
                                <Copy className="w-3 h-3" />
                                <span>Copy</span>
                              </button>
                            </div>
                          );
                        })}
                        <div ref={logEndRef} />
                      </div>
                    )}
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

JoeScreen.propTypes = {
  isProcessing: PropTypes.bool.isRequired,
  progress: PropTypes.number.isRequired,
  wsLog: PropTypes.array.isRequired,
  onTakeover: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};
