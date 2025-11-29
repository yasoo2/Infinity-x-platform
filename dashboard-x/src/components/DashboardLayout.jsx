// DashboardLayout.tsx
import { Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import JoeScreen from './JoeScreen';
import apiClient from '../api/client';

export default function DashboardLayout() {
  const [isJoeScreenOpen, setIsJoeScreenOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); // تم تغيير القيمة الافتراضية
  const [progress, setProgress] = useState(0); // تم تغيير القيمة الافتراضية
  const [wsLog, setWsLog] = useState([]); // تم تحديد النوع
  const [factoryMode, setFactoryMode] = useState('online');
  const [offlineReady, setOfflineReady] = useState(false);

  const handleTakeover = () => {
    console.warn('User has taken over the Joe screen.');
    // هنا يمكنك إضافة منطق للتحكم في Joe
  };

  const handleCloseJoeScreen = () => {
    setIsJoeScreenOpen(false);
  };

  const handleCommandSubmit = async (data) => {
    setIsProcessing(true);
    setProgress(0);
    setWsLog(prev => [...prev, `Sending command: ${data.commandText}`]);
    console.warn('Command submitted from JoeScreen:', data);

    // محاكاة لعملية إرسال الأمر والاستجابة
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 200));
      setProgress(i);
      setWsLog(prev => [...prev, `Progress: ${i}%`]);
    }

    await new Promise(resolve => setTimeout(resolve, 500));
    setWsLog(prev => [...prev, `Command processed. Response: "Hello from Joe!"`]);
    setIsProcessing(false);
    setProgress(100);
  };

  useEffect(() => {
    (async () => {
      try {
        const { data } = await apiClient.get('/api/v1/runtime-mode/status');
        if (data?.success && data?.mode) setFactoryMode(data.mode);
        setOfflineReady(Boolean(data?.offlineReady));
      } catch {}
    })();
  }, []);

  const toggleFactoryMode = async () => {
    try {
      if (factoryMode !== 'offline' && !offlineReady) return alert('الوضع الأوفلاين غير جاهز: لم يتم تحميل النموذج المحلي');
      const { data } = await apiClient.post('/api/v1/runtime-mode/toggle');
      if (data?.success) setFactoryMode(data.mode);
    } catch {}
  };

  return (
    <div className="min-h-screen bg-bgDark">
      {/* Navbar removed as per user request to eliminate the top header. */}
      <main className="max-w-full mx-auto p-0 h-screen">
        <Outlet />
      </main>
      <div className="fixed bottom-4 right-4 z-50 flex gap-2">
        <button
          onClick={toggleFactoryMode}
          className={`${factoryMode==='offline' ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-800 text-gray-200 hover:bg-gray-700'} px-4 py-2 text-sm font-medium rounded-lg transition-all ${(!offlineReady && factoryMode!=='offline') ? 'opacity-60 cursor-not-allowed' : ''}`}
          title={factoryMode==='offline' ? 'وضع المصنع الذاتي مفعل' : 'الوضع الحالي'}
          disabled={!offlineReady && factoryMode!=='offline'}
        >
          {factoryMode==='offline' ? 'مصنع ذاتي' : 'النظام الحالي'}
        </button>
      </div>
      {isJoeScreenOpen && (
        <JoeScreen
          isProcessing={isProcessing}
          progress={progress}
          wsLog={wsLog}
          onTakeover={handleTakeover}
          onClose={handleCloseJoeScreen}
          onSubmitCommand={handleCommandSubmit} // تمرير دالة إرسال الأمر
        />
      )}
    </div>
  );
}
