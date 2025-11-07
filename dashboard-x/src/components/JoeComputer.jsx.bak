import React, { useState, useRef } from 'react';
import { Maximize, Minimize, X, Monitor, MousePointer, RefreshCw, ExternalLink, Loader } from 'lucide-react';
import Draggable from 'react-draggable';

const JoeComputer = ({ isVisible, onClose, onTakeover }) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isControlled, setIsControlled] = useState(false);
  const [url, setUrl] = useState('https://www.google.com');
  const [inputUrl, setInputUrl] = useState(url);
  const [isLoading, setIsLoading] = useState(false);
  const iframeRef = useRef(null);

  if (!isVisible) return null;

  const handleMaximize = () => {
    setIsMaximized(!isMaximized);
  };

  const handleControl = () => {
    setIsControlled(!isControlled);
    if (!isControlled) {
      onTakeover();
    }
  };

  const handleUrlChange = (e) => {
    setInputUrl(e.target.value);
  };

  const handleGo = () => {
    let newUrl = inputUrl;
    if (!newUrl.startsWith('http://') && !newUrl.startsWith('https://')) {
      newUrl = 'https://' + newUrl;
    }
    setUrl(newUrl);
    setIsLoading(true);
  };

  const handleRefresh = () => {
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
      setIsLoading(true);
    }
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  const containerClasses = isMaximized
    ? "fixed inset-0 z-[100] p-4 bg-gray-900/95 backdrop-blur-sm"
    : "fixed bottom-20 right-4 w-96 h-64 z-50 shadow-2xl rounded-lg overflow-hidden transition-all duration-300";

  const windowClasses = isMaximized
    ? 'fixed inset-0 z-50 rounded-none'
    : 'w-[400px] h-[300px] rounded-xl shadow-2xl';

  const headerClasses = 'flex justify-between items-center p-2 bg-gray-800 border-b border-gray-700 rounded-t-xl handle cursor-move';

  return (
    <Draggable handle=".handle" disabled={isMaximized}>
      <div className={`${windowClasses} bg-gray-900 border border-cyan-500/50 flex flex-col transition-all duration-300`}>
        {/* Header/Title Bar */}
        <div className={headerClasses}>
          <div className="flex items-center space-x-2">
            <Monitor className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-bold text-white">Joe Computer</span>
            {isLoading && <Loader className="w-4 h-4 text-fuchsia-400 animate-spin" />}
          </div>
          <div className="flex space-x-1">
            <button
              onClick={handleControl}
              title={isControlled ? 'Release Control' : 'Take Control'}
              className={`p-1 rounded-full transition-colors duration-200 ${
                isControlled ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-600 hover:bg-gray-700'
              }`}
            >
              <MousePointer className="w-3 h-3 text-white" />
            </button>
            <button
              onClick={handleMaximize}
              title={isMaximized ? 'Minimize' : 'Maximize'}
              className="p-1 rounded-full bg-fuchsia-500 hover:bg-fuchsia-600 transition-colors duration-200"
            >
              {isMaximized ? <Minimize className="w-3 h-3 text-white" /> : <Maximize className="w-3 h-3 text-white" />}
            </button>
            <button
              onClick={onClose}
              title="Close"
              className="p-1 rounded-full bg-red-500 hover:bg-red-600 transition-colors duration-200"
            >
              <X className="w-3 h-3 text-white" />
            </button>
          </div>
        </div>

        {/* URL Bar */}
        <div className="flex p-1 bg-gray-700 items-center space-x-1 flex-shrink-0">
          <button
            onClick={handleRefresh}
            className="p-1 text-gray-400 hover:bg-gray-600 rounded-md transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <input
            type="text"
            value={inputUrl}
            onChange={handleUrlChange}
            onKeyDown={(e) => e.key === 'Enter' && handleGo()}
            className="flex-1 p-1 text-xs bg-gray-600 text-white rounded-md focus:outline-none focus:ring-1 focus:ring-cyan-400"
            placeholder="Enter URL..."
          />
          <button
            onClick={handleGo}
            className="px-2 py-1 bg-cyan-500 hover:bg-cyan-600 text-white text-xs rounded-md transition-colors duration-200"
          >
            Go
          </button>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 text-gray-400 hover:bg-gray-600 rounded-md transition-colors"
            title="Open in New Tab"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        {/* Iframe Content */}
        <div className="flex-1 overflow-hidden">
          <iframe
            ref={iframeRef}
            src={url}
            title="Joe Computer Browser"
            className="w-full h-full border-0"
            onLoad={handleLoad}
            onError={handleLoad}
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        </div>
      </div>
    </Draggable>
  );
};

export default JoeComputer;
