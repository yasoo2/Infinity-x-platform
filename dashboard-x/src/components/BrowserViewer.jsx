import { useState, useEffect, useRef } from 'react';
import apiClient from '../api/client';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://api.xelitesolutions.com';

export default function BrowserViewer({ sessionId, onClose }) {
  const [screenshot, setScreenshot] = useState(null);
  const [url, setUrl] = useState('');
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isUserControlled, setIsUserControlled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const intervalRef = useRef(null);
  const canvasRef = useRef(null);

  // Fetch screenshot periodically
  useEffect(() => {
    if (!sessionId) return;

    const fetchScreenshot = async () => {
      try {
        const response = await apiClient.post(`${API_BASE}/api/browser/screenshot`, {
          sessionId
        });

        if (response.data.ok) {
          setScreenshot(response.data.screenshot);
          setUrl(response.data.url);
          setMousePos(response.data.mousePosition);
        }
      } catch (error) {
        console.error('Screenshot fetch error:', error);
      }
    };

    fetchScreenshot();
    intervalRef.current = setInterval(fetchScreenshot, 1000); // Update every second

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [sessionId]);

  // Draw mouse cursor on canvas
  useEffect(() => {
    if (!canvasRef.current || !screenshot) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      // Draw mouse cursor
      ctx.fillStyle = 'red';
      ctx.beginPath();
      ctx.arc(mousePos.x, mousePos.y, 8, 0, 2 * Math.PI);
      ctx.fill();

      // Draw cursor pointer
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(mousePos.x, mousePos.y, 8, 0, 2 * Math.PI);
      ctx.stroke();
    };

    img.src = screenshot;
  }, [screenshot, mousePos]);

  const toggleControl = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.post(`${API_BASE}/api/browser/toggle-control`, {
        sessionId,
        userControlled: !isUserControlled
      });

      if (response.data.ok) {
        setIsUserControlled(response.data.isUserControlled);
      }
    } catch (error) {
      console.error('Toggle control error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = async () => {
    try {
      await apiClient.post(`${API_BASE}/api/browser/close`, { sessionId });
    } catch (error) {
      console.error('Close error:', error);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
      {/* Header */}
      <div className="bg-cardDark border-b border-borderDim p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-bold">🌐 Browser View</h3>
          <div className="text-sm text-textDim truncate max-w-md">
            {url}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleControl}
            disabled={isLoading}
            className={`
              px-4 py-2 rounded-lg font-medium transition-all duration-200
              ${isUserControlled
                ? 'bg-green-500 hover:bg-green-600 text-white'
                : 'bg-primary hover:bg-primary/80 text-white'
              }
              ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            {isUserControlled ? '👤 أنت تتحكم' : '🤖 JOE يتحكم'}
          </button>

          <button
            onClick={handleClose}
            className="text-textDim hover:text-white text-2xl px-2"
          >
            ×
          </button>
        </div>
      </div>

      {/* Browser Screen */}
      <div className="flex-1 overflow-auto bg-bgDark p-4 flex items-center justify-center">
        {screenshot ? (
          <div className="relative">
            <canvas
              ref={canvasRef}
              className="border border-borderDim rounded-lg shadow-2xl max-w-full h-auto"
            />
            
            {isUserControlled && (
              <div className="absolute top-4 left-4 bg-green-500 text-white px-4 py-2 rounded-lg font-bold shadow-lg animate-pulse">
                ✋ أنت الآن تتحكم
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-textDim">
            <div className="text-4xl mb-4">🔄</div>
            <p>جاري تحميل المتصفح...</p>
          </div>
        )}
      </div>

      {/* Info Bar */}
      <div className="bg-cardDark border-t border-borderDim p-3 flex items-center justify-between text-sm">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-textDim">Live</span>
          </div>
          <div className="text-textDim">
            Mouse: ({mousePos.x}, {mousePos.y})
          </div>
        </div>

        <div className="text-textDim">
          {isUserControlled 
            ? '💡 اضغط على "JOE يتحكم" لإعادة التحكم لـ JOE'
            : '💡 اضغط على "أنت تتحكم" لأخذ السيطرة'
          }
        </div>
      </div>
    </div>
  );
}
