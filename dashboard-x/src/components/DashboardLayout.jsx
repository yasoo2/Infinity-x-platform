import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import Navbar from './Navbar';
import JoeScreen from './JoeScreen';
import TaskProgress from './TaskProgress';

export default function DashboardLayout() {
  const [isJoeScreenOpen, setIsJoeScreenOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(true); // Placeholder
  const [progress, setProgress] = useState(50); // Placeholder
  const [wsLog, setWsLog] = useState([]); // Placeholder

  const handleTakeover = () => {
    // Logic to handle user takeover
    console.log('User has taken over the Joe screen.');
  };

  const handleCloseJoeScreen = () => {
    setIsJoeScreenOpen(false);
  };

  return (
    <div className="min-h-screen bg-bgDark">
      <Navbar onToggleJoeScreen={() => setIsJoeScreenOpen(!isJoeScreenOpen)} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
      {isJoeScreenOpen && (
        <JoeScreen
          isProcessing={isProcessing}
          progress={progress}
          wsLog={wsLog}
          onTakeover={handleTakeover}
          onClose={handleCloseJoeScreen}
        />
      )}
      <TaskProgress />
    </div>
  );
}
