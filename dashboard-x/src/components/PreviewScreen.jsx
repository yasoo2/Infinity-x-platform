import { useState, useEffect } from 'react';

/**
 * Preview Screen Component
 * Shows what JOE is doing in real-time (like Manus)
 */
export default function PreviewScreen({ currentStep, progress, actionResult, isProcessing }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    if (currentStep) {
      addLog(`📍 ${currentStep}`, 'step');
    }
  }, [currentStep]);

  useEffect(() => {
    if (actionResult) {
      if (actionResult.success) {
        addLog(`✅ ${actionResult.message || 'Action completed'}`, 'success');
      } else {
        addLog(`❌ ${actionResult.error || 'Action failed'}`, 'error');
      }
    }
  }, [actionResult]);

  const addLog = (message, type = 'info') => {
    const log = {
      id: Date.now() + Math.random(),
      message,
      type,
      timestamp: new Date().toLocaleTimeString('ar-SA')
    };
    setLogs(prev => [...prev, log].slice(-20)); // Keep last 20 logs
  };

  const clearLogs = () => {
    setLogs([]);
  };

  if (!isProcessing && logs.length === 0) {
    return null; // Hide when not active
  }

  return (
    <div
      className={`
        fixed bottom-4 right-4 bg-cardDark border border-borderDim rounded-lg shadow-2xl
        transition-all duration-300 ease-in-out z-50
        ${isExpanded ? 'w-96 h-96' : 'w-80 h-32'}
      `}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-3 border-b border-borderDim cursor-pointer hover:bg-bgDark/50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isProcessing ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
          <span className="text-sm font-semibold">JOE Preview</span>
        </div>
        <div className="flex items-center gap-2">
          {isProcessing && (
            <div className="text-xs text-textDim">{progress}%</div>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="text-textDim hover:text-white transition-colors"
          >
            {isExpanded ? '▼' : '▲'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        {/* Progress Bar */}
        {isProcessing && progress > 0 && (
          <div className="mb-3">
            <div className="w-full bg-bgDark rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-neonGreen to-neonBlue h-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Current Step */}
        {currentStep && (
          <div className="mb-3 p-2 bg-bgDark rounded text-sm">
            <div className="text-textDim text-xs mb-1">Current Step:</div>
            <div className="text-white">{currentStep}</div>
          </div>
        )}

        {/* Logs (when expanded) */}
        {isExpanded && (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-textDim">Activity Logs</div>
              {logs.length > 0 && (
                <button
                  onClick={clearLogs}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  Clear
                </button>
              )}
            </div>

            {logs.length === 0 ? (
              <div className="text-center text-textDim text-sm py-4">
                No activity yet...
              </div>
            ) : (
              logs.map(log => (
                <div
                  key={log.id}
                  className={`
                    text-xs p-2 rounded
                    ${log.type === 'success' ? 'bg-green-500/10 text-green-400' :
                      log.type === 'error' ? 'bg-red-500/10 text-red-400' :
                      log.type === 'step' ? 'bg-blue-500/10 text-blue-400' :
                      'bg-bgDark text-textDim'}
                  `}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">{log.message}</div>
                    <div className="text-xs opacity-50">{log.timestamp}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Collapsed View */}
        {!isExpanded && logs.length > 0 && (
          <div className="text-xs text-textDim">
            {logs[logs.length - 1].message}
          </div>
        )}
      </div>

      {/* Resize Handle */}
      {isExpanded && (
        <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize opacity-50 hover:opacity-100">
          <svg viewBox="0 0 16 16" className="w-full h-full text-textDim">
            <path
              fill="currentColor"
              d="M16 16V14L14 16H16ZM16 12V10L10 16H12L16 12ZM16 8V6L6 16H8L16 8Z"
            />
          </svg>
        </div>
      )}
    </div>
  );
}
