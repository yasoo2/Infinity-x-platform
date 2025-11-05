import React, { useState, useEffect, useRef } from 'react';
import { X, RefreshCw, ArrowLeft, ArrowRight, Maximize2, Minimize2, Monitor, Cpu, Activity } from 'lucide-react';
import useBrowserWebSocket from '../hooks/useBrowserWebSocket';

const FullScreenBrowser = ({ onClose }) => {
  const [url, setUrl] = useState('https://google.com');
  const [inputUrl, setInputUrl] = useState('https://google.com');
  const canvasRef = useRef(null);
  const [isControlMode, setIsControlMode] = useState(false);
  
  const {
    screenshot,
    pageInfo,
    isConnected,
    navigate,
    click,
    type: typeText,
    scroll,
    pressKey
  } = useBrowserWebSocket();

  // رسم لقطة الشاشة على Canvas
  useEffect(() => {
    if (screenshot && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
      };
      img.src = screenshot;
    }
  }, [screenshot]);

  const handleNavigate = () => {
    navigate(inputUrl);
    setUrl(inputUrl);
  };

  const handleCanvasClick = (e) => {
    if (!isControlMode) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    click(x, y);
  };

  const handleCanvasWheel = (e) => {
    if (!isControlMode) return;
    e.preventDefault();
    scroll(e.deltaY);
  };

  const handleKeyDown = (e) => {
    if (!isControlMode) return;
    
    if (e.key === 'Enter') {
      pressKey('Enter');
    } else if (e.key === 'Backspace') {
      pressKey('Backspace');
    } else if (e.key === 'Tab') {
      e.preventDefault();
      pressKey('Tab');
    } else if (e.key.length === 1) {
      typeText(e.key);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col">
      {/* شريط الأدوات العلوي */}
      <div className="bg-gradient-to-r from-purple-900 via-blue-900 to-purple-900 border-b border-purple-500/30 p-4 flex items-center gap-4 shadow-2xl">
        {/* أزرار التحكم */}
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-all duration-200 hover:scale-110"
            title="Close"
          >
            <X size={20} />
          </button>
          
          <button
            onClick={() => navigate(url)}
            className="p-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 transition-all duration-200 hover:scale-110"
            title="Refresh"
          >
            <RefreshCw size={20} />
          </button>
        </div>

        {/* شريط العناوين */}
        <div className="flex-1 flex items-center gap-2">
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleNavigate()}
            className="flex-1 px-4 py-2 rounded-lg bg-gray-800/50 border border-purple-500/30 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
            placeholder="Enter URL..."
          />
          <button
            onClick={handleNavigate}
            className="px-6 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium transition-all duration-200 hover:scale-105 shadow-lg"
          >
            Go
          </button>
        </div>

        {/* معلومات الحالة */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800/50 border border-purple-500/30">
            <Monitor size={16} className="text-purple-400" />
            <span className="text-sm text-gray-300">{pageInfo?.title || 'Loading...'}</span>
          </div>
          
          <button
            onClick={() => setIsControlMode(!isControlMode)}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:scale-105 shadow-lg ${
              isControlMode
                ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white'
                : 'bg-gray-700/50 hover:bg-gray-700 text-gray-300'
            }`}
          >
            {isControlMode ? '🕹️ Control Active' : '🖱️ Take Control'}
          </button>

          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
            isConnected ? 'bg-green-500/20 border border-green-500/30' : 'bg-red-500/20 border border-red-500/30'
          }`}>
            <Activity size={16} className={isConnected ? 'text-green-400' : 'text-red-400'} />
            <span className={`text-sm ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>

      {/* منطقة عرض المتصفح */}
      <div className="flex-1 overflow-hidden bg-gray-900 flex items-center justify-center p-4">
        <div className="relative w-full h-full rounded-lg overflow-hidden shadow-2xl border border-purple-500/20">
          {screenshot ? (
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              onWheel={handleCanvasWheel}
              onKeyDown={handleKeyDown}
              tabIndex={0}
              className={`w-full h-full object-contain ${
                isControlMode ? 'cursor-crosshair' : 'cursor-default'
              }`}
              style={{ backgroundColor: '#1a1a1a' }}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-gray-400">
              <Monitor size={64} className="text-purple-500 animate-pulse" />
              <p className="text-xl font-medium">Loading browser...</p>
              <p className="text-sm text-gray-500">Please wait while we initialize the browser session</p>
            </div>
          )}
        </div>
      </div>

      {/* شريط المعلومات السفلي */}
      <div className="bg-gradient-to-r from-purple-900 via-blue-900 to-purple-900 border-t border-purple-500/30 p-3 flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-4 text-sm text-gray-300">
          <div className="flex items-center gap-2">
            <Cpu size={14} className="text-purple-400" />
            <span>JOE's Browser</span>
          </div>
          <div className="text-gray-500">|</div>
          <span className="text-gray-400">{pageInfo?.url || url}</span>
        </div>
        
        {isControlMode && (
          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-green-500/20 border border-green-500/30">
            <span className="text-xs text-green-400 font-medium">
              ✨ Control Mode Active - Click, Type, Scroll enabled
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default FullScreenBrowser;
