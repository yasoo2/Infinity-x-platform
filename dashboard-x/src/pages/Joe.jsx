
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
    handleNewConversation 
  } = useJoeChat();

  const toggleSidePanel = () => {
    setIsSidePanelOpen(!isSidePanelOpen);
  };

  // Define the grid layout dynamically based on side panel state
  const gridLayout = `
    .joe-layout {
      display: grid;
      height: 100vh;
      grid-template-columns: ${isSidePanelOpen ? 'auto auto 1fr auto' : 'auto 1fr auto'}; /* activity, side, main, right */
      grid-template-rows: auto 1fr auto; /* top, main, bottom */
      grid-template-areas:
        "top top top top"
        "activity ${isSidePanelOpen ? 'side' : 'main'} main right"
        "activity ${isSidePanelOpen ? 'side' : 'bottom'} bottom right";
    }
    /* Mobile adjustments would go here */
  `;

  return (
    <div className="h-screen text-white font-sans bg-gray-800 joe-layout">
      <style>{gridLayout}</style>

      <TopBar />
      
      {/* Pass the toggle function to ActivityBar */}
      <ActivityBar onChatClick={toggleSidePanel} /> 

      {/* Conditionally render SidePanel */}
      {isSidePanelOpen && (
        <SidePanel 
          conversations={conversations} 
          currentConversationId={currentConversation}
          onConversationSelect={handleConversationSelect}
          onNewConversation={handleNewConversation}
        />
      )}

      <MainConsole />
      <RightPanel />
      <BottomPanel />
    </div>
  );
};

export default Joe;
