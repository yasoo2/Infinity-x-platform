import React, { useState } from 'react';
import JoeComputer from './JoeComputer';

const JoeOS = () => {
  const [isComputerOpen, setIsComputerOpen] = useState(false);

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: '#0a0a1a', // Dark, rich blue background
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end', // Aligns the dock to the bottom
        overflow: 'hidden'
      }}
    >
      {/* Main Desktop Area */}
      <div style={{ flex: 1 }}>
        {/* Open windows will be rendered here */}
        {isComputerOpen && <JoeComputer onClose={() => setIsComputerOpen(false)} />}
      </div>

      {/* The Dock */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          padding: '10px',
          backgroundColor: 'rgba(0, 0, 0, 0.4)', // Translucent background
          backdropFilter: 'blur(10px)', // Frosted glass effect
          borderTop: '1px solid rgba(0, 212, 255, 0.2)'
        }}
      >
        {/* Dock Icons */}
        <div
          onClick={() => setIsComputerOpen(true)}
          style={{
            cursor: 'pointer',
            textAlign: 'center',
            padding: '10px',
            borderRadius: '8px',
            transition: 'background-color 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(0, 212, 255, 0.2)'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <span style={{ fontSize: '40px', display: 'block' }}>🖥️</span>
          <span style={{ fontSize: '12px' }}>Computer</span>
        </div>

        {/* Add other tool icons here in the future */}
      </div>
    </div>
  );
};

export default JoeOS;
