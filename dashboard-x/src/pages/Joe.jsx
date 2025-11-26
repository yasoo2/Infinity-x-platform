import React, { useState } from 'react';
import TopBar from '../components/joe/TopBar';
// import ActivityBar from '../components/joe/ActivityBar'; // Removed as per user request
// import SidePanel from '../components/joe/SidePanel'; // Removed as per user request
import MainConsole from '../components/joe/MainConsole';
import RightPanel from '../components/joe/RightPanel';
import BottomPanel from '../components/joe/BottomPanel';
import { useJoeChat } from '../hooks/useJoeChat';

const Joe = () => {
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false); // Left sidebar removed
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [isBottomPanelOpen, setIsBottomPanelOpen] = useState(false); // Hidden by default

  const { 
    conversations, 
    currentConversation, 
    handleConversationSelect, 
    handleNewConversation,
    isProcessing,
    plan,
    wsLog,
  } = useJoeChat();

  // const toggleSidePanel = () => setIsSidePanelOpen(!isSidePanelOpen); // Removed as sidebar is removed
  const toggleRightPanel = () => setIsRightPanelOpen(!isRightPanelOpen);
  const toggleBottomPanel = () => setIsBottomPanelOpen(!isBottomPanelOpen);

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-900 text-white overflow-hidden">
        {/* Top Bar - Enhanced */}
      <TopBar 
        onToggleRight={toggleRightPanel}
        onToggleBottom={toggleBottomPanel}
        isRightOpen={isRightPanelOpen}
        isBottomOpen={isBottomPanelOpen}
      />
      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
{/* Left Sidebar (ActivityBar and SidePanel) removed as per user request. */}
        {/* Main Console - Center (Flexible) */}}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className={`flex-1 overflow-hidden ${isBottomPanelOpen ? '' : 'h-full'}`}>
            <MainConsole />
          </div>

          {/* Bottom Panel - Logs (Collapsible) */}
          {isBottomPanelOpen && (
            <div className="h-48 border-t border-gray-800 bg-gray-900 flex-shrink-0">
              <BottomPanel logs={wsLog} />
            </div>
          )}
        </div>

        {/* Right Panel - Plan & Tools (Collapsible) */}
        {isRightPanelOpen && (
          <div className="w-80 border-l border-gray-800 bg-gray-900 flex-shrink-0">
            <RightPanel isProcessing={isProcessing} plan={plan} />
          </div>
        )}
      </div>
    </div>
  );
};

export default Joe;
