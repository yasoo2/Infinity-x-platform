import React, { useState, useEffect } from 'react';
import { Terminal, Cpu, Maximize2, Minimize2, Pause, Play, Mic, Grid3x3, ChevronDown, ChevronUp } from 'lucide-react';
import PropTypes from 'prop-types';

/**
 * JoeDesktopView - نظام عرض سطح المكتب المتقدم لـ Joe
 * يتضمن:
 * - شاشة سطح مكتب كاملة
 * - شاشة متجمدة (Frozen Screen)
 * - إدخال صوتي
 * - شبكات (Grids)
 * - التحكم الكامل
 */
const JoeDesktopView = ({ isProcessing, progress, wsLog, onVoiceInput }) => {
  const [isFrozen, setIsFrozen] = useState(false);
  const [isGridVisible, setIsGridVisible] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [gridSize] = useState(20);
  const logEndRef = React.useRef(null);
  const [isLogsCollapsed, setIsLogsCollapsed] = useState(true);

  // Scroll to bottom
  const scrollToBottom = () => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [wsLog]);

  // Get status icon
  const getStatusIcon = () => {
    if (isProcessing) return <Cpu className="w-4 h-4 text-fuchsia-400 animate-pulse" />;
    if (isFrozen) return <Pause className="w-4 h-4 text-yellow-400" />;
    return <Terminal className="w-4 h-4 text-cyan-400" />;
  };

  // Handle voice input
  const handleVoiceInput = async () => {
    if (!isListening) {
      setIsListening(true);
      // Trigger voice recognition
      if (onVoiceInput) {
        onVoiceInput();
      }
    } else {
      setIsListening(false);
    }
  };

  // Desktop container classes
  const containerClasses = isFullscreen 
    ? "fixed inset-0 z-50 bg-gray-950" 
    : "w-full h-full bg-gray-900 border border-cyan-500/50 rounded-lg shadow-2xl shadow-cyan-900/50";

  return (
    <div className={`${containerClasses} overflow-hidden flex flex-col`}>
      {/* Header - Control Bar */}
      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-800/70 to-gray-900/70 border-b border-cyan-500/50">
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <span className="text-sm font-bold text-white">جو - سطح المكتب (JOE Desktop)</span>
          {isFrozen && <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded">متجمد</span>}
        </div>

        <div className="flex items-center gap-2">
          {/* Progress indicator */}
          {isProcessing && (
            <div className="flex items-center gap-2">
              <div className="w-24 h-1 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-400 to-fuchsia-400 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs text-cyan-400 font-bold">{progress}%</span>
            </div>
          )}

          {/* Status text */}
          <span className="text-xs text-gray-400 ml-4">
            {isProcessing ? `جاري المعالجة...` : isFrozen ? 'متجمد' : 'جاهز'}
          </span>
          <button
            onClick={() => setIsLogsCollapsed((v) => !v)}
            className="ml-2 p-1.5 rounded bg-gray-700/50 text-gray-300 hover:bg-gray-700 hover:text-white transition"
            title={isLogsCollapsed ? 'إظهار اللوجز' : 'إخفاء اللوجز'}
          >
            {isLogsCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Control buttons */}
        <div className="flex items-center gap-2">
          {/* Freeze button */}
          <button
            onClick={() => setIsFrozen(!isFrozen)}
            className={`p-2 rounded transition-all ${
              isFrozen
                ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700'
            }`}
            title={isFrozen ? 'تحرير الشاشة' : 'تجميد الشاشة'}
          >
            {isFrozen ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>

          {/* Grid toggle */}
          <button
            onClick={() => setIsGridVisible(!isGridVisible)}
            className={`p-2 rounded transition-all ${
              isGridVisible
                ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700'
            }`}
            title="إظهار/إخفاء الشبكة"
          >
            <Grid3x3 className="w-4 h-4" />
          </button>

          {/* Voice input button */}
          <button
            onClick={handleVoiceInput}
            className={`p-2 rounded transition-all ${
              isListening
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 animate-pulse'
                : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700'
            }`}
            title="إدخال صوتي"
          >
            <Mic className="w-4 h-4" />
          </button>

          {/* Fullscreen toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded bg-gray-700/50 text-gray-400 hover:bg-gray-700 transition-all"
            title={isFullscreen ? 'إغلاق ملء الشاشة' : 'ملء الشاشة'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 overflow-hidden relative">
        {/* Grid overlay */}
        {isGridVisible && (
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `
                linear-gradient(0deg, transparent calc(100% - 1px), rgba(0, 255, 255, 0.1) calc(100% - 1px)),
                linear-gradient(90deg, transparent calc(100% - 1px), rgba(0, 255, 255, 0.1) calc(100% - 1px))
              `,
              backgroundSize: `${gridSize}px ${gridSize}px`
            }}
          />
        )}

        {/* Log/Terminal area */}
        {isLogsCollapsed ? (
          <div className="h-8 flex items-center justify-center bg-gray-950/40 text-xxs text-gray-400 relative z-10">
            تم إخفاء اللوجز
          </div>
        ) : (
          <div className="h-full p-4 overflow-y-auto text-xs font-mono bg-gray-950/50 relative z-10">
            {wsLog && wsLog.length > 0 ? (
              wsLog.map((entry, index) => (
                <div 
                  key={entry.id || index} 
                  className={`flex gap-2 mb-1 ${
                    entry.type === 'system' 
                      ? 'text-gray-500' 
                      : entry.type === 'error' 
                      ? 'text-red-400' 
                      : entry.type === 'success'
                      ? 'text-green-400'
                      : 'text-cyan-400'
                  }`}
                >
                  <span className="text-fuchsia-400 flex-shrink-0">
                    [{new Date(entry.id || Date.now()).toLocaleTimeString('ar-SA')}]
                  </span>
                  <span className="flex-1">{entry.text}</span>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 py-8">
                <Terminal className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>جاهز للعمل...</p>
                <p className="text-xs mt-2">استخدم الميكروفون أو اكتب الأوامر</p>
              </div>
            )}
            <div ref={logEndRef} />
          </div>
        )}

        {/* Frozen overlay */}
        {isFrozen && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-20 backdrop-blur-sm">
            <div className="text-center">
              <Pause className="w-12 h-12 text-yellow-400 mx-auto mb-2" />
              <p className="text-yellow-400 font-bold">الشاشة متجمدة</p>
              <p className="text-yellow-400/70 text-sm mt-1">اضغط على زر التشغيل لتحرير الشاشة</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer - Info bar */}
      <div className="flex items-center justify-between p-2 bg-gray-800/70 border-t border-cyan-500/50 text-xs text-gray-400">
        <div className="flex gap-4">
          <span>🤖 Joe AGI System</span>
          <span>📊 Grid: {isGridVisible ? `${gridSize}px` : 'مخفي'}</span>
          <span>🎤 Voice: {isListening ? 'يستمع...' : 'جاهز'}</span>
        </div>
        <span>xElite Solutions © 2025</span>
      </div>
    </div>
  );
};

export default JoeDesktopView;

JoeDesktopView.propTypes = {
  isProcessing: PropTypes.bool.isRequired,
  progress: PropTypes.number.isRequired,
  wsLog: PropTypes.array.isRequired,
  onVoiceInput: PropTypes.func,
};
