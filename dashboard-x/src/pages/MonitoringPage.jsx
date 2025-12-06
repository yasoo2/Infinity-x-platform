import React, { useState, useEffect } from 'react';
import AdvancedMonitoringPanel from '../components/AdvancedMonitoringPanel';
import EnhancedBrowserControl from '../components/EnhancedBrowserControl';
import { BarChart3, Monitor, Gauge, Trash2, RotateCcw } from 'lucide-react';

export default function MonitoringPage() {
  const [activeTab, setActiveTab] = useState('monitoring');
  const [adminMsg, setAdminMsg] = useState('');
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [statsError, setStatsError] = useState('');

  const tabs = [
    { id: 'monitoring', label: '📊 المراقبة', icon: BarChart3 },
    { id: 'browser', label: '🌐 التحكم بالمتصفح', icon: Monitor },
    { id: 'joe', label: '🧠 لوحة جـو', icon: Gauge }
  ];

  const handlePurgeCache = async () => {
    try {
      setAdminMsg('');
      const { data } = await (await import('../api/client')).default.post('/api/v1/joe/tools/cache/purge');
      setAdminMsg(data?.success ? 'تم مسح الكاش بنجاح' : 'فشل مسح الكاش');
    } catch (e) {
      setAdminMsg(e?.response?.data?.message || e?.message || 'حدث خطأ عند مسح الكاش');
    }
  };

  const handleResetCircuits = async () => {
    try {
      setAdminMsg('');
      const { data } = await (await import('../api/client')).default.post('/api/v1/joe/tools/circuits/reset');
      setAdminMsg(data?.success ? 'تم إعادة تعيين القواطع' : 'فشل إعادة تعيين القواطع');
    } catch (e) {
      setAdminMsg(e?.response?.data?.message || e?.message || 'حدث خطأ عند إعادة تعيين القواطع');
    }
  };

  const fetchStats = async () => {
    try {
      setLoadingStats(true);
      setStatsError('');
      const { data } = await (await import('../api/client')).default.get('/api/v1/joe/stats');
      if (data?.success) setStats(data);
      else setStatsError('فشل تحميل الإحصائيات');
    } catch (e) {
      setStatsError(e?.response?.data?.message || e?.message || 'خطأ عند تحميل الإحصائيات');
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'joe') fetchStats();
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-cyan-400 mb-2">
            لوحة المراقبة والتحكم
          </h1>
          <p className="text-gray-400">
            مراقبة أداء النظام والتحكم بالمتصفح بشكل متقدم
          </p>
        </div>

        <div className="flex gap-4 mb-8 border-b border-cyan-500/30 overflow-x-auto">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 font-medium transition-all whitespace-nowrap flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'text-cyan-400 border-b-2 border-cyan-400'
                    : 'text-gray-400 hover:text-cyan-300'
                }`}
              >
                <Icon size={20} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="animate-fadeIn">
          {activeTab === 'monitoring' && (
            <AdvancedMonitoringPanel />
          )}
          {activeTab === 'browser' && (
            <div className="space-y-4">
              <div className="bg-blue-500/20 border border-blue-500 text-blue-400 px-4 py-3 rounded-lg">
                <p className="text-sm">
                  💡 يمكنك استخدام هذه الواجهة للتحكم بالمتصفح وتنفيذ الأوامر على النظام.
                </p>
              </div>
              <EnhancedBrowserControl />
            </div>
          )}
          {activeTab === 'joe' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <button onClick={handlePurgeCache} className="px-3 py-1.5 rounded bg-yellow-600 hover:bg-yellow-700 text-black text-sm inline-flex items-center gap-1"><Trash2 className="w-4 h-4"/> مسح الكاش</button>
                <button onClick={handleResetCircuits} className="px-3 py-1.5 rounded bg-purple-600 hover:bg-purple-700 text-white text-sm inline-flex items-center gap-1"><RotateCcw className="w-4 h-4"/> إعادة تعيين القواطع</button>
                <button onClick={fetchStats} className="px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-700 text-white text-sm">تحديث البيانات</button>
                {adminMsg && (
                  <span className="text-xs text-cyan-300 ml-2">{adminMsg}</span>
                )}
              </div>
              <div className="bg-cyan-500/20 border border-cyan-500 text-cyan-200 px-4 py-3 rounded-lg">
                <p className="text-sm">لوحة جـو تعرض أفضل الأدوات أداءً والقواطع المفتوحة مع إحصائيات مباشرة.</p>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
                {loadingStats && (
                  <div className="text-sm text-gray-300">جاري التحميل...</div>
                )}
                {statsError && (
                  <div className="text-sm text-red-400">{statsError}</div>
                )}
                {stats && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-4 text-sm text-gray-300">
                      <div>عدد الأدوات: <span className="text-white font-semibold">{stats.toolsCount}</span></div>
                      <div>مخططات الوظائف: <span className="text-white font-semibold">{stats.schemasCount}</span></div>
                      <div>حجم الكاش: <span className="text-white font-semibold">{stats.cacheSize}</span></div>
                    </div>
                    <div>
                      <h3 className="text-cyan-300 font-bold mb-2">القواطع المفتوحة</h3>
                      {(stats.openCircuits?.length ? (
                        <ul className="list-disc list-inside text-sm text-gray-300">
                          {stats.openCircuits.map((n) => (
                            <li key={n} className="text-yellow-300">{n}</li>
                          ))}
                        </ul>
                      ) : (
                        <div className="text-sm text-gray-400">لا توجد قواطع مفتوحة.</div>
                      ))}
                    </div>
                    <div>
                      <h3 className="text-cyan-300 font-bold mb-2">أفضل الأدوات أداءً</h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="text-gray-400">
                              <th className="px-3 py-2 text-left">الاسم</th>
                              <th className="px-3 py-2 text-left">نجاح</th>
                              <th className="px-3 py-2 text-left">فشل</th>
                              <th className="px-3 py-2 text-left">متوسط الزمن (ms)</th>
                              <th className="px-3 py-2 text-left">آخر زمن (ms)</th>
                              <th className="px-3 py-2 text-left">النتيجة</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(stats.ranking || []).slice(0, 25).map((r) => (
                              <tr key={r.name} className="border-t border-slate-700 text-gray-200">
                                <td className="px-3 py-2 font-mono">{r.name}</td>
                                <td className="px-3 py-2">{r.success}</td>
                                <td className="px-3 py-2">{r.failure}</td>
                                <td className="px-3 py-2">{r.avgMs}</td>
                                <td className="px-3 py-2">{r.lastMs}</td>
                                <td className="px-3 py-2 font-semibold">{r.score}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <h3 className="text-cyan-400 font-bold mb-2">🎯 الميزات</h3>
            <ul className="text-sm text-gray-400 space-y-1">
              <li>✓ مراقبة فعلية لأداء النظام</li>
              <li>✓ تحكم متقدم بالمتصفح</li>
              <li>✓ سجل العمليات الكامل</li>
              <li>✓ تنبيهات النظام</li>
            </ul>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <h3 className="text-cyan-400 font-bold mb-2">⚙️ الإعدادات</h3>
            <ul className="text-sm text-gray-400 space-y-1">
              <li>✓ تحديث فوري للبيانات</li>
              <li>✓ أوامر سريعة</li>
              <li>✓ سجل الأوامر</li>
              <li>✓ واجهة سهلة الاستخدام</li>
            </ul>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <h3 className="text-cyan-400 font-bold mb-2">📈 الأداء</h3>
            <ul className="text-sm text-gray-400 space-y-1">
              <li>✓ استجابة سريعة</li>
              <li>✓ استهلاك منخفض للموارد</li>
              <li>✓ دعم الاتصالات المتعددة</li>
              <li>✓ تحديثات فعالة</li>
            </ul>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
