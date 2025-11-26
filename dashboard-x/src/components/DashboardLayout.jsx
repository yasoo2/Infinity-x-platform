// DashboardLayout.tsx
import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import Navbar from './Navbar';
import JoeScreen from './JoeScreen';

export default function DashboardLayout() {
  const [isJoeScreenOpen, setIsJoeScreenOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); // تم تغيير القيمة الافتراضية
  const [progress, setProgress] = useState(0); // تم تغيير القيمة الافتراضية
  const [wsLog, setWsLog] = useState([]); // تم تحديد النوع

  const handleTakeover = () => {
    console.log('User has taken over the Joe screen.');
    // هنا يمكنك إضافة منطق للتحكم في Joe
  };

  const handleCloseJoeScreen = () => {
    setIsJoeScreenOpen(false);
  };

  const handleCommandSubmit = async (data) => {
    setIsProcessing(true);
    setProgress(0);
    setWsLog(prev => [...prev, `Sending command: ${data.commandText}`]);
    console.log('Command submitted from JoeScreen:', data);

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

  return (
    <div className="min-h-screen bg-bgDark">
      <Navbar onToggleJoeScreen={() => setIsJoeScreenOpen(!isJoeScreenOpen)} />
      <main className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
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
