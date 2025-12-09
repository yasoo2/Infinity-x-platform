import React, { useState, useRef } from 'react';
import { Send, Maximize2, Minimize2, ChevronRight, Zap } from 'lucide-react';
import useBrowserWebSocket from '../hooks/useBrowserWebSocket';

export default function EnhancedBrowserControl() {
  const [url, setUrl] = useState('https://www.google.com');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [command, setCommand] = useState('');
  const [output, setOutput] = useState([]);
  const [history, setHistory] = useState([]);
  const inputRef = useRef(null);
  const { isConnected, isLoading, navigate, extractSerp, pageInfo, back, forward, refresh } = useBrowserWebSocket();


  const handleNavigate = (targetUrl = url) => {
    const u = String(targetUrl || '').trim();
    if (!u) return;
    if (!isConnected) {
      addOutput('⚠️ غير متصل بالمتحكم، سيتم المحاولة تلقائيًا…', 'error');
      return;
    }
    navigate(u);
    setUrl(u);
    addOutput(`✅ تم الانتقال إلى: ${u}`, 'success');
  };

  const handleSendCommand = async () => {
    const cmd = String(command || '').trim();
    if (!cmd) return;
    setHistory(prev => [...prev, cmd]);
    addOutput(`> ${cmd}`, 'command');
    if (!isConnected) {
      addOutput('⚠️ غير متصل بالمتحكم، لا يمكن تنفيذ الأمر الآن.', 'error');
      return;
    }
    // بسيط: إذا كان الأمر رابطًا → انتقل، وإلا استخدم بحث SERP
    if (/^https?:\/\//i.test(cmd)) {
      handleNavigate(cmd);
    } else {
      try {
        await extractSerp(cmd);
        addOutput('🔎 تم تنفيذ البحث وإرسال النتائج إلى لوحة المتصفح', 'success');
      } catch (e) {
        addOutput(`❌ خطأ في البحث: ${e?.message || e}`, 'error');
      }
    }
    setCommand('');
    if (inputRef.current) inputRef.current.focus();
  };

  const addOutput = (text, type = 'info') => {
    setOutput(prev => [...prev, { text, type, id: Date.now() }]);
  };

  const clearOutput = () => {
    setOutput([]);
  };

  const quickCommands = [
    { label: 'الرئيسية', action: () => handleNavigate('https://www.google.com') },
    { label: 'تحديث', action: () => { if (isConnected) { try { refresh(); addOutput('🔄 تم تحديث الصفحة', 'success'); } catch (e) { addOutput(`❌ فشل التحديث: ${e?.message || e}`,'error'); } } else { addOutput('⚠️ غير متصل', 'error'); } } },
    { label: 'للخلف', action: () => { if (isConnected) { try { back(); addOutput('⬅️ تم الرجوع صفحة واحدة', 'success'); } catch (e) { addOutput(`❌ فشل الرجوع: ${e?.message || e}`,'error'); } } else { addOutput('⚠️ غير متصل', 'error'); } } },
    { label: 'للأمام', action: () => { if (isConnected) { try { forward(); addOutput('➡️ تم التقدم صفحة واحدة', 'success'); } catch (e) { addOutput(`❌ فشل التقدم: ${e?.message || e}`,'error'); } } else { addOutput('⚠️ غير متصل', 'error'); } } }
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
                disabled={isLoading || !isConnected}
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
              disabled={isLoading || !isConnected}
            />
            <button
              onClick={handleSendCommand}
              disabled={isLoading || !command.trim() || !isConnected}
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
          <div className={`w-2 h-2 rounded-full ${isConnected ? (isLoading ? 'bg-yellow-500 animate-pulse' : 'bg-green-500') : 'bg-red-500'}`}></div>
          <span>{isConnected ? (isLoading ? 'جاري المعالجة...' : (pageInfo?.url ? `جاهز • ${pageInfo.url}` : 'جاهز')) : 'غير متصل'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Zap size={14} />
          <span>الأوامر المنفذة: {history.length}</span>
        </div>
      </div>
    </div>
  );
}
