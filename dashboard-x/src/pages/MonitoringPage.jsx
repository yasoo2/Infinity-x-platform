import React, { useState } from 'react';
import AdvancedMonitoringPanel from '../components/AdvancedMonitoringPanel';
import EnhancedBrowserControl from '../components/EnhancedBrowserControl';
import { BarChart3, Monitor } from 'lucide-react';

export default function MonitoringPage() {
  const [activeTab, setActiveTab] = useState('monitoring');

  const tabs = [
    { id: 'monitoring', label: '📊 المراقبة', icon: BarChart3 },
    { id: 'browser', label: '🌐 التحكم بالمتصفح', icon: Monitor }
  ];

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
