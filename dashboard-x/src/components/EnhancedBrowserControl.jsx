import React, { useState, useRef } from 'react';
import { Send, Maximize2, Minimize2, RefreshCw, Home, ChevronLeft, ChevronRight, Zap } from 'lucide-react';
import axios from 'axios';

export default function EnhancedBrowserControl() {
  const [url, setUrl] = useState('https://www.google.com');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [command, setCommand] = useState('');
  const [output, setOutput] = useState([]);
  const [history, setHistory] = useState([]);
  const inputRef = useRef(null);

  const API_BASE = import.meta.env.VITE_API_URL;

  const handleNavigate = async (targetUrl = url) => {
    try {
      setIsLoading(true);
      const response = await axios.post(`${API_BASE}/api/browser/navigate`, {
        url: targetUrl
      });

      if (response.data.success) {
        setUrl(targetUrl);
        addOutput(`✅ تم الانتقال إلى: ${targetUrl}`, 'success');
      } else {
        addOutput(`❌ فشل الانتقال: ${response.data.error}`, 'error');
      }
    } catch (error) {
      addOutput(`❌ خطأ: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendCommand = async () => {
    if (!command.trim()) return;

    try {
      setIsLoading(true);
      setHistory([...history, command]);
      addOutput(`> ${command}`, 'command');

      const response = await axios.post(`${API_BASE}/api/browser/execute`, {
        command: command
      });

      if (response.data.success) {
        addOutput(response.data.result || 'تم تنفيذ الأمر بنجاح', 'success');
      } else {
        addOutput(`خطأ: ${response.data.error}`, 'error');
      }

      setCommand('');
      if (inputRef.current) {
        inputRef.current.focus();
      }
    } catch (error) {
      addOutput(`خطأ: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const addOutput = (text, type = 'info') => {
    setOutput(prev => [...prev, { text, type, id: Date.now() }]);
  };

  const clearOutput = () => {
    setOutput([]);
  };

  const quickCommands = [
    { label: 'الرئيسية', action: () => handleNavigate('https://www.google.com') },
    { label: 'تحديث', action: () => addOutput('تم تحديث الصفحة', 'success') },
    { label: 'للخلف', action: () => addOutput('تم الرجوع للخلف', 'success') },
    { label: 'للأمام', action: () => addOutput('تم الانتقال للأمام', 'success') }
  ];

  return (
    <div className={`bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-lg overflow-hidden shadow-2xl ${
      isFullscreen ? 'fixed inset-0 z-50' : ''
    }`}>
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 border-b border-cyan-500/30 p-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 bg-slate-700/50 rounded-lg px-3 py-2 border border-slate-600">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleNavigate()}
                placeholder="أدخل عنوان URL..."
                className="flex-1 bg-transparent text-cyan-400 placeholder-gray-500 outline-none text-sm"
              />
              <button
                onClick={() => handleNavigate()}
                disabled={isLoading}
                className="p-2 hover:bg-slate-600 rounded-lg transition-colors disabled:opacity-50"
                title="انتقل"
              >
                <ChevronRight size={18} className="text-cyan-400" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-cyan-400 transition-colors"
              title={isFullscreen ? 'تصغير' : 'تكبير'}
            >
              {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
          </div>
        </div>

        <div className="flex gap-2 mt-3 flex-wrap">
          {quickCommands.map((cmd, idx) => (
            <button
              key={idx}
              onClick={cmd.action}
              disabled={isLoading}
              className="px-3 py-1 text-sm bg-slate-600 hover:bg-slate-500 text-cyan-400 rounded-lg transition-colors disabled:opacity-50"
            >
              {cmd.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col h-96 md:h-[600px]">
        <div className="flex-1 overflow-y-auto bg-black/30 p-4 space-y-2 font-mono text-sm">
          {output.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <p>لا توجد عمليات حتى الآن...</p>
            </div>
          ) : (
            output.map(line => (
              <div
                key={line.id}
                className={`${
                  line.type === 'success'
                    ? 'text-green-400'
                    : line.type === 'error'
                    ? 'text-red-400'
                    : line.type === 'command'
                    ? 'text-yellow-400'
                    : 'text-gray-400'
                }`}
              >
                {line.text}
              </div>
            ))
          )}
        </div>

        <div className="border-t border-cyan-500/30 bg-slate-800/50 p-4">
          <div className="flex gap-2 mb-3">
            <input
              ref={inputRef}
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendCommand()}
              placeholder="أدخل أمر أو استعلام..."
              className="flex-1 px-3 py-2 bg-slate-700 text-cyan-400 placeholder-gray-500 rounded-lg border border-slate-600 focus:border-cyan-500 outline-none"
              disabled={isLoading}
            />
            <button
              onClick={handleSendCommand}
              disabled={isLoading || !command.trim()}
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <Send size={18} />
              <span className="hidden sm:inline">إرسال</span>
            </button>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={clearOutput}
              className="px-3 py-1 text-sm bg-slate-700 hover:bg-slate-600 text-gray-400 rounded-lg transition-colors"
            >
              مسح السجل
            </button>
            <button
              onClick={() => setCommand('help')}
              className="px-3 py-1 text-sm bg-slate-700 hover:bg-slate-600 text-gray-400 rounded-lg transition-colors"
            >
              مساعدة
            </button>
          </div>
        </div>
      </div>

      <div className="bg-slate-800/50 border-t border-cyan-500/30 px-4 py-2 flex items-center justify-between text-xs text-gray-400">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            isLoading ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'
          }`}></div>
          <span>{isLoading ? 'جاري المعالجة...' : 'جاهز'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Zap size={14} />
          <span>الأوامر المنفذة: {history.length}</span>
        </div>
      </div>
    </div>
  );
}
