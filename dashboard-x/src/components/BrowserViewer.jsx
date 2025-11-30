import React, { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Loader2, X, MousePointer2, Keyboard, Globe } from 'lucide-react';
import useBrowserWebSocket from '../hooks/useBrowserWebSocket';

/**
 * Interactive browser viewer that allows full user control.
 * Requires a robust backend (e.g., Node.js + Puppeteer/Playwright + WebSockets).
 * @param {{
 *   sessionId: string, // ID of the browser session to display
 *   onClose: () => void, // Function to call when the viewer is closed
 *   language: 'ar' | 'en' // To change the language
 * }} props
 */
export default function BrowserViewer({ sessionId: _sessionId, onClose, language = 'ar' }) {
  const {
    screenshot,
    pageInfo,
    isConnected,
    
    click,
    type,
    scroll,
    pressKey,
    getScreenshot,
    startStreaming,
    stopStreaming
  } = useBrowserWebSocket();

  const [url, setUrl] = useState('');
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isUserControlled, setIsUserControlled] = useState(false);
  const [error, setError] = useState(null);
  const canvasRef = useRef(null);
  const browserScreenRef = useRef(null);

  const texts = {
    ar: {
      title: "متصفح تفاعلي",
      loading: "جاري تحميل المتصفح...",
      loadingWait: "يرجى الانتظار.",
      youControl: "أنت تتحكم",
      joeControls: "JOE يتحكم",
      toggleControl: "تبديل التحكم",
      closeViewer: "إغلاق العارض",
      live: "مباشر",
      mouse: "الماوس",
      errorPrefix: "خطأ",
      failedFetchScreenshot: "فشل جلب لقطة الشاشة.",
      failedToggleControl: "فشل تبديل التحكم.",
      failedCloseSession: "فشل إغلاق جلسة المتصفح على الخادم.",
      instructionYouControl: "💡 أنت تتحكم: انقر، اكتب، وتصفح كالمعتاد!",
      instructionJoeControl: "💡 اضغط على 'أنت تتحكم' لأخذ السيطرة على المتصفح.",
      notAuthorized: "غير مصرح به أو الجلسة غير موجودة.",
      failedProcessEvent: "فشل معالجة الحدث.",
      sessionNotFound: "الجلسة غير موجودة.",
    },
    en: {
      title: "Interactive Browser",
      loading: "Loading browser...",
      loadingWait: "Please wait.",
      youControl: "You Control",
      joeControls: "JOE Controls",
      toggleControl: "Toggle Control",
      closeViewer: "Close Viewer",
      live: "Live",
      mouse: "Mouse",
      errorPrefix: "Error",
      failedFetchScreenshot: "Failed to fetch screenshot.",
      failedToggleControl: "Failed to toggle control.",
      failedCloseSession: "Failed to close browser session on server.",
      instructionYouControl: "💡 You are in control: Click, type, and browse as usual!",
      instructionJoeControl: "💡 Click 'You Control' to take over the browser.",
      notAuthorized: "Not authorized or session not found.",
      failedProcessEvent: "Failed to process event.",
      sessionNotFound: "Session not found.",
    }
  };

  const t = texts[language];

  useEffect(() => {
    startStreaming();
    getScreenshot();
    return () => {
      stopStreaming();
    };
  }, [startStreaming, stopStreaming, getScreenshot]);

  useEffect(() => {
    if (pageInfo?.url) {
      setUrl(pageInfo.url);
    }
  }, [pageInfo?.url]);

  useEffect(() => {
    if (!canvasRef.current || !screenshot) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      const parent = browserScreenRef.current;
      if (!parent) return;
      const aspectRatio = img.width / img.height;
      let newWidth = parent.clientWidth;
      let newHeight = newWidth / aspectRatio;
      if (newHeight > parent.clientHeight) {
        newHeight = parent.clientHeight;
        newWidth = newHeight * aspectRatio;
      }
      canvas.width = newWidth;
      canvas.height = newHeight;
      ctx?.drawImage(img, 0, 0, newWidth, newHeight);
      if (ctx) {
        const scaleX = newWidth / img.width;
        const scaleY = newHeight / img.height;
        ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(mousePos.x * scaleX, mousePos.y * scaleY, 8, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
      }
    };
    img.src = `data:image/jpeg;base64,${screenshot}`;
  }, [screenshot, mousePos]);

  const toggleControl = useCallback(() => {
    setError(null);
    setIsUserControlled(v => !v);
  }, []);

  const handleClose = useCallback(() => {
    setError(null);
    stopStreaming();
    onClose();
  }, [stopStreaming, onClose]);

  const handleMouseMove = useCallback((e) => {
    if (!isUserControlled || !canvasRef.current || !screenshot) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const img = new Image();
    img.src = `data:image/jpeg;base64,${screenshot}`;
    const scaleX = img.width / rect.width;
    const scaleY = img.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    setMousePos({ x, y });
  }, [isUserControlled, screenshot]);

  const handleClick = useCallback((e) => {
    if (!isUserControlled || !canvasRef.current || !screenshot) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const img = new Image();
    img.src = `data:image/jpeg;base64,${screenshot}`;
    const scaleX = img.width / rect.width;
    const scaleY = img.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    if (isUserControlled) {
      click(x, y);
    }
  }, [isUserControlled, click, screenshot]);

  const handleScroll = useCallback((e) => {
    if (!isUserControlled) return;
    scroll(e.deltaY);
  }, [isUserControlled, scroll]);

  const handleKeyDown = useCallback((e) => {
    if (!isUserControlled) return;
    e.preventDefault();
    if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
      type(e.key);
    } else {
      pressKey(e.key);
    }
  }, [isUserControlled, type, pressKey]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && isUserControlled) {
      canvas.addEventListener('mousemove', handleMouseMove);
      canvas.addEventListener('click', handleClick);
      canvas.addEventListener('wheel', handleScroll);
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      if (canvas) {
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.removeEventListener('click', handleClick);
        canvas.removeEventListener('wheel', handleScroll);
      }
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isUserControlled, handleMouseMove, handleClick, handleScroll, handleKeyDown]);

  return (
    <div className={`fixed inset-0 bg-gray-900/95 z-50 flex flex-col font-sans text-white ${language === 'ar' ? 'rtl' : 'ltr'}`}>
      <div className="bg-gray-800 border-b border-gray-700 p-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-4">
          <h3 className="text-2xl font-extrabold text-teal-400 flex items-center gap-2">
            <Globe className="w-6 h-6" /> {t.title}
          </h3>
          <div className="text-sm text-gray-400 truncate max-w-md">
            {url || t.loading}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleControl}
            disabled={!isConnected}
            className={`px-5 py-2 rounded-full font-semibold transition-all duration-300 flex items-center gap-2 ${isUserControlled ? 'bg-green-600 hover:bg-green-700 text-white shadow-md' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'} ${!isConnected ? 'opacity-70 cursor-not-allowed' : ''}`}>
            <MousePointer2 className="h-5 w-5" />
            {isUserControlled ? t.youControl : t.joeControls}
          </button>
          <button onClick={handleClose} className="text-red-500 hover:text-red-400 text-3xl px-2 leading-none transition-colors duration-200" title={t.closeViewer}>
            <X className="w-7 h-7" />
          </button>
        </div>
      </div>
      <div ref={browserScreenRef} className="flex-1 overflow-hidden bg-gray-900 p-6 flex items-center justify-center relative">
        {error && (
          <div className={`absolute top-6 ${language === 'ar' ? 'left-1/2 -translate-x-1/2' : 'right-6'} bg-red-600 text-white px-5 py-3 rounded-lg shadow-xl z-10 animate-fade-in text-lg font-medium`}>
            {error}
          </div>
        )}
        {screenshot ? (
          <div className="relative max-w-full max-h-full flex items-center justify-center">
            <canvas ref={canvasRef} className={`border-2 border-gray-700 rounded-xl shadow-2xl transition-all duration-100 ${isUserControlled ? 'cursor-none' : 'cursor-default'}`} style={{ maxWidth: '100%', maxHeight: '100%' }} tabIndex={isUserControlled ? 0 : -1} />
            {isUserControlled && (
              <div className={`absolute top-6 ${language === 'ar' ? 'right-6' : 'left-6'} bg-green-500 text-white px-5 py-2 rounded-lg font-bold shadow-lg animate-pulse z-10 flex items-center gap-2`}>
                <MousePointer2 className="w-5 h-5" /> {t.youControl}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-gray-400">
            <Loader2 className="text-teal-400 w-16 h-16 mb-4 animate-spin" />
            <p className="text-xl font-medium">{t.loading}</p>
            <p className="text-md">{t.loadingWait}</p>
          </div>
        )}
      </div>
      <div className="bg-gray-800 border-t border-gray-700 p-4 flex items-center justify-between text-sm text-gray-400 shadow-inner">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span>{t.live}</span>
          </div>
          <div>
            {t.mouse}: ({Math.round(mousePos.x)}, {Math.round(mousePos.y)})
          </div>
        </div>
        <div className="flex items-center gap-2 text-base font-medium text-gray-300">
          {isUserControlled
            ? <><Keyboard className="w-5 h-5" /> {t.instructionYouControl}</>
            : <><MousePointer2 className="w-5 h-5" /> {t.instructionJoeControl}</>
          }
        </div>
      </div>
    </div>
  );
}

BrowserViewer.propTypes = {
  sessionId: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
  language: PropTypes.oneOf(['ar', 'en']),
};
