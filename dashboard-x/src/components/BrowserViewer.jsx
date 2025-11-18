  import React, { useState, useEffect, useRef, useCallback } from 'react';
  import apiClient from '../api/client'; // تأكد من أن هذا المسار صحيح
  import { Loader2, X, MousePointer2, Keyboard, Globe } from 'lucide-react'; // أيقونات جميلة

  const API_BASE = import.meta.env.VITE_API_BASE || 'https://admin.xelitesolutions.com';

  /**
   * عارض المتصفح التفاعلي الذي يتيح للمستخدم التحكم الكامل.
   * يتطلب بنية خلفية قوية (مثل Node.js + Puppeteer/Playwright + WebSockets).
   * @param {{
   *   sessionId: string, // معرف الجلسة للمتصفح الذي يتم عرضه
   *   onClose: () => void, // دالة تُستدعى عند إغلاق العارض
   *   language: 'ar' | 'en' // لتغيير اللغة
   * }} props
   */
  export default function BrowserViewer({ sessionId, onClose, language = 'ar' }) {
    const [screenshot, setScreenshot] = useState<string | null>(null);
    const [url, setUrl] = useState('');
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [isUserControlled, setIsUserControlled] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const browserScreenRef = useRef<HTMLDivElement | null>(null);

    // النصوص المترجمة
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

    const t = texts[language]; // النصوص الحالية بناءً على اللغة المختارة

    // دالة لإرسال الأحداث إلى الخادم (عبر WebSocket أو API)
    const sendBrowserEvent = useCallback(async (eventType: string, payload: any) => {
      if (!sessionId || !isUserControlled) return;

      // في تطبيق حقيقي، ستستخدم WebSockets هنا لتحقيق تفاعل فوري
      // For this example, we'll use HTTP POST for simplicity, but WebSockets are preferred for real-time
      try {
        await apiClient.post(`${API_BASE}/api/browser/event`, {
          sessionId,
          eventType,
          payload,
        });
      } catch (err: any) {
        console.error(`Failed to send browser event (${eventType}):`, err);
        setError(`${t.errorPrefix}: ${err.response?.data?.message || err.message || 'Unknown error'}`);
      }
    }, [sessionId, isUserControlled, t.errorPrefix]);

    // جلب لقطة الشاشة بشكل دوري
    const fetchScreenshot = useCallback(async () => {
      if (!sessionId) return;
      try {
        const response = await apiClient.post(`${API_BASE}/api/browser/screenshot`, {
          sessionId
        });

        if (response.data.ok) {
          setScreenshot(response.data.screenshot);
          setUrl(response.data.url);
          // افتراض أن موضع الماوس يتم إرجاعه من الخادم
          setMousePos(response.data.mousePosition || { x: 0, y: 0 });
          setError(null);
        } else {
          setError(response.data.message || t.failedFetchScreenshot);
        }
      } catch (err) {
        console.error('BrowserViewer: Screenshot fetch error:', err);
        setError(`${t.errorPrefix}: ${t.failedFetchScreenshot}`);
      }
    }, [sessionId, t.errorPrefix, t.failedFetchScreenshot]);

    useEffect(() => {
      fetchScreenshot(); // جلب فوري عند التحميل
      intervalRef.current = setInterval(fetchScreenshot, 200); // تحديث سريع جداً

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }, [fetchScreenshot]);

    // رسم مؤشر الماوس على الـ canvas
    useEffect(() => {
      if (!canvasRef.current || !screenshot) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        const parent = browserScreenRef.current;
        if (!parent) return;

        // حساب الأبعاد للحفاظ على نسبة العرض إلى الارتفاع
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

        // رسم مؤشر الماوس (دائرة حمراء)
        if (ctx) {
          const scaleX = newWidth / img.width;
          const scaleY = newHeight / img.height;

          ctx.fillStyle = 'rgba(255, 0, 0, 0.7)'; // أحمر شفاف
          ctx.strokeStyle = 'white';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(mousePos.x * scaleX, mousePos.y * scaleY, 8, 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();
        }
      };

      img.src = screenshot;
    }, [screenshot, mousePos]);

    const toggleControl = useCallback(async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiClient.post(`${API_BASE}/api/browser/toggle-control`, {
          sessionId,
          userControlled: !isUserControlled
        });

        if (response.data.ok) {
          setIsUserControlled(response.data.isUserControlled);
        } else {
          setError(response.data.message || t.failedToggleControl);
        }
      } catch (err) {
        console.error('BrowserViewer: Toggle control error:', err);
        setError(`${t.errorPrefix}: ${t.failedToggleControl}`);
      } finally {
        setIsLoading(false);
      }
    }, [sessionId, isUserControlled, t.errorPrefix, t.failedToggleControl]);

    const handleClose = useCallback(async () => {
      setError(null);
      try {
        await apiClient.post(`${API_BASE}/api/browser/close`, { sessionId });
      } catch (err) {
        console.error('BrowserViewer: Close error:', err);
        setError(`${t.errorPrefix}: ${t.failedCloseSession}`);
      }
      onClose();
    }, [sessionId, onClose, t.errorPrefix, t.failedCloseSession]);

    // معالجة أحداث الماوس
    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isUserControlled || !canvasRef.current || !screenshot) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const img = new Image();
      img.src = screenshot;

      const scaleX = img.width / rect.width;
      const scaleY = img.height / rect.height;

      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      setMousePos({ x, y }); // تحديث موضع الماوس محليًا لتغذية بصرية فورية
      sendBrowserEvent('mousemove', { x, y });
    }, [isUserControlled, sendBrowserEvent, screenshot]);

    const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isUserControlled || !canvasRef.current || !screenshot) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const img = new Image();
      img.src = screenshot;

      const scaleX = img.width / rect.width;
      const scaleY = img.height / rect.height;

      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      sendBrowserEvent('click', { x, y, button: e.button });
    }, [isUserControlled, sendBrowserEvent, screenshot]);

    const handleScroll = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
      if (!isUserControlled) return;
      sendBrowserEvent('scroll', { deltaY: e.deltaY });
    }, [isUserControlled, sendBrowserEvent]);

    // معالجة أحداث لوحة المفاتيح
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
      if (!isUserControlled) return;
      sendBrowserEvent('keydown', { key: e.key, code: e.code, ctrlKey: e.ctrlKey, shiftKey: e.shiftKey, altKey: e.altKey, metaKey: e.metaKey });
      e.preventDefault(); // منع سلوك المتصفح الافتراضي لبعض المفاتيح
    }, [isUserControlled, sendBrowserEvent]);

    // إضافة وإزالة مستمعي الأحداث
    useEffect(() => {
      const canvas = canvasRef.current;
      if (canvas && isUserControlled) {
        canvas.addEventListener('mousemove', handleMouseMove as EventListener);
        canvas.addEventListener('click', handleClick as EventListener);
        canvas.addEventListener('wheel', handleScroll as EventListener);
        window.addEventListener('keydown', handleKeyDown as EventListener);
      }

      return () => {
        if (canvas) {
          canvas.removeEventListener('mousemove', handleMouseMove as EventListener);
          canvas.removeEventListener('click', handleClick as EventListener);
          canvas.removeEventListener('wheel', handleScroll as EventListener);
        }
        window.removeEventListener('keydown', handleKeyDown as EventListener);
      };
    }, [isUserControlled, handleMouseMove, handleClick, handleScroll, handleKeyDown]);


    return (
      <div className={`fixed inset-0 bg-gray-900/95 z-50 flex flex-col font-sans text-white ${language === 'ar' ? 'rtl' : 'ltr'}`}>
        {/* Header */}
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
              disabled={isLoading}
              className={`
                px-5 py-2 rounded-full font-semibold transition-all duration-300 flex items-center gap-2
                ${isUserControlled
                  ? 'bg-green-600 hover:bg-green-700 text-white shadow-md'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
                }
                ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}
              `}
            >
              {isLoading && <Loader2 className="h-5 w-5 animate-spin" />}
              {isUserControlled ? t.youControl : t.joeControls}
            </button>

            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-white text-3xl px-2 leading-none transition-colors duration-200"
              title={t.closeViewer}
            >
              <X className="w-7 h-7" />
            </button>
          </div>
        </div>

        {/* Browser Screen */}
        <div ref={browserScreenRef} className="flex-1 overflow-hidden bg-gray-900 p-6 flex items-center justify-center relative">
          {error && (
            <div className={`absolute top-6 ${language === 'ar' ? 'left-1/2 -translate-x-1/2' : 'right-6'} bg-red-600 text-white px-5 py-3 rounded-lg shadow-xl z-10 animate-fade-in text-lg font-medium`}>
              {error}
            </div>
          )}

          {screenshot ? (
            <div className="relative max-w-full max-h-full flex items-center justify-center">
              <canvas
                ref={canvasRef}
                className={`border-2 border-gray-700 rounded-xl shadow-2xl transition-all duration-100 ${isUserControlled ? 'cursor-none' : 'cursor-default'}`}
                style={{ maxWidth: '100%', maxHeight: '100%' }}
                tabIndex={isUserControlled ? 0 : -1}
              />

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

        {/* Info Bar */}
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