  import React, { useEffect, useRef, useState, useCallback } from 'react';
  import { Play, Copy, Trash2, Loader2, Wifi, WifiOff, RefreshCcw } from 'lucide-react';

  // افتراض أن هذه الدوال موجودة في ملفات utils/websocket.ts و utils/api.ts
  // ويجب أن تكون متوافقة مع التوقيعات التالية:

  /**
   * يتصل بـ WebSocket.
   * @param {(message: any) => void} onMessage - دالة تُستدعى عند استقبال رسالة.
   * @param {() => void} onOpen - دالة تُستدعى عند فتح الاتصال.
   * @param {() => void} onClose - دالة تُستدعى عند إغلاق الاتصال.
   * @returns {WebSocket | null} مثيل WebSocket المتصل.
   */
  const connectWebSocket = (onMessage, onOpen, onClose) => {
    // يجب عليك تعديل هذا الجزء ليتناسب مع طريقة اتصالك بـ WebSocket
    // مثال:
    const ws = new WebSocket('ws://localhost:8000/ws'); // استبدل بالـ URL الخاص بك
    ws.onopen = onOpen;
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (e) {
        onMessage(event.data); // في حال كانت الرسالة نصًا خامًا
      }
    };
    ws.onclose = onClose;
    ws.onerror = (error) => {
      console.error('WebSocket Error:', error);
      onClose(); // استدعاء onClose عند حدوث خطأ أيضًا
    };
    return ws;
  };

  /**
   * يقطع اتصال WebSocket.
   * @param {WebSocket | null} ws - مثيل WebSocket لقطعه.
   */
  const disconnectWebSocket = (ws) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
  };

  /**
   * يرسل طلب API.
   * @param {string} url - مسار API.
   * @param {RequestInit} options - خيارات طلب Fetch.
   * @returns {Promise<any>} استجابة API.
   */
  const apiRequest = async (url, options) => {
    // يجب عليك تعديل هذا الجزء ليتناسب مع طريقة طلبك لـ API
    // مثال:
    const response = await fetch(url, options);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(errorData.message || 'فشل طلب API');
    }
    return response.json();
  };


  /**
   * لوحة تحكم الوكيل (Agent Panel)
   * @param {{
   *   apiPath?: string,                        // المسار الافتراضي لطلب التنفيذ
   *   defaultCode?: string,                    // كود ابتدائي في المحرر
   *   autoReconnect?: boolean,                 // إعادة اتصال تلقائي للـWS
   *   persistOutput?: boolean,                 // حفظ الإخراج في localStorage
   *   requestHeaders?: Record<string,string>,  // ترويسات إضافية لطلب API
   * }} props
   */
  const AgentPanel = ({
    apiPath = '/joe/chat-advanced',
    defaultCode = '// اكتب تعليماتك أو كودك هنا ثم نفّذ',
    autoReconnect = true,
    persistOutput = true,
    requestHeaders = {},
  }) => {
    const [code, setCode] = useState(defaultCode);
    const [output, setOutput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [wsConnected, setWsConnected] = useState(false);
    const [wsAttempt, setWsAttempt] = useState(0);

    const outputRef = useRef(null);
    const wsRef = useRef(null); // لتخزين مثيل WebSocket

    // استعادة/حفظ الإخراج محلياً
    useEffect(() => {
      if (!persistOutput) return;
      const saved = localStorage.getItem('agent_panel_output');
      if (saved) setOutput(saved);
    }, [persistOutput]);

    useEffect(() => {
      if (!persistOutput) return;
      localStorage.setItem('agent_panel_output', output);
    }, [output, persistOutput]);

    // تمرير تلقائي لأسفل مع كل تحديث
    useEffect(() => {
      const el = outputRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }, [output]);

    // توصيل WebSocket مع إعادة اتصال اختيارية
    const connectWS = useCallback(() => {
      // إغلاق أي اتصال سابق قبل إنشاء اتصال جديد
      disconnectWebSocket(wsRef.current);

      const ws = connectWebSocket(
        (message) => {
          // رسائل WebSocket قد تكون نصًا خامًا أو JSON
          if (typeof message === 'object' && message?.output) {
            setOutput((prev) => (prev ? prev + '\n' : '') + String(message.output));
          } else if (typeof message === 'string') {
            setOutput((prev) => (prev ? prev + '\n' : '') + message);
          }
        },
        () => {
          setWsConnected(true);
          setWsAttempt(0); // إعادة تعيين محاولات الاتصال عند النجاح
          console.log('WebSocket connected');
        },
        () => {
          setWsConnected(false);
          console.log('WebSocket disconnected');
          // إعادة الاتصال التلقائي
          if (autoReconnect) {
            const delay = Math.min(10000, 1000 * (wsAttempt + 1)); // زيادة تدريجية في التأخير
            setTimeout(() => setWsAttempt((n) => n + 1), delay);
          }
        }
      );
      wsRef.current = ws; // تخزين مثيل WebSocket
    }, [autoReconnect, wsAttempt]);

    // إدارة دورة حياة WebSocket
    useEffect(() => {
      connectWS();
      return () => {
        disconnectWebSocket(wsRef.current);
      };
    }, [connectWS]); // إعادة الاتصال عند تغيير connectWS (بسبب wsAttempt)

    // تنفيذ الطلب إلى الـAPI
    const executeCode = async (payload) => {
      setLoading(true);
      setError(null);
      try {
        const result = await apiRequest(apiPath, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...requestHeaders,
          },
          body: JSON.stringify({ code: payload }),
        });
        // في حال API يعيد output لحظياً
        if (result?.output) {
          setOutput((prev) => (prev ? prev + '\n' : '') + String(result.output));
        } else if (!result?.streaming) { // إذا لم يكن هناك بث ولم يكن هناك إخراج فوري
          setOutput((prev) => (prev ? prev + '\n' : '') + 'لا يوجد إخراج مباشر من API');
        }
      } catch (err) {
        const msg = err?.message || 'حدث خطأ أثناء التنفيذ';
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    // اختصار تنفيذ: Ctrl/Cmd + Enter
    useEffect(() => {
      const onKey = (e) => {
        const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
        if ((isMac ? e.metaKey : e.ctrlKey) && e.key === 'Enter') {
          e.preventDefault();
          if (!loading) executeCode(code);
        }
      };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }, [code, loading, executeCode]); // إضافة executeCode للتبعيات

    // إجراءات مساعدة
    const copyToClipboard = async () => {
      try {
        await navigator.clipboard.writeText(output);
      } catch {
        // تجاهل بصمت
      }
    };

    const clearOutput = () => setOutput('');

    return (
      <div className="rounded-lg border border-slate-700 bg-gradient-to-b from-slate-900 to-slate-800 text-slate-100 shadow-lg">
        {/* شريط علوي */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700/60">
          <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${wsConnected ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
            {wsConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
            <span>{wsConnected ? 'متصل' : 'غير متصل'}</span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => executeCode(code)}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/30 disabled:opacity-60"
              title="تنفيذ (Ctrl/⌘ + Enter)"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
              <span>تنفيذ</span>
            </button>

            <button
              type="button"
              onClick={copyToClipboard}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-slate-700 text-slate-200 hover:bg-slate-600 border border-slate-600"
              title="نسخ الإخراج"
            >
              <Copy size={16} />
              <span>نسخ</span>
            </button>

            <button
              type="button"
              onClick={clearOutput}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-slate-700 text-slate-200 hover:bg-slate-600 border border-slate-600"
              title="تفريغ الإخراج"
            >
              <Trash2 size={16} />
              <span>تفريغ</span>
            </button>

            {!wsConnected && (
              <button
                type="button"
                onClick={() => {
                  connectWS(); // إعادة الاتصال مباشرة
                }}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-amber-500/20 text-amber-200 hover:bg-amber-500/30 border border-amber-500/30"
                title="إعادة الاتصال"
              >
                <RefreshCcw size={16} />
                <span>إعادة الاتصال</span>
              </button>
            )}
          </div>
        </div>

        {/* منطقة إدخال الكود */}
        <div className="p-4 space-y-3">
          <label htmlFor="agent-code-input" className="block text-sm text-slate-400">التعليمات/الكود</label>
          <textarea
            id="agent-code-input"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            rows={6}
            dir="auto"
            className="w-full resize-y rounded-md bg-slate-900/60 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/50 p-3 text-sm"
            placeholder="اكتب كوداً أو تعليمات ليقوم الوكيل بتنفيذها..."
          />

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-md border border-red-500/30 bg-red-500/10 text-red-300 text-sm">
              <span className="font-semibold">خطأ:</span>
              <span className="flex-1">{String(error)}</span>
            </div>
          )}
        </div>

        {/* الإخراج */}
        <div className="px-4 pb-4">
          <label className="block text-sm text-slate-400 mb-2">المخرجات</label>
          <div
            ref={outputRef}
            className="h-64 overflow-auto rounded-md bg-slate-950 border border-slate-800 p-3 text-xs font-mono whitespace-pre-wrap leading-relaxed"
          >
            {output ? output : <span className="text-slate-500">لا يوجد إخراج بعد...</span>}
          </div>
        </div>
      </div>
    );
  };

  export default AgentPanel;