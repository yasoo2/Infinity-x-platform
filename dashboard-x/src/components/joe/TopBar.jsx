import React from 'react';
import { FiSidebar, FiTerminal, FiMaximize2, FiMinimize2 } from 'react-icons/fi';

const TopBar = ({ onToggleRight, onToggleBottom, isRightOpen, isBottomOpen }) => {
  return (
    <div className="bg-gray-900 h-14 flex-shrink-0 flex items-center justify-between px-6 border-b border-gray-800">
      {/* Left: Title */}
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-bold text-white">JOE</h1>
        <span className="text-sm text-gray-500">•</span>
        <span className="text-sm text-gray-400">Infinity-X Platform</span>
      </div>

      {/* Right: Control Buttons */}
      <div className="flex items-center gap-2">
        {/* Toggle Right Panel */}
        <button
          onClick={onToggleRight}
          className={`p-2 rounded-lg transition-colors ${
            isRightOpen 
              ? 'bg-blue-600 text-white hover:bg-blue-700' 
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
          title={isRightOpen ? "Hide Plan Panel" : "Show Plan Panel"}
        >
          <FiSidebar size={18} />
        </button>

        {/* Toggle Bottom Panel */}
        <button
          onClick={onToggleBottom}
          className={`p-2 rounded-lg transition-colors ${
            isBottomOpen 
              ? 'bg-blue-600 text-white hover:bg-blue-700' 
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
          title={isBottomOpen ? "Hide Logs Panel" : "Show Logs Panel"}
        >
          <FiTerminal size={18} />
        </button>

        {/* Fullscreen Toggle (Optional) */}
        <button
          onClick={() => {
            if (document.fullscreenElement) {
              document.exitFullscreen();
            } else {
              document.documentElement.requestFullscreen();
            }
          }}
          className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:bg-gray-700 transition-colors"
          title="Toggle Fullscreen"
        >
          <FiMaximize2 size={18} />
        </button>
      </div>
    </div>
  );
};

export default TopBar;
