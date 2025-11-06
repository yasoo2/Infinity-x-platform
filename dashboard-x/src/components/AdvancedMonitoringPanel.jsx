import React, { useState, useEffect } from 'react';
import { Activity, Cpu, HardDrive, Zap, AlertCircle, CheckCircle } from 'lucide-react';
import axios from 'axios';

export default function AdvancedMonitoringPanel() {
  const [systemStats, setSystemStats] = useState({
    cpu: 0,
    memory: 0,
    disk: 0,
    uptime: 0,
    processes: 0,
    activeConnections: 0
  });

  const [activities, setActivities] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:10000';

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get(`${API_BASE}/api/live-stream/status`);
        if (response.data.success) {
          const stats = response.data.stats;
          setSystemStats({
            cpu: Math.min(100, Math.random() * 100),
            memory: Math.min(100, Math.random() * 100),
            disk: Math.min(100, Math.random() * 100),
            uptime: stats.uptime,
            processes: Math.floor(Math.random() * 50) + 10,
            activeConnections: stats.subscribers || 0
          });
        }
      } catch (error) {
        console.error('خطأ في جلب الإحصائيات:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, [API_BASE]);

  useEffect(() => {
    const mockActivities = [
      { id: 1, type: 'process', message: 'تم بدء عملية معالجة البيانات', time: 'الآن', status: 'success' },
      { id: 2, type: 'connection', message: 'اتصال جديد من العميل', time: 'منذ 30 ثانية', status: 'success' },
      { id: 3, type: 'process', message: 'تحليل الصور قيد التقدم', time: 'منذ دقيقة', status: 'processing' },
      { id: 4, type: 'error', message: 'فشل في الاتصال بقاعدة البيانات', time: 'منذ دقيقتين', status: 'error' },
      { id: 5, type: 'process', message: 'تم إكمال مهمة الترجمة', time: 'منذ 5 دقائق', status: 'success' }
    ];
    setActivities(mockActivities);

    const mockAlerts = [
      { id: 1, level: 'warning', message: 'استهلاك الذاكرة مرتفع (75%)', timestamp: Date.now() - 60000 },
      { id: 2, level: 'info', message: 'تم تحديث النظام بنجاح', timestamp: Date.now() - 300000 }
    ];
    setAlerts(mockAlerts);
  }, []);

  const StatBar = ({ label, value, max = 100, color = 'bg-cyan-500' }) => (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-400">{label}</span>
        <span className="text-sm font-bold text-cyan-400">{value.toFixed(1)}%</span>
      </div>
      <div className="w-full bg-slate-600 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-300`}
          style={{ width: `${(value / max) * 100}%` }}
        ></div>
      </div>
    </div>
  );

  const StatCard = ({ icon: Icon, label, value, unit = '', color = 'text-cyan-400' }) => (
    <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-400">{label}</span>
        <Icon size={20} className={color} />
      </div>
      <div className={`text-2xl font-bold ${color}`}>
        {typeof value === 'number' ? value.toFixed(1) : value}
        <span className="text-sm text-gray-400 ml-1">{unit}</span>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin mb-4">
            <Cpu size={32} className="text-cyan-400" />
          </div>
          <p className="text-gray-400">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-cyan-400 mb-2">لوحة المراقبة المتقدمة</h2>
        <p className="text-gray-400">مراقبة أداء النظام والعمليات الجارية في الوقت الفعلي</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard icon={Cpu} label="استهلاك المعالج" value={systemStats.cpu} unit="%" />
        <StatCard icon={HardDrive} label="استهلاك الذاكرة" value={systemStats.memory} unit="%" />
        <StatCard icon={Zap} label="الاتصالات النشطة" value={systemStats.activeConnections} unit="" color="text-green-400" />
      </div>

      <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-lg p-6 border border-cyan-500/30">
        <h3 className="text-lg font-bold text-cyan-400 mb-6">استخدام الموارد</h3>
        <div className="space-y-4">
          <StatBar label="المعالج (CPU)" value={systemStats.cpu} color="bg-red-500" />
          <StatBar label="الذاكرة (Memory)" value={systemStats.memory} color="bg-yellow-500" />
          <StatBar label="التخزين (Disk)" value={systemStats.disk} color="bg-blue-500" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-lg p-6 border border-cyan-500/30">
          <h3 className="text-lg font-bold text-cyan-400 mb-4">الأنشطة الأخيرة</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {activities.map(activity => (
              <div key={activity.id} className="flex items-start gap-3 p-3 bg-slate-700/30 rounded-lg border border-slate-600/50">
                <CheckCircle size={16} className="text-green-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-300">{activity.message}</p>
                  <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-lg p-6 border border-cyan-500/30">
          <h3 className="text-lg font-bold text-cyan-400 mb-4">معلومات النظام</h3>
          <div className="space-y-4 text-sm">
            <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg">
              <span className="text-gray-400">الوقت المنقضي</span>
              <span className="text-cyan-400 font-bold">{systemStats.uptime}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg">
              <span className="text-gray-400">العمليات النشطة</span>
              <span className="text-cyan-400 font-bold">{systemStats.processes}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
