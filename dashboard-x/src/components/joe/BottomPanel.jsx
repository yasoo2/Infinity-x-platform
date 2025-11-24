
import React, { useRef, useEffect } from 'react';
import { FiHardDrive } from 'react-icons/fi';

const BottomPanel = ({ logs }) => {
  const scrollRef = useRef(null);

  useEffect(() => {
    // Scroll to the bottom whenever logs change
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="bg-gray-950 flex flex-col h-48 flex-shrink-0 p-3 border-t border-gray-700/50" style={{ gridArea: 'bottom' }}>
      <h2 className="text-sm font-semibold text-gray-200 mb-2 flex items-center gap-2">
        <FiHardDrive />
        WebSocket Live Log
      </h2>
      <div ref={scrollRef} className="flex-1 overflow-y-auto text-xs font-mono text-gray-400 space-y-1 pr-2">
        {logs && logs.length > 0 ? (
          logs.map((log, index) => <div key={index}>{log}</div>)
        ) : (
          <div>Awaiting connection...</div>
        )}
      </div>
    </div>
  );
};

export default BottomPanel;
