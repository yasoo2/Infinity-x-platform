import React, { useState, useEffect, useRef } from 'react';
import { Maximize, Minimize, MousePointer, X, RefreshCw, Loader, ExternalLink } from 'lucide-react';
import Draggable from 'react-draggable';

// This component simulates the Manus Computer feature (Browser Viewer)
const JoeComputer = ({ isVisible, onClose, onTakeover, initialUrl = 'about:blank' }) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [url, setUrl] = useState(initialUrl);
  const [isLoading, setIsLoading] = useState(false);
  const [isTakeoverActive, setIsTakeoverActive] = useState(false);
  const iframeRef = useRef(null);

  useEffect(() => {
    if (isVisible) {
      // Focus the component when it becomes visible
      // In a real scenario, this would involve connecting to a backend service
      // that manages the browser session and streams the content.
      // For this simulation, we'll just set the initial URL.
      if (url === 'about:blank') {
        setUrl('https://www.google.com'); // Default starting page
      }
    }
  }, [isVisible, url]);

  const handleMaximize = () => {
    setIsMaximized(!isMaximized);
  };

  const handleTakeover = () => {
    setIsTakeoverActive(true);
    // In a real scenario, this would send a command to the backend
    // to allow the user to interact with the browser session.
    // For now, we'll just simulate the state change.
    if (onTakeover) {
      onTakeover();
    }
  };

  const handleRefresh = () => {
    setIsLoading(true);
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
    }
    setTimeout(() => setIsLoading(false), 1500); // Simulate loading time
  };

  const handleUrlChange = (e) => {
    if (e.key === 'Enter') {
      let newUrl = e.target.value;
      if (!newUrl.startsWith('http://') && !newUrl.startsWith('https://')) {
        newUrl = 'https://' + newUrl;
      }
      setUrl(newUrl);
      handleRefresh();
    }
  };

  if (!isVisible) return null;

  const windowClasses = isMaximized
    ? 'fixed inset-0 z-50 rounded-none'
    : 'fixed bottom-20 right-4 z-50 w-[400px] h-[300px] rounded-xl shadow-2xl';

  const headerClasses = 'flex justify-between items-center p-2 bg-gray-800 border-b border-gray-700 rounded-t-xl';

  return (
    <Draggable handle=".handle" disabled={isMaximized}>
      <div className={`${windowClasses} bg-gray-900 border border-gray-700 flex flex-col transition-all duration-300`}>
        {/* Header/Title Bar */}
        <div className={`${headerClasses} ${isMaximized ? 'rounded-t-none' : ''} handle cursor-move`}>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-bold text-cyan-400">💻 Joe Computer</span>
            {isLoading && <Loader className="w-4 h-4 text-fuchsia-400 animate-spin" />}
          </div>
          <div className="flex space-x-1">
            <button
              onClick={handleTakeover}
              className={`p-1 rounded-full transition-colors ${isTakeoverActive ? 'bg-green-500 text-white' : 'text-gray-400 hover:bg-gray-700'}`}
              title={isTakeoverActive ? 'Takeover Active' : 'Takeover Control'}
            >
              <MousePointer className="w-4 h-4" />
            </button>
            <button
              onClick={handleMaximize}
              className="p-1 text-gray-400 hover:bg-gray-700 rounded-full transition-colors"
              title={isMaximized ? 'Minimize' : 'Maximize'}
            >
              {isMaximized ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-1 text-red-400 hover:bg-red-500 hover:text-white rounded-full transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* URL Bar and Controls */}
        <div className="flex p-2 bg-gray-800 border-b border-gray-700 flex-shrink-0">
          <button
            onClick={handleRefresh}
            className="p-1 text-gray-400 hover:bg-gray-700 rounded-lg transition-colors mr-2"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={handleUrlChange}
            placeholder="Enter URL"
            className="flex-1 bg-gray-700 text-white text-sm p-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 text-gray-400 hover:bg-gray-700 rounded-lg transition-colors ml-2"
            title="Open in New Tab"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        {/* Browser Content (Iframe) */}
        <div className="flex-1 overflow-hidden">
          <iframe
            ref={iframeRef}
            src={url}
            title="Joe Computer Browser"
            className="w-full h-full border-0"
            onLoad={() => setIsLoading(false)}
            onError={() => setIsLoading(false)}
          ></iframe>
        </div>
      </div>
    </Draggable>
  );
};

export default JoeComputer;
