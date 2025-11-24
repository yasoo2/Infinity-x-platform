
import React, { useState } from 'react';
import TopBar from '../components/joe/TopBar';
import ActivityBar from '../components/joe/ActivityBar';
import SidePanel from '../components/joe/SidePanel';
import MainConsole from '../components/joe/MainConsole';
import RightPanel from '../components/joe/RightPanel';
import BottomPanel from '../components/joe/BottomPanel';
import { useJoeChat } from '../hooks/useJoeChat';

const Joe = () => {
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(true); // Default to open

  const { 
    conversations, 
    currentConversation, 
    handleConversationSelect, 
    handleNewConversation,
    isProcessing,
    plan, // <-- Get the plan data
    wsLog, // <-- Get WebSocket logs
  } = useJoeChat();

  const toggleSidePanel = () => {
    setIsSidePanelOpen(!isSidePanelOpen);
  };

  // Dynamically adjust grid layout based on side panel state
  const gridLayout = `
    .joe-layout {
      display: grid;
      height: 100vh;
      grid-template-columns: ${isSidePanelOpen ? 'auto auto 1fr auto' : 'auto 1fr auto'};
      grid-template-rows: auto 1fr auto;
      grid-template-areas:
        "top top top top"
        "activity ${isSidePanelOpen ? 'side main main' : 'main main main'} right"
        "activity ${isSidePanelOpen ? 'side bottom bottom' : 'bottom bottom bottom'} right";
    }
    /* Further responsive adjustments can be made here */
  `;

  return (
    <div className="h-screen text-white font-sans bg-gray-800 joe-layout">
      <style>{gridLayout.replace(/\s+/g, ' ').trim()}</style>

      <TopBar />
      
      <ActivityBar onChatClick={toggleSidePanel} isSidePanelOpen={isSidePanelOpen} />

      {isSidePanelOpen && (
        <SidePanel 
          conversations={conversations} 
          currentConversationId={currentConversation}
          onConversationSelect={handleConversationSelect}
          onNewConversation={handleNewConversation}
        />
      )}

      <MainConsole />
      
      {/* Pass the new data to RightPanel and BottomPanel */}
      <RightPanel isProcessing={isProcessing} plan={plan} />
      <BottomPanel logs={wsLog} />

    </div>
  );
};

export default Joe;
