import React, { useState } from 'react';

/**
 * JoeComputer - متصفح مدمج مشابه لـ "كمبيوتر مانوس"
 */
const JoeComputer = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [url, setUrl] = useState('https://www.google.com');
  const [inputUrl, setInputUrl] = useState('https://www.google.com');

  if (!isVisible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: isExpanded ? '0' : '20px',
        right: isExpanded ? '0' : '20px',
        width: isExpanded ? '100%' : '400px',
        height: isExpanded ? '100%' : '300px',
        backgroundColor: '#1a1a2e',
        border: '2px solid #00d4ff',
        borderRadius: isExpanded ? '0' : '8px',
        boxShadow: '0 4px 20px rgba(0, 212, 255, 0.3)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s ease'
      }}
    >
      {/* Header */}
      <div
        style={{
          backgroundColor: '#0f3460',
          padding: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #00d4ff'
        }}
      >
        <div style={{ color: '#00d4ff', fontWeight: 'bold', fontSize: '14px' }}>
          🖥️ كمبيوتر جو
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
            {isExpanded ? '🗗 تصغير' : '🗖 تكبير'}
          </button>
          <button
            onClick={() => setIsVisible(false)}
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
            if (e.key === 'Enter') {
              setUrl(inputUrl);
            }
          }}
          placeholder="أدخل الرابط..."
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
          ↻ تحديث
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
            backgroundColor: 'white'
          }}
          title="Joe Computer Browser"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
        />
      </div>
    </div>
  );
};

export default JoeComputer;
