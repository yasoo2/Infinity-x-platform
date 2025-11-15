import React, { useEffect, useState } from 'react';
import { connectWebSocket, disconnectWebSocket } from '../utils/websocket';
import { apiRequest } from '../utils/api';

const AgentPanel = () => {
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const ws = connectWebSocket(
      (message) => {
        if (message.output) {
          setOutput((prev) => prev + '\n' + message.output);
        }
      },
      () => console.log('WebSocket connected'),
      () => console.log('WebSocket disconnected')
    );

    return () => disconnectWebSocket();
  }, []);

  const executeCode = async (code) => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiRequest('/joe/chat-advanced', {
        method: 'POST',
        body: JSON.stringify({ code }),
      });
      setOutput(result.output || 'No output');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="agent-panel">
      {error && <div className="error-message">خطأ: {error}</div>}
      <pre className="output">{output}</pre>
      {loading && <div className="loading">جاري التنفيذ...</div>}
    </div>
  );
};

export default AgentPanel;
