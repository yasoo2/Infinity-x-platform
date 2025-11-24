
import React from 'react';
import { FiHome, FiMessageSquare, FiTool, FiBriefcase, FiClipboard, FiSettings } from 'react-icons/fi';

const ActivityBar = ({ onChatClick }) => {
  const icons = [
    { icon: <FiHome />, label: 'Home', action: () => {} },
    { icon: <FiMessageSquare />, label: 'Chats', action: onChatClick },
    { icon: <FiTool />, label: 'Tools', action: () => {} },
    { icon: <FiBriefcase />, label: 'Jobs', action: () => {} },
    { icon: <FiClipboard />, label: 'Logs', action: () => {} },
    { icon: <FiSettings />, label: 'Settings', action: () => {} },
  ];

  return (
    <div className="bg-gray-950 w-12 flex-shrink-0 flex flex-col items-center py-4 space-y-6" style={{ gridArea: 'activity' }}>
      {icons.map((item, index) => (
        <button 
          key={index} 
          title={item.label} 
          onClick={item.action}
          className="text-gray-400 hover:text-cyan-400 text-2xl"
        >
          {item.icon}
        </button>
      ))}
    </div>
  );
};

export default ActivityBar;
