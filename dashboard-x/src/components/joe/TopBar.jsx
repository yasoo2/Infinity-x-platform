import React from 'react';
import { FiTerminal, FiMaximize2, FiLogOut } from 'react-icons/fi'; // Replaced FiSidebar with FiLogOut

import { useSessionToken } from '../../hooks/useSessionToken'; // Import hook for token clearing
import { useNavigate } from 'react-router-dom'; // Import hook for navigation

const TopBar = ({ onToggleRight, onToggleBottom, isRightOpen, isBottomOpen }) => {
  const { clearToken } = useSessionToken();
  const navigate = useNavigate();

  const handleExit = () => {
    clearToken();
    // Redirect to the root of the domain, which is the public site
    window.location.href = '/';
  };
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
        {/* Exit Button (Replaces Toggle Right Panel) */}
        <button
          onClick={handleExit}
          className={`p-2 rounded-lg transition-colors bg-red-600 text-white hover:bg-red-700`}
          title="Exit to Home (Logout)"
        >
          <FiLogOut size={18} />
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
