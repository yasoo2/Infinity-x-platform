import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import { Activity, Cpu, HardDrive, Zap, AlertCircle, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import apiClient from '../api/client';

  // ألوان الحالات للأنشطة والتنبيهات
  const STATUS_STYLES = {
    success: { icon: CheckCircle, color: 'text-green-400', badge: 'bg-green-500/15 text-green-400' },
    processing: { icon: Loader2, color: 'text-cyan-400', badge: 'bg-cyan-500/15 text-cyan-400' },
    error: { icon: XCircle, color: 'text-red-400', badge: 'bg-red-500/15 text-red-400' },
    info: { icon: Activity, color: 'text-blue-400', badge: 'bg-blue-500/15 text-blue-400' },
    warning: { icon: AlertCircle, color: 'text-yellow-400', badge: 'bg-yellow-500/15 text-yellow-400' },
  };

  const formatUptime = (seconds) => {
    if (!seconds || seconds < 0) return '-';
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const parts = [];
    if (d) parts.push(`${d} يوم`);
    if (h) parts.push(`${h} ساعة`);
    if (m || parts.length === 0) parts.push(`${m} دقيقة`);
    return parts.join('، ');
  };

  const StatBar = ({ label, value, max = 100, color = 'bg-cyan-500' }) => {
    const pct = Math.max(0, Math.min(100, (value / max) * 100));
    return (
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-400">{label}</span>
          <span className="text-sm font-bold text-cyan-400">{Number(value || 0).toFixed(1)}%</span>
        </div>
        <div className="w-full bg-slate-600/70 rounded-full h-2 overflow-hidden">
          <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  };

  const StatCard = ({ icon: Icon, label, value, unit = '', color = 'text-cyan-400' }) => (
    <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-400">{label}</span>
        <Icon size={20} className={color} />
      </div>
      <div className={`text-2xl font-bold ${color}`}>
        {typeof value === 'number' ? value.toFixed(1) : value}
        {unit ? <span className="text-sm text-gray-400 ml-1">{unit}</span> : null}
      </div>
    </div>
  );

  export default function AdvancedMonitoringPanel({ apiBase, refreshMs = 5000, mockMode = false }) {
    const baseUrl = apiBase || (typeof apiClient?.defaults?.baseURL === 'string' ? apiClient.defaults.baseURL : (typeof window !== 'undefined' ? window.location.origin : ''));

    const [systemStats, setSystemStats] = useState({
      cpu: 0,
      memory: 0,
      disk: 0,
      uptime: 0,
      processes: 0,
      activeConnections: 0,
    });

    const [activities, setActivities] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [wsConnected, setWsConnected] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const [lastFrame, setLastFrame] = useState(null);
    const wsRef = useRef(null);

    const fetchStats = useCallback(async (signal) => {
      try {
        setError(null);
        const { data } = await apiClient.get('/api/live-stream/status', { signal });
        if (data?.success) {
          const stats = data.stats || {};
          setSystemStats((prev) => ({
            cpu: mockMode ? Math.min(100, Math.random() * 100) : Number(stats.cpu ?? prev.cpu),
            memory: mockMode ? Math.min(100, Math.random() * 100) : Number(stats.memory ?? prev.memory),
            disk: mockMode ? Math.min(100, Math.random() * 100) : Number(stats.disk ?? prev.disk),
            uptime: Number(stats.uptime ?? prev.uptime),
            processes: mockMode ? Math.floor(Math.random() * 50) + 10 : Number(stats.processes ?? prev.processes),
            activeConnections: Number(stats.subscribers ?? stats.activeConnections ?? 0),
          }));
        } else {
          throw new Error(data?.message || 'فشل جلب البيانات');
        }
      } catch (e) {
        if (e?.code === 'ERR_CANCELED' || e?.name === 'CanceledError') return;
        setError(e?.message || 'حدث خطأ غير متوقع');
        // احتفظ بالبيانات الحالية ولا تُسقط الواجهه
      } finally {
        setIsLoading(false);
      }
    }, [mockMode]);

    useEffect(() => {
      const controller = new AbortController();
      const tick = () => fetchStats(controller.signal);
      tick();
      const id = setInterval(tick, refreshMs);
      return () => {
        controller.abort();
        clearInterval(id);
      };
    }, [fetchStats, refreshMs]);

    const buildWsUrl = useCallback(() => {
      const base = baseUrl || '';
      const wsBase = String(base).replace(/^https/, 'wss').replace(/^http/, 'ws');
      let url = `${wsBase}/ws/live-stream`;
      try {
        const token = localStorage.getItem('sessionToken');
        if (token) url += `?token=${token}`;
      } catch { /* noop */ }
      return url;
    }, [baseUrl]);

    const connectWs = useCallback(() => {
      try {
        const url = buildWsUrl();
        wsRef.current = new WebSocket(url);
        wsRef.current.onopen = () => setWsConnected(true);
        wsRef.current.onclose = () => setWsConnected(false);
        wsRef.current.onerror = () => setWsConnected(false);
        wsRef.current.onmessage = (ev) => {
          try {
            const msg = JSON.parse(ev.data);
            if (msg?.type === 'frame' && msg?.data) {
              setLastFrame(msg.data);
            }
          } catch { /* noop */ }
        };
      } catch { /* noop */ }
    }, [buildWsUrl]);

    const disconnectWs = useCallback(() => {
      try { wsRef.current?.close(); } catch { /* noop */ }
      wsRef.current = null;
      setWsConnected(false);
    }, []);

    useEffect(() => {
      try {
        setIsStreaming(true);
        connectWs();
      } catch { /* noop */ }
      return () => { disconnectWs(); };
    }, [connectWs, disconnectWs]);

    // بيانات Mock للأنشطة والتنبيهات (يمكن استبدالها بمصدر حقيقي)
    useEffect(() => {
      const mockActivities = [
        { id: 1, type: 'process', message: 'تم بدء عملية معالجة البيانات', time: 'الآن', status: 'success' },
        { id: 2, type: 'connection', message: 'اتصال جديد من العميل', time: 'منذ 30 ثانية', status: 'success' },
        { id: 3, type: 'process', message: 'تحليل الصور قيد التقدم', time: 'منذ دقيقة', status: 'processing' },
        { id: 4, type: 'error', message: 'فشل في الاتصال بقاعدة البيانات', time: 'منذ دقيقتين', status: 'error' },
        { id: 5, type: 'process', message: 'تم إكمال مهمة الترجمة', time: 'منذ 5 دقائق', status: 'success' },
      ];
      setActivities(mockActivities);

      const now = Date.now();
      const mockAlerts = [
        { id: 1, level: 'warning', message: 'استهلاك الذاكرة مرتفع (75%)', timestamp: now - 60000 },
        { id: 2, level: 'info', message: 'تم تحديث النظام بنجاح', timestamp: now - 300000 },
      ];
      setAlerts(mockAlerts);
    }, []);

    const uptimeText = useMemo(() => formatUptime(Number(systemStats.uptime || 0)), [systemStats.uptime]);

    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin mb-4 inline-block">
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
          <div className="mt-3 flex items-center gap-2">
            <span className={`px-2 py-1 text-xs rounded ${wsConnected ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-slate-600/40 text-slate-300 border border-slate-600/50'}`}>{wsConnected ? 'متصل بالبث' : 'غير متصل'}</span>
            <span className="px-3 py-1 text-sm rounded bg-blue-600/20 text-blue-300 border border-blue-600/30">البث تلقائي</span>
          </div>
          {error && (
            <div className="mt-3 flex items-center gap-2 p-3 rounded-md border border-red-500/30 bg-red-500/10 text-red-300">
              <AlertCircle size={18} />
              <span>{error}</span>
              <button
                onClick={() => {
                  setIsLoading(true);
                  fetchStats();
                }}
                className="ml-auto px-3 py-1 text-sm rounded bg-red-500/20 hover:bg-red-500/30"
              >
                إعادة المحاولة
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard icon={Cpu} label="استهلاك المعالج" value={systemStats.cpu} unit="%" />
          <StatCard icon={HardDrive} label="استهلاك الذاكرة" value={systemStats.memory} unit="%" />
          <StatCard icon={Zap} label="الاتصالات النشطة" value={systemStats.activeConnections} color="text-green-400" />
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
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {activities.map((activity) => {
                const style = STATUS_STYLES[activity.status] || STATUS_STYLES.info;
                const IconComp = style.icon;
                return (
                  <div key={activity.id} className="flex items-start gap-3 p-3 bg-slate-700/30 rounded-lg border border-slate-600/50">
                    <IconComp size={16} className={`${style.color} ${activity.status === 'processing' ? 'animate-spin-slow' : ''}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 text-[10px] rounded-full font-semibold ${style.badge}`}>
                          {activity.status}
                        </span>
                        <span className="text-xs text-gray-500">{activity.time}</span>
                      </div>
                      <p className="text-sm text-gray-300 mt-1 truncate" title={activity.message}>{activity.message}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-lg p-6 border border-cyan-500/30">
            <h3 className="text-lg font-bold text-cyan-400 mb-4">معلومات النظام</h3>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg">
                <span className="text-gray-400">الوقت المنقضي</span>
                <span className="text-cyan-400 font-bold">{uptimeText}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg">
                <span className="text-gray-400">العمليات النشطة</span>
                <span className="text-cyan-400 font-bold">{systemStats.processes}</span>
              </div>

              {/* قائمة تنبيهات بسيطة */}
              {alerts?.length > 0 && (
                <div className="pt-2">
                  <h4 className="text-sm font-semibold text-gray-300 mb-2">التنبيهات</h4>
                  <div className="space-y-2">
                    {alerts.map((a) => {
                      const s = STATUS_STYLES[a.level] || STATUS_STYLES.info;
                      const Ico = s.icon;
                      return (
                        <div key={a.id} className="flex items-start gap-2 p-2 rounded border border-slate-600/50 bg-slate-700/30">
                          <Ico size={16} className={s.color} />
                          <div className="flex-1">
                            <p className="text-xs text-gray-300">{a.message}</p>
                            <p className="text-[11px] text-gray-500 mt-0.5">{new Date(a.timestamp).toLocaleString()}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="pt-4">
                <h4 className="text-sm font-semibold text-gray-300 mb-2">البث الحي</h4>
                <div className="rounded border border-slate-600/50 bg-slate-800/40 p-2 flex items-center justify-center min-h-[180px]">
                  {lastFrame ? (
                    <img src={`data:image/jpeg;base64,${lastFrame}`} alt="Live Frame" className="max-h-72 max-w-full rounded" />
                  ) : (
                    <span className="text-gray-400 text-xs">لا توجد إطارات معروضة</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <style>{`
          .animate-spin-slow {
            animation: spin 2s linear infinite;
          }
        `}</style>
      </div>
    );
  }

  StatBar.propTypes = {
    label: PropTypes.string.isRequired,
    value: PropTypes.number.isRequired,
    max: PropTypes.number,
    color: PropTypes.string,
  };

  StatCard.propTypes = {
    icon: PropTypes.elementType.isRequired,
    label: PropTypes.string.isRequired,
    value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    unit: PropTypes.string,
    color: PropTypes.string,
  };

  AdvancedMonitoringPanel.propTypes = {
    apiBase: PropTypes.string,
    refreshMs: PropTypes.number,
    mockMode: PropTypes.bool,
  };
