
import React from 'react';

const RightPanel = () => {
  return (
    <div className="bg-gray-900 w-72 flex-shrink-0 p-4" style={{ gridArea: 'right' }}>
      <h2 className="text-lg font-bold text-white mb-4">Plan & Status</h2>
      <div className="text-gray-300">Right Panel Content</div>
    </div>
  );
};

export default RightPanel;
