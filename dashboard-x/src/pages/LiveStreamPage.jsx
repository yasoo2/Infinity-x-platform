import React, { useState } from 'react';
import { useLiveStream } from '../hooks/useLiveStream';
import LiveStreamViewer from '../components/LiveStreamViewer';
import { Settings, Info } from 'lucide-react';

/**
 * صفحة عرض البث الحي
 * تعرض سطح المكتب الحي لنظام جو مع أدوات التحكم المتقدمة
 */
export default function LiveStreamPage() {
  const [showSettings, setShowSettings] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const liveStream = useLiveStream();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* رأس الصفحة */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-cyan-400 mb-2">
                عرض سطح المكتب الحي
              </h1>
              <p className="text-gray-400">
                شاهد ما يقوم به نظام جو بشكل مباشر وفي الوقت الفعلي
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-cyan-400 transition-colors"
                title="الإعدادات"
              >
                <Settings size={24} />
              </button>
              <button
                onClick={() => setShowInfo(!showInfo)}
                className="p-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-cyan-400 transition-colors"
                title="المعلومات"
              >
                <Info size={24} />
              </button>
            </div>
          </div>

          {/* شريط الحالة */}
          <div className="flex gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${liveStream.isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-400">
                {liveStream.isConnected ? 'متصل' : 'غير متصل'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${liveStream.isStreaming ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
              <span className="text-sm text-gray-400">
                {liveStream.isStreaming ? 'البث قيد التشغيل' : 'البث متوقف'}
              </span>
            </div>
          </div>
        </div>

        {/* المحتوى الرئيسي */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* عارض البث الحي */}
          <div className="lg:col-span-3">
            <LiveStreamViewer />
          </div>

          {/* الشريط الجانبي */}
          <div className="space-y-4">
            {/* معلومات النظام */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-lg p-4 border border-cyan-500/30">
              <h3 className="text-lg font-bold text-cyan-400 mb-4">معلومات النظام</h3>
              
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-gray-400 mb-1">معدل الإطارات</div>
                  <div className="text-2xl font-bold text-green-400">
                    {liveStream.stats.fps?.toFixed(1) || '0'} FPS
                  </div>
                </div>

                <div>
                  <div className="text-xs text-gray-400 mb-1">إجمالي الإطارات</div>
                  <div className="text-2xl font-bold text-blue-400">
                    {liveStream.stats.totalFrames || '0'}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-gray-400 mb-1">الوقت المنقضي</div>
                  <div className="text-lg font-bold text-purple-400">
                    {liveStream.stats.uptime || '00:00:00'}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-gray-400 mb-1">المشتركون</div>
                  <div className="text-lg font-bold text-yellow-400">
                    {liveStream.stats.subscribers || '0'}
                  </div>
                </div>
              </div>
            </div>

            {/* الإعدادات السريعة */}
            {showSettings && (
              <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-lg p-4 border border-cyan-500/30">
                <h3 className="text-lg font-bold text-cyan-400 mb-4">الإعدادات</h3>

                <div className="space-y-4">
                  {/* معدل الإطارات */}
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">
                      معدل الإطارات (FPS)
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="30"
                      value={liveStream.frameRate}
                      onChange={(e) => liveStream.updateFrameRate(parseInt(e.target.value))}
                      className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="text-right text-sm text-cyan-400 mt-1">
                      {liveStream.frameRate} FPS
                    </div>
                  </div>

                  {/* جودة الصورة */}
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">
                      جودة الصورة (%)
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={liveStream.quality}
                      onChange={(e) => liveStream.updateQuality(parseInt(e.target.value))}
                      className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="text-right text-sm text-cyan-400 mt-1">
                      {liveStream.quality}%
                    </div>
                  </div>

                  {/* الدقة */}
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">
                      الدقة
                    </label>
                    <select
                      value={`${liveStream.resolution.width}x${liveStream.resolution.height}`}
                      onChange={(e) => {
                        const [w, h] = e.target.value.split('x');
                        liveStream.updateResolution(parseInt(w), parseInt(h));
                      }}
                      className="w-full px-3 py-2 bg-slate-600 text-cyan-400 rounded-lg text-sm border border-slate-500 focus:border-cyan-500 outline-none"
                    >
                      <option value="640x480">640x480</option>
                      <option value="1024x768">1024x768</option>
                      <option value="1280x720">1280x720 (HD)</option>
                      <option value="1920x1080">1920x1080 (Full HD)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* المعلومات */}
            {showInfo && (
              <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-lg p-4 border border-cyan-500/30">
                <h3 className="text-lg font-bold text-cyan-400 mb-4">المعلومات</h3>

                <div className="space-y-3 text-sm text-gray-400">
                  <div>
                    <p className="font-semibold text-cyan-400 mb-1">ما هو البث الحي؟</p>
                    <p>
                      عرض مباشر لسطح المكتب الخاص بنظام جو مع الإحصائيات الفعلية.
                    </p>
                  </div>

                  <div>
                    <p className="font-semibold text-cyan-400 mb-1">كيفية الاستخدام؟</p>
                    <p>
                      اضغط على زر التشغيل لبدء البث، ثم استخدم الإعدادات لتحسين الأداء.
                    </p>
                  </div>

                  <div>
                    <p className="font-semibold text-cyan-400 mb-1">الإحصائيات</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>FPS: معدل الإطارات في الثانية</li>
                      <li>الإطارات: إجمالي الإطارات المرسلة</li>
                      <li>الوقت: الوقت المنقضي منذ البدء</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* رسالة الخطأ */}
        {liveStream.error && (
          <div className="mt-6 bg-red-500/20 border border-red-500 text-red-400 px-4 py-3 rounded-lg">
            {liveStream.error}
          </div>
        )}
      </div>
    </div>
  );
}
