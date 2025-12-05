
import React from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { FiHome, FiMessageSquare, FiTool, FiBriefcase, FiClipboard, FiSettings } from 'react-icons/fi';

const ActivityBar = ({ onChatClick, isSidePanelOpen, onToggleRight, onToggleBottom }) => {
  const navigate = useNavigate();
  const icons = [
    { icon: <FiHome />, label: 'Home', action: () => navigate('/dashboard/overview'), active: false },
    { icon: <FiMessageSquare />, label: 'Chats', action: onChatClick, active: isSidePanelOpen },
    { icon: <FiTool />, label: 'Tools', action: onToggleRight, active: false },
    { icon: <FiBriefcase />, label: 'Jobs', action: () => {}, active: false },
    { icon: <FiClipboard />, label: 'Logs', action: onToggleBottom, active: false },
    // Settings icon will likely be at the bottom in many UIs
  ];

  return (
    <div className="bg-gray-950 w-14 flex-shrink-0 flex flex-col items-center py-4" style={{ gridArea: 'activity' }}>
      <div className="flex flex-col items-center space-y-6 flex-1">
        {icons.map((item, index) => (
          <button 
            key={index} 
            title={item.label} 
            onClick={item.action}
            className={`p-2 rounded-lg transition-colors duration-200 ${
              item.active
                ? 'text-black bg-yellow-600/60' 
                : 'text-gray-400 hover:text-yellow-400 hover:bg-gray-700/50'
            }`}
          >
            {React.cloneElement(item.icon, { size: 24 })}
          </button>
        ))}
      </div>
      <div className="mt-auto">
         <button title="Settings" className="text-gray-400 hover:text-yellow-400 p-2">
            <FiSettings size={24} />
         </button>
      </div>
    </div>
  );
};

export default ActivityBar;

ActivityBar.propTypes = {
  onChatClick: PropTypes.func.isRequired,
  isSidePanelOpen: PropTypes.bool.isRequired,
  onToggleRight: PropTypes.func.isRequired,
  onToggleBottom: PropTypes.func.isRequired,
};
