import { useState, useEffect, useCallback } from 'react';
import { getActivityStream } from '../api/system';
import ActivityTable from '../components/ActivityTable';
import { RefreshCw, Clock, AlertCircle, Info } from 'lucide-react'; // استيراد أيقونات إضافية

// تعريف ثابت لفترة التحديث التلقائي بالمللي ثانية
const AUTO_REFRESH_INTERVAL = 30000; // 30 ثانية

export default function Activity() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false); // حالة للتحديث التلقائي

  // دالة لجلب الأنشطة، تم تغليفها بـ useCallback لتحسين الأداء
  const fetchActivity = useCallback(async () => {
    // إذا كانت هناك أحداث سابقة، لا نظهر شاشة التحميل الكاملة
    if (events.length === 0) {
      setLoading(true);
    }
    setError(null); // مسح أي أخطاء سابقة

    try {
      const data = await getActivityStream();
      setEvents(data.events || []);
    } catch (err) {
      setError(err.message || "An unknown error occurred.");
    } finally {
      setLoading(false);
    }
  }, [events.length]); // يعتمد على events.length لتحديد ما إذا كان يجب إظهار شاشة التحميل الكاملة

  // تأثير جانبي لجلب الأنشطة عند تحميل المكون
  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]); // يعتمد على fetchActivity

  // تأثير جانبي للتحديث التلقائي
  useEffect(() => {
    let intervalId;
    if (isAutoRefreshing) {
      intervalId = setInterval(() => {
        fetchActivity();
      }, AUTO_REFRESH_INTERVAL);
    }

    // تنظيف المؤقت عند إلغاء تحميل المكون أو إيقاف التحديث التلقائي
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isAutoRefreshing, fetchActivity]);

  // حالة التحميل الأولية (عندما لا توجد بيانات سابقة)
  if (loading && events.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neonGreen mx-auto"></div>
          <p className="mt-4 text-textDim">Loading activity stream...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Activity Stream</h1>
          <p className="text-textDim mt-1">Recent Joe & System Events</p>
        </div>
        <div className="flex items-center gap-2">
          {/* زر التحديث اليدوي */}
          <button
            onClick={fetchActivity}
            disabled={loading} // تعطيل الزر أثناء التحميل
            className="btn-secondary flex items-center gap-2"
          >
            {loading && events.length > 0 ? ( // مؤشر تحميل خفيف إذا كانت هناك بيانات سابقة
              <RefreshCw size={16} className="animate-spin" />
            ) : (
              <RefreshCw size={16} />
            )}
            {loading && events.length > 0 ? 'Refreshing...' : 'Refresh'}
          </button>

          {/* زر تبديل التحديث التلقائي */}
          <button
            onClick={() => setIsAutoRefreshing(!isAutoRefreshing)}
            className={`btn-secondary flex items-center gap-2 ${isAutoRefreshing ? 'bg-neonGreen/20 text-neonGreen border-neonGreen' : ''}`}
          >
            <Clock size={16} />
            {isAutoRefreshing ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          </button>
        </div>
      </div>

      {/* رسالة الخطأ */}
      {error && (
        <div className="card bg-red-500/10 border border-red-500/50 flex items-center gap-2 p-4 rounded-lg">
          <AlertCircle size={20} className="text-red-400" />
          <p className="text-red-400">Error loading activity: {error}</p>
        </div>
      )}

      {/* رسالة الحالة الفارغة */}
      {!loading && !error && events.length === 0 && (
        <div className="card bg-gray-700/20 border border-gray-600/50 flex flex-col items-center justify-center p-8 rounded-lg text-center">
          <Info size={48} className="text-gray-400 mb-4" />
          <p className="text-lg font-medium text-textDim">No activity events to display.</p>
          <p className="text-sm text-gray-500 mt-2">Check back later or try refreshing the stream.</p>
        </div>
      )}

      {/* جدول الأنشطة */}
      {events.length > 0 && <ActivityTable events={events} />}
    </div>
  );
}
