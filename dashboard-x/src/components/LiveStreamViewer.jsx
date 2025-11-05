import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Settings, Maximize2, Volume2 } from 'lucide-react';
import axios from 'axios';

/**
 * مكون عرض البث الحي
 * يعرض سطح المكتب الحي لنظام جو
 */
export default function LiveStreamViewer() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [frameRate, setFrameRate] = useState(2);
  const [quality, setQuality] = useState(70);
  const [resolution, setResolution] = useState({ width: 1280, height: 720 });
  const [stats, setStats] = useState({
    fps: 0,
    totalFrames: 0,
    bandwidth: 0,
    uptime: '00:00:00',
    subscribers: 0
  });
  const [currentFrame, setCurrentFrame] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const canvasRef = useRef(null);
  const wsRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:10000';

  /**
   * الاتصال بخادم WebSocket
   */
  useEffect(() => {
    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  /**
   * الاتصال بـ WebSocket
   */
  const connectWebSocket = () => {
    try {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${wsProtocol}//${window.location.host}/ws/live-stream`;

      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('تم الاتصال بخادم البث الحي');
        setIsConnected(true);
        reconnectAttempts.current = 0;
        setError(null);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleWebSocketMessage(message);
        } catch (error) {
          console.error('خطأ في معالجة رسالة WebSocket:', error);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('خطأ في WebSocket:', error);
        setError('خطأ في الاتصال بخادم البث الحي');
      };

      wsRef.current.onclose = () => {
        console.log('تم قطع الاتصال بخادم البث الحي');
        setIsConnected(false);
        attemptReconnect();
      };
    } catch (error) {
      console.error('خطأ في الاتصال بـ WebSocket:', error);
      setError('فشل الاتصال بخادم البث الحي');
    }
  };

  /**
   * محاولة إعادة الاتصال
   */
  const attemptReconnect = () => {
    if (reconnectAttempts.current < maxReconnectAttempts) {
      reconnectAttempts.current++;
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
      console.log(`محاولة إعادة الاتصال في ${delay}ms...`);
      setTimeout(connectWebSocket, delay);
    } else {
      setError('فشل الاتصال بخادم البث الحي بعد عدة محاولات');
    }
  };

  /**
   * معالجة رسائل WebSocket
   */
  const handleWebSocketMessage = (message) => {
    const { type, data, stats: messageStats, timestamp, size } = message;

    switch (type) {
      case 'frame':
        if (data) {
          displayFrame(data);
          if (messageStats) {
            setStats(messageStats);
          }
        }
        break;

      case 'connected':
        console.log('تم الاتصال بنجاح بخدمة البث الحي');
        break;

      case 'stats':
        if (messageStats) {
          setStats(messageStats);
        }
        break;

      case 'frame-rate-changed':
        setFrameRate(message.fps);
        break;

      case 'quality-changed':
        setQuality(message.quality);
        break;

      case 'resolution-changed':
        setResolution({ width: message.width, height: message.height });
        break;

      default:
        console.log('رسالة غير معروفة:', type);
    }
  };

  /**
   * عرض الإطار على Canvas
   */
  const displayFrame = (frameData) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      setCurrentFrame(frameData);
    };

    img.onerror = () => {
      console.error('خطأ في تحميل الإطار');
    };

    img.src = `data:image/jpeg;base64,${frameData}`;
  };

  /**
   * بدء/إيقاف البث الحي
   */
  const toggleStreaming = async () => {
    try {
      const endpoint = isStreaming ? '/stop' : '/start';
      const response = await axios.post(`${API_BASE}/api/live-stream${endpoint}`);

      if (response.data.success) {
        setIsStreaming(!isStreaming);
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('خطأ في تبديل البث:', error);
      setError('فشل تبديل حالة البث الحي');
    }
  };

  /**
   * تحديث معدل الإطارات
   */
  const updateFrameRate = async (newFps) => {
    try {
      const response = await axios.post(`${API_BASE}/api/live-stream/set-frame-rate`, {
        fps: newFps
      });

      if (response.data.success) {
        setFrameRate(newFps);
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('خطأ في تحديث معدل الإطارات:', error);
    }
  };

  /**
   * تحديث جودة الصورة
   */
  const updateQuality = async (newQuality) => {
    try {
      const response = await axios.post(`${API_BASE}/api/live-stream/set-quality`, {
        quality: newQuality
      });

      if (response.data.success) {
        setQuality(newQuality);
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('خطأ في تحديث جودة الصورة:', error);
    }
  };

  /**
   * تحديث الدقة
   */
  const updateResolution = async (width, height) => {
    try {
      const response = await axios.post(`${API_BASE}/api/live-stream/set-resolution`, {
        width,
        height
      });

      if (response.data.success) {
        setResolution({ width, height });
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('خطأ في تحديث الدقة:', error);
    }
  };

  /**
   * تنسيق حجم الملف
   */
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-lg overflow-hidden shadow-2xl">
      {/* رأس الواجهة */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 border-b border-cyan-500/30 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
            <h2 className="text-xl font-bold text-cyan-400">عرض سطح المكتب الحي</h2>
            <span className="text-sm text-gray-400">
              {isConnected ? 'متصل' : 'غير متصل'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleStreaming}
              className={`p-2 rounded-lg transition-all ${
                isStreaming
                  ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                  : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
              }`}
              title={isStreaming ? 'إيقاف البث' : 'بدء البث'}
            >
              {isStreaming ? <Pause size={20} /> : <Play size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* منطقة البث الحي */}
      <div className="relative bg-black/50 aspect-video flex items-center justify-center overflow-hidden">
        <canvas
          ref={canvasRef}
          width={resolution.width}
          height={resolution.height}
          className="w-full h-full object-contain"
        />

        {!isStreaming && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-center">
              <Play size={48} className="mx-auto mb-4 text-gray-500" />
              <p className="text-gray-400">اضغط على زر التشغيل لبدء البث الحي</p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute top-4 right-4 bg-red-500/20 border border-red-500 text-red-400 px-4 py-2 rounded-lg">
            {error}
          </div>
        )}
      </div>

      {/* الإحصائيات والتحكم */}
      <div className="border-t border-cyan-500/30 p-4 bg-slate-800/50">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {/* معدل الإطارات */}
          <div className="bg-slate-700/50 rounded-lg p-3">
            <div className="text-xs text-gray-400 mb-2">معدل الإطارات</div>
            <div className="text-lg font-bold text-cyan-400">{stats.fps?.toFixed(1) || '0'} FPS</div>
          </div>

          {/* إجمالي الإطارات */}
          <div className="bg-slate-700/50 rounded-lg p-3">
            <div className="text-xs text-gray-400 mb-2">الإطارات</div>
            <div className="text-lg font-bold text-green-400">{stats.totalFrames || '0'}</div>
          </div>

          {/* النطاق الترددي */}
          <div className="bg-slate-700/50 rounded-lg p-3">
            <div className="text-xs text-gray-400 mb-2">النطاق الترددي</div>
            <div className="text-lg font-bold text-yellow-400">{formatBytes(stats.bandwidth || 0)}</div>
          </div>

          {/* الوقت المنقضي */}
          <div className="bg-slate-700/50 rounded-lg p-3">
            <div className="text-xs text-gray-400 mb-2">الوقت المنقضي</div>
            <div className="text-lg font-bold text-purple-400">{stats.uptime || '00:00:00'}</div>
          </div>
        </div>

        {/* أدوات التحكم */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* معدل الإطارات */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">معدل الإطارات (FPS)</label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="1"
                max="30"
                value={frameRate}
                onChange={(e) => updateFrameRate(parseInt(e.target.value))}
                className="flex-1 h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-sm text-cyan-400 font-bold w-8">{frameRate}</span>
            </div>
          </div>

          {/* جودة الصورة */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">جودة الصورة (%)</label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="1"
                max="100"
                value={quality}
                onChange={(e) => updateQuality(parseInt(e.target.value))}
                className="flex-1 h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-sm text-cyan-400 font-bold w-8">{quality}</span>
            </div>
          </div>

          {/* الدقة */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">الدقة</label>
            <select
              value={`${resolution.width}x${resolution.height}`}
              onChange={(e) => {
                const [w, h] = e.target.value.split('x');
                updateResolution(parseInt(w), parseInt(h));
              }}
              className="w-full px-3 py-2 bg-slate-600 text-cyan-400 rounded-lg text-sm border border-slate-500 focus:border-cyan-500 outline-none"
            >
              <option value="640x480">640x480</option>
              <option value="1024x768">1024x768</option>
              <option value="1280x720">1280x720 (HD)</option>
              <option value="1920x1080">1920x1080 (Full HD)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
