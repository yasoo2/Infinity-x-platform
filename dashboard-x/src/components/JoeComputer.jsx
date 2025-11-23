import React, { useState } from 'react';
import Draggable from 'react-draggable';

const JoeComputer = ({ onClose }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [url, setUrl] = useState('about:blank');
  const [inputUrl, setInputUrl] = useState('');

  return (
    <Draggable handle=".handle">
      <div
        style={{
          position: 'fixed',
          bottom: isExpanded ? '0' : '20px',
          right: isExpanded ? '0' : '20px',
          width: isExpanded ? '100%' : '500px',
          height: isExpanded ? '100%' : '400px',
          backgroundColor: '#1a1a2e',
          border: '2px solid #00d4ff',
          borderRadius: isExpanded ? '0' : '8px',
          boxShadow: '0 4px 30px rgba(0, 212, 255, 0.4)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          transition: 'all 0.3s ease',
          opacity: 1,
          transform: 'scale(1)'
        }}
      >
        {/* Header (Draggable Handle) */}
        <div
          className="handle"
          style={{
            backgroundColor: '#0f3460',
            padding: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #00d4ff',
            cursor: 'move'
          }}
        >
          <div style={{ color: '#00d4ff', fontWeight: 'bold', fontSize: '14px' }}>
            🖥️ Joe Computer
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              style={{
                backgroundColor: '#00d4ff',
                color: '#1a1a2e',
                border: 'none',
                borderRadius: '4px',
                padding: '5px 10px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 'bold'
              }}
            >
              {isExpanded ? 'Restore' : 'Maximize'}
            </button>
            <button
              onClick={onClose} // Use the passed onClose function
              style={{
                backgroundColor: '#ff4757',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '5px 10px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 'bold'
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* URL Bar */}
        <div
          style={{
            backgroundColor: '#16213e',
            padding: '8px',
            display: 'flex',
            gap: '8px',
            borderBottom: '1px solid #00d4ff'
          }}
        >
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') setUrl(inputUrl);
            }}
            placeholder="Note: Many sites won't load due to security."
            style={{
              flex: 1,
              backgroundColor: '#1a1a2e',
              color: '#00d4ff',
              border: '1px solid #00d4ff',
              borderRadius: '4px',
              padding: '8px',
              fontSize: '12px',
              outline: 'none'
            }}
          />
          <button
            onClick={() => setUrl(inputUrl)}
            style={{
              backgroundColor: '#00d4ff',
              color: '#1a1a2e',
              border: 'none',
              borderRadius: '4px',
              padding: '8px 16px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 'bold'
            }}
          >
            Load
          </button>
        </div>

        {/* Browser Frame */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <iframe
            src={url}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              backgroundColor: '#f0f0f0'
            }}
            title="Joe Computer Browser"
            sandbox="allow-scripts allow-forms"
          />
        </div>
      </div>
    </Draggable>
  );
};

export default JoeComputer;
