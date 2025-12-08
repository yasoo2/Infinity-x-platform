import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Cpu, Globe, Monitor, ChevronDown, ChevronUp, RefreshCw, MousePointer, Search, Copy } from 'lucide-react';
import PropTypes from 'prop-types';
import useBrowserWebSocket from '../hooks/useBrowserWebSocket';
import SearchPanel from './SearchPanel';
import apiClient from '../api/client';

const JoeScreen = ({ isProcessing, progress, wsLog, onTakeover, onClose, initialUrl, initialSearchQuery, autoOpenOnSearch, embedded = false }) => {
  const [isTakeoverActive, setIsTakeoverActive] = useState(false);
  const [activeTab, setActiveTab] = useState('browser'); // 'terminal' or 'browser'
  const [browserUrl, setBrowserUrl] = useState('https://www.xelitesolutions.com');
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const [boxSize, setBoxSize] = useState({ width: 700, height: 500 });
  const [sizeMode, setSizeMode] = useState('medium');
  const [isLogCollapsed, setIsLogCollapsed] = useState(true);
  const imageRef = useRef(null);
  // mini preview removed in embedded-only rebuild
  const [activity, setActivity] = useState([]);
  const addActivity = (text, type = 'info') => {
    try { setActivity((prev) => [...prev, { id: Date.now(), type, text }]); } catch { /* noop */ }
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const [autoOpenFirstResult, setAutoOpenFirstResult] = useState(false);

  const {
    screenshot,
    pageInfo,
    isConnected,
    isLoading,
    pageText,
    serpResults,
    navigate,
    click,
    type,
    scroll,
    pressKey,
    getScreenshot,
    getPageText,
    extractSerp,
    startStreaming,
    stopStreaming
  } = useBrowserWebSocket();

  const navigateAndLog = (url) => { addActivity(`Navigate: ${url}`, 'action'); navigate(url); };

  useEffect(() => {
    // Update URL from page info
    if (pageInfo.url) {
      setBrowserUrl(pageInfo.url);
      // mini preview removed in embedded rebuild
      addActivity(`Page loaded: ${pageInfo.title || ''} | ${pageInfo.url}`, 'success');
    }
  }, [pageInfo]);

  const handleTakeover = () => {
    setIsTakeoverActive(true);
    startStreaming();
    onTakeover();
    addActivity('Take Control enabled', 'system');
  };

  const handleRelease = () => {
    setIsTakeoverActive(false);
    stopStreaming();
    addActivity('Control released', 'system');
  };

  const handleEndTask = () => {
    try { stopStreaming(); } catch { /* noop */ }
    try { setIsTakeoverActive(false); } catch { /* noop */ }
    try {
      const summary = (() => {
        const navs = activity.filter(a => /Navigate:/i.test(a.text)).length;
        const clicks = activity.filter(a => /^Click/i.test(a.text)).length;
        const keys = activity.filter(a => /^Key|^Type/i.test(a.text)).length;
        const scrolls = activity.filter(a => /^Scroll/i.test(a.text)).length;
        const lastPage = pageInfo?.url || browserUrl;
        return `تقرير مهمة المتصفح (جزئي):\n- تنقلات: ${navs}\n- نقرات: ${clicks}\n- مفاتيح/كتابة: ${keys}\n- تمرير: ${scrolls}\n- الصفحة الأخيرة: ${lastPage || 'غير معروف'}`;
      })();
      window.dispatchEvent(new CustomEvent('joe:browser-summary', { detail: { entries: activity, summary } }));
      window.dispatchEvent(new Event('joe:end-browser-task'));
    } catch { /* noop */ }
    onClose();
  };

  const handleNavigate = () => {
    if (browserUrl) {
      navigateAndLog(browserUrl);
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
        addActivity(`Search query: ${q} (${(data.results || []).length} results)`, 'action');
        try {
          const results = data.results || [];
          if (autoOpenFirstResult && results.length > 0) {
            setAutoOpenFirstResult(false);
            setShowSearchPanel(false);
            const first = results[0];
            if (first?.url) {
              setBrowserUrl(first.url);
              navigateAndLog(first.url);
            }
          }
        } catch { /* noop */ }
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
      navigateAndLog(url);
    }
  };

  const handleImageClick = (e) => {
    if (!isTakeoverActive || !imageRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 1280;
    const y = ((e.clientY - rect.top) / rect.height) * 720;
    
    click(Math.round(x), Math.round(y));
    addActivity(`Click at (${Math.round(x)}, ${Math.round(y)})`, 'action');
  };

  const handleKeyDown = (e) => {
    if (!isTakeoverActive) return;

    e.preventDefault();
    
    if (e.key === 'Enter') {
      pressKey('Enter');
      addActivity('Key: Enter', 'action');
    } else if (e.key === 'Backspace') {
      pressKey('Backspace');
      addActivity('Key: Backspace', 'action');
    } else if (e.key === 'Tab') {
      pressKey('Tab');
      addActivity('Key: Tab', 'action');
    } else if (e.key.length === 1) {
      type(e.key);
      addActivity(`Type: ${e.key}`, 'action');
    }
  };

  const handleWheel = (e) => {
    if (!isTakeoverActive) return;
    e.preventDefault();
    scroll(e.deltaY);
    addActivity(`Scroll: ${Math.round(e.deltaY)}`, 'action');
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
      let width = 700;
      let height = 500;
      if (sizeMode === 'small') {
        width = Math.min(420, Math.max(300, vw - 24));
        height = Math.min(320, Math.max(220, vh - 160));
      } else if (sizeMode === 'large') {
        width = Math.min(1000, Math.max(700, vw - 40));
        height = Math.min(720, Math.max(520, vh - 160));
      } else {
        width = Math.min(720, Math.max(360, vw - 32));
        height = Math.min(520, Math.max(260, vh - 140));
      }
      setBoxSize({ width, height });
    };
    computeSize();
    const onResize = () => computeSize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [sizeMode]);

  useEffect(() => {
    if (isConnected && browserUrl && !screenshot) {
      startStreaming();
      navigateAndLog(browserUrl);
    }
  }, [isConnected]);

  useEffect(() => {
    const u = String(initialUrl || '').trim();
    if (u) {
      setBrowserUrl(u);
      navigateAndLog(u);
    }
  }, [initialUrl]);

  useEffect(() => {
    const q = String(initialSearchQuery || '').trim();
    if (q) {
      setSearchQuery(q);
      setAutoOpenFirstResult(Boolean(autoOpenOnSearch));
      try { navigateAndLog(`https://www.google.com/search?q=${encodeURIComponent(q)}`); } catch { /* noop */ }
      runSearch();
    }
  }, [initialSearchQuery]);

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
      {/* Fullscreen and mini preview removed in embedded-only rebuild */}
      <div
        className={embedded ? 'relative z-50 w-full h-full' : 'absolute bottom-4 right-4 z-50'}
        style={embedded ? undefined : { width: boxSize.width, height: isCollapsed ? 50 : boxSize.height }}
      >
        <div className={embedded ? 'w-full h-full flex flex-col bg-gray-900 border border-gray-800 rounded-xl overflow-hidden' : 'w-full h-full flex flex-col bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-2 border-purple-500/30 rounded-xl shadow-2xl shadow-purple-900/50 overflow-hidden'}>
          {/* Header */}
          <div className={embedded ? 'flex items-center justify-between p-2 bg-gray-800 border-b border-gray-700 flex-shrink-0' : 'flex items-center justify-between p-3 bg-gradient-to-r from-gray-800/90 to-gray-900/90 border-b-2 border-purple-500/30 flex-shrink-0'}>
            <div className="flex items-center gap-3 handle cursor-move">
              {getStatusIcon()}
              {!embedded && (
                <span className="text-sm font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                  JOE&apos;s Computer
                </span>
              )}
              <div className="flex items-center gap-1 ml-4 text-gray-400">
                <Monitor className="w-3 h-3" />
                <span className="text-xs">
                  {activeTab === 'terminal' ? 'Terminal' : 'Browser'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">{getStatusText()}</span>
              <div className="flex items-center gap-1">
              {!embedded && (
                <>
                  <button
                    onClick={() => setSizeMode('small')}
                    className={`px-1.5 py-0.5 text-[10px] rounded ${sizeMode==='small'?'bg-gray-700 text-white border border-purple-500/50':'bg-gray-800 text-gray-400 border border-gray-700'}`}
                    title="حجم صغير"
                  >S</button>
                  <button
                    onClick={() => setSizeMode('medium')}
                    className={`px-1.5 py-0.5 text-[10px] rounded ${sizeMode==='medium'?'bg-gray-700 text-white border border-purple-500/50':'bg-gray-800 text-gray-400 border border-gray-700'}`}
                    title="حجم متوسط"
                  >M</button>
                  <button
                    onClick={() => setSizeMode('large')}
                    className={`px-1.5 py-0.5 text-[10px] rounded ${sizeMode==='large'?'bg-gray-700 text-white border border-purple-500/50':'bg-gray-800 text-gray-400 border border-gray-700'}`}
                    title="حجم كبير"
                  >L</button>
                </>
              )}
              </div>
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="text-gray-400 hover:text-white transition-colors"
                title={isCollapsed ? "Expand" : "Collapse"}
              >
                  {isCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              <button
                onClick={handleEndTask}
                className="px-2 py-1 text-xs rounded-md bg-green-600 hover:bg-green-500 text-white border border-green-700"
                title="إنهاء المهمة"
              >
                إنهاء المهمة
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
                        className={`${sizeMode==='small'?'w-40':'flex-1'} bg-gray-900 text-gray-300 text-xs px-3 py-1.5 rounded border border-gray-700 focus:border-purple-500 focus:outline-none`}
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
                        className={`${sizeMode==='small'?'w-28':(sizeMode==='large'?'w-64':'w-48')} bg-gray-900 text-gray-300 text-xs px-3 py-1.5 rounded border border-gray-700 focus:border-blue-500 focus:outline-none`}
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
                      {/* Fullscreen trigger removed in embedded-only rebuild */}
                      <div className="w-px h-5 bg-gray-700 mx-2" />
                      <button
                        onClick={() => extractSerp(searchQuery)}
                        disabled={!isConnected || isLoading}
                        className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-3 py-1.5 rounded disabled:opacity-50"
                        title="قراءة نتائج جوجل"
                      >
                        قراءة النتائج
                      </button>
                      <button
                        onClick={getPageText}
                        disabled={!isConnected || isLoading}
                        className="bg-gray-700 hover:bg-gray-600 text-white text-xs px-3 py-1.5 rounded disabled:opacity-50"
                        title="قراءة نص الصفحة"
                      >
                        نص الصفحة
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
                          {isTakeoverActive && !embedded && (
                            <div className="absolute top-2 left-2 bg-purple-500/90 text-white text-xs px-2 py-1 rounded flex items-center gap-1 pointer-events-none">
                              <MousePointer className="w-3 h-3" />
                              <span>Control Active</span>
                            </div>
                          )}
                          {isLoading && (
                            embedded ? (
                              <div className="absolute top-2 right-2 bg-gray-800/90 text-white text-xs px-2 py-1 rounded flex items-center gap-1 pointer-events-none">
                                <RefreshCw className="w-3 h-3 text-purple-400 animate-spin" />
                                <span>Loading...</span>
                              </div>
                            ) : (
                              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                <div className="bg-gray-800 px-4 py-2 rounded-lg flex items-center gap-2">
                                  <RefreshCw className="w-4 h-4 text-purple-400 animate-spin" />
                                  <span className="text-white text-sm">Loading...</span>
                                </div>
                              </div>
                            )
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
                    {(serpResults && serpResults.length > 0) && (
                      <div className="px-3 py-2 bg-gray-900 border-t border-gray-700 text-xs text-gray-200">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-blue-300">نتائج مقروءة</span>
                          <button
                            onClick={() => { try { window.dispatchEvent(new CustomEvent('joe:browser-data', { detail: { serpResults } })); } catch { /* noop */ } }}
                            className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white"
                          >
                            إرسال إلى جو
                          </button>
                        </div>
                        <div className="space-y-1 max-h-40 overflow-auto">
                          {serpResults.slice(0,10).map((r, i) => (
                            <div key={r.url || i} className="flex items-start gap-2">
                              <span className="text-gray-500">{i+1}.</span>
                              <div className="flex-1">
                                <div className="text-white truncate">{r.title}</div>
                                <div className="text-gray-400 truncate">{r.url}</div>
                                {r.snippet && (<div className="text-gray-500 line-clamp-2">{r.snippet}</div>)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {(pageText && pageText.length > 0) && (
                      <div className="px-3 py-2 bg-gray-900 border-t border-gray-700 text-xs text-gray-200">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-purple-300">نص مقروء</span>
                          <button
                            onClick={() => { try { window.dispatchEvent(new CustomEvent('joe:browser-data', { detail: { pageText } })); } catch { /* noop */ } }}
                            className="px-2 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white"
                          >
                            إرسال إلى جو
                          </button>
                        </div>
                        <div className="text-gray-300 whitespace-pre-wrap break-words max-h-40 overflow-auto">
                          {pageText.slice(0, 1200)}
                          {pageText.length > 1200 && '…'}
                        </div>
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
              {!embedded && (
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
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default JoeScreen;

JoeScreen.propTypes = {
  isProcessing: PropTypes.bool.isRequired,
  progress: PropTypes.number.isRequired,
  wsLog: PropTypes.array.isRequired,
  onTakeover: PropTypes.func,
  onClose: PropTypes.func.isRequired,
  initialUrl: PropTypes.string,
  initialSearchQuery: PropTypes.string,
  autoOpenOnSearch: PropTypes.bool,
  embedded: PropTypes.bool
};
