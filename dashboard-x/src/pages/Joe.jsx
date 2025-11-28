import React, { useEffect, useState } from 'react';
import TopBar from '../components/joe/TopBar';
import SidePanel from '../components/joe/SidePanel';
import MainConsole from '../components/joe/MainConsole';
import RightPanel from '../components/joe/RightPanel';
import BottomPanel from '../components/joe/BottomPanel';
import { JoeChatProvider, useJoeChatContext } from '../context/JoeChatContext';

const JoeContent = () => {
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [isBottomPanelOpen, setIsBottomPanelOpen] = useState(false);
  const [isStatusPanelOpen, setIsStatusPanelOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isBorderSettingsOpen, setIsBorderSettingsOpen] = useState(false);
  const [panelStyles, setPanelStyles] = useState({ left: { color: '#1f2937', width: 1, radius: 0 }, right: { color: '#1f2937', width: 1, radius: 0 } });
  const [leftWidth, setLeftWidth] = useState(288);
  const [rightWidth, setRightWidth] = useState(320);
  const [dragLeft, setDragLeft] = useState(false);
  const [dragRight, setDragRight] = useState(false);

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 768);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    if (isMobile) {
      setIsSidePanelOpen(false);
      setIsRightPanelOpen(false);
    }
  }, [isMobile]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('joePanelBorders');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.left && parsed?.right) setPanelStyles(parsed);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('joePanelBorders', JSON.stringify(panelStyles));
    } catch {}
  }, [panelStyles]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('joePanelWidths');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.left) setLeftWidth(parsed.left);
        if (parsed?.right) setRightWidth(parsed.right);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('joePanelWidths', JSON.stringify({ left: leftWidth, right: rightWidth }));
    } catch {}
  }, [leftWidth, rightWidth]);

  const { 
    conversations: conversationsList, 
    currentConversationId, 
    handleConversationSelect, 
    handleNewConversation,
    isProcessing,
    plan,
    wsLog,
    renameConversation,
    deleteConversation,
    pinToggle,
    duplicateConversation,
    clearMessages,
  } = useJoeChatContext();

  const toggleSidePanel = () => setIsSidePanelOpen(!isSidePanelOpen);
  const toggleRightPanel = () => setIsRightPanelOpen(!isRightPanelOpen);
  const toggleBottomPanel = () => setIsBottomPanelOpen(!isBottomPanelOpen);
  const toggleStatusPanel = () => {
    setIsRightPanelOpen(prev => {
      const next = !prev;
      setIsStatusPanelOpen(next);
      return next;
    });
  };
  const toggleBorderSettings = () => setIsBorderSettingsOpen(!isBorderSettingsOpen);

  const leftStyle = { borderRight: `${panelStyles.left.width}px solid ${panelStyles.left.color}`, borderRadius: panelStyles.left.radius };
  const rightStyle = { borderLeft: `${panelStyles.right.width}px solid ${panelStyles.right.color}`, borderRadius: panelStyles.right.radius };
  const setStyle = (side, key, value) => {
    setPanelStyles(prev => ({ ...prev, [side]: { ...prev[side], [key]: value } }));
  };

  useEffect(() => {
    const onMove = (e) => {
      const min = 200;
      const max = 600;
      if (dragLeft) {
        const w = Math.max(min, Math.min(max, e.clientX));
        setLeftWidth(w);
      }
      if (dragRight) {
        const w = Math.max(min, Math.min(max, window.innerWidth - e.clientX));
        setRightWidth(w);
      }
    };
    const onUp = () => {
      setDragLeft(false);
      setDragRight(false);
    };
    if (dragLeft || dragRight) {
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';
    }
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [dragLeft, dragRight]);

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-900 text-white overflow-hidden">
        {/* Top Bar - Enhanced */}
      <TopBar 
        onToggleRight={toggleRightPanel}
        onToggleBottom={toggleBottomPanel}
        isRightOpen={isRightPanelOpen}
        isBottomOpen={isBottomPanelOpen}
        onToggleLeft={toggleSidePanel}
        isLeftOpen={isSidePanelOpen}
        onToggleStatus={toggleStatusPanel}
        isStatusOpen={isStatusPanelOpen}
        onToggleBorderSettings={toggleBorderSettings}
        isBorderSettingsOpen={isBorderSettingsOpen}
      />
      {isBorderSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-xl p-6">
            <h3 className="text-white text-lg font-bold mb-4">Panel Border Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-400 mb-3">Left Panel</p>
                <div className="space-y-3">
                  <label className="block text-xs text-gray-400">Color</label>
                  <input type="color" value={panelStyles.left.color} onChange={(e)=>setStyle('left','color', e.target.value)} className="w-16 h-8" />
                  <label className="block text-xs text-gray-400">Width</label>
                  <input type="range" min="0" max="8" value={panelStyles.left.width} onChange={(e)=>setStyle('left','width', Number(e.target.value))} />
                  <label className="block text-xs text-gray-400">Radius</label>
                  <input type="range" min="0" max="20" value={panelStyles.left.radius} onChange={(e)=>setStyle('left','radius', Number(e.target.value))} />
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-3">Right Panel</p>
                <div className="space-y-3">
                  <label className="block text-xs text-gray-400">Color</label>
                  <input type="color" value={panelStyles.right.color} onChange={(e)=>setStyle('right','color', e.target.value)} className="w-16 h-8" />
                  <label className="block text-xs text-gray-400">Width</label>
                  <input type="range" min="0" max="8" value={panelStyles.right.width} onChange={(e)=>setStyle('right','width', Number(e.target.value))} />
                  <label className="block text-xs text-gray-400">Radius</label>
                  <input type="range" min="0" max="20" value={panelStyles.right.radius} onChange={(e)=>setStyle('right','radius', Number(e.target.value))} />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={()=>setIsBorderSettingsOpen(false)} className="px-4 py-2 bg-gray-800 text-white rounded-md">Close</button>
            </div>
          </div>
        </div>
      )}
      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Removed ActivityBar to free space and use TopBar toggles */}
        {isSidePanelOpen && !isMobile && (
          <div className={`relative z-10 bg-gray-900 flex-shrink-0 ${panelStyles.left.width === 0 ? 'border-r border-gray-800' : ''}`} style={{ ...leftStyle, width: leftWidth }}>
            <SidePanel 
              conversations={conversationsList} 
              currentConversationId={currentConversationId}
              onConversationSelect={handleConversationSelect}
              onNewConversation={handleNewConversation}
              onRenameConversation={renameConversation}
              onDeleteConversation={deleteConversation}
              onPinToggle={pinToggle}
              onDuplicate={duplicateConversation}
              onClear={clearMessages}
            />
            <div
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setDragLeft(true); }}
              onSelectStart={(e) => e.preventDefault()}
              className="absolute top-0 right-0 h-full cursor-col-resize z-20 select-none"
              style={{ width: '2px', background: 'rgba(107,114,128,0.5)' }}
            />
          </div>
        )}
        {isSidePanelOpen && isMobile && (
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setIsSidePanelOpen(false)}>
            <div className={`absolute left-0 top-14 bottom-0 w-[85%] max-w-xs bg-gray-900 ${panelStyles.left.width === 0 ? 'border-r border-gray-800' : ''}`} style={leftStyle} onClick={(e)=>e.stopPropagation()}>
              <SidePanel 
                conversations={conversationsList} 
                currentConversationId={currentConversationId}
                onConversationSelect={handleConversationSelect}
                onNewConversation={handleNewConversation}
                onRenameConversation={renameConversation}
                onDeleteConversation={deleteConversation}
                onPinToggle={pinToggle}
                onDuplicate={duplicateConversation}
                onClear={clearMessages}
              />
            </div>
          </div>
        )}
        {/* Main Console - Center (Flexible) */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className={`flex-1 overflow-hidden ${isBottomPanelOpen ? '' : 'h-full'}`}>
            <MainConsole key={currentConversationId} />
          </div>

          {/* Bottom Panel - Logs (Collapsible) */}
          {isBottomPanelOpen && (
            <div className="h-48 border-t border-gray-800 bg-gray-900 flex-shrink-0">
              <BottomPanel logs={wsLog} />
            </div>
          )}
        </div>

        {/* Right Panel - Plan & Tools (Collapsible) */}
        {isRightPanelOpen && !isMobile && (
          <div className="relative z-10 bg-gray-900 flex-shrink-0" style={{ ...rightStyle, width: rightWidth }}>
            <RightPanel isProcessing={isProcessing} plan={plan} forceStatus={isStatusPanelOpen} />
            <div
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setDragRight(true); }}
              onSelectStart={(e) => e.preventDefault()}
              className="absolute top-0 left-0 h-full cursor-col-resize z-20 select-none"
              style={{ width: '2px', background: 'rgba(107,114,128,0.5)' }}
            />
          </div>
        )}
        {isRightPanelOpen && isMobile && (
          <div className="fixed inset-0 z-40" onClick={()=>setIsRightPanelOpen(false)}>
            <div className="absolute right-0 top-14 bottom-0 w-[85%] max-w-xs bg-gray-900" style={rightStyle} onClick={(e)=>e.stopPropagation()}>
              <RightPanel isProcessing={isProcessing} plan={plan} forceStatus={isStatusPanelOpen} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Joe = () => (
  <JoeChatProvider>
    <JoeContent />
  </JoeChatProvider>
);

export default Joe;
