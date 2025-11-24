
import React from 'react';

const BottomPanel = () => {
  return (
    <div className="bg-gray-900 h-48 flex-shrink-0 p-4" style={{ gridArea: 'bottom' }}>
      <h2 className="text-lg font-bold text-white mb-4">Logs & Jobs</h2>
      <div className="text-gray-300">Bottom Panel Content</div>
    </div>
  );
};

export default BottomPanel;
