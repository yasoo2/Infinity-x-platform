import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

/**
 * Hook مخصص للتحكم بالبث الحي
 * يدير الاتصال بخادم البث والإطارات
 */
export function useLiveStream() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [frameRate, setFrameRate] = useState(2);
  const [quality, setQuality] = useState(70);
  const [resolution, setResolution] = useState({ width: 1280, height: 720 });
  const [stats, setStats] = useState({
    fps: 0,
    totalFrames: 0,
    bandwidth: 0,
    uptime: '00:00:00',
    subscribers: 0,
    isStreaming: false
  });
  const [error, setError] = useState(null);
  const [currentFrame, setCurrentFrame] = useState(null);

  const wsRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = useRef(5);
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:10000';

  /**
   * الاتصال بـ WebSocket
   */
  const connectWebSocket = useCallback(() => {
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
  }, []);

  /**
   * محاولة إعادة الاتصال
   */
  const attemptReconnect = useCallback(() => {
    if (reconnectAttempts.current < maxReconnectAttempts.current) {
      reconnectAttempts.current++;
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
      console.log(`محاولة إعادة الاتصال في ${delay}ms...`);
      setTimeout(connectWebSocket, delay);
    } else {
      setError('فشل الاتصال بخادم البث الحي بعد عدة محاولات');
    }
  }, [connectWebSocket]);

  /**
   * معالجة رسائل WebSocket
   */
  const handleWebSocketMessage = useCallback((message) => {
    const { type, data, stats: messageStats, timestamp, size } = message;

    switch (type) {
      case 'frame':
        if (data) {
          setCurrentFrame(data);
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
  }, []);

  /**
   * بدء/إيقاف البث الحي
   */
  const toggleStreaming = useCallback(async () => {
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
  }, [isStreaming, API_BASE]);

  /**
   * تحديث معدل الإطارات
   */
  const updateFrameRate = useCallback(async (newFps) => {
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
  }, [API_BASE]);

  /**
   * تحديث جودة الصورة
   */
  const updateQuality = useCallback(async (newQuality) => {
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
  }, [API_BASE]);

  /**
   * تحديث الدقة
   */
  const updateResolution = useCallback(async (width, height) => {
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
  }, [API_BASE]);

  /**
   * الحصول على الإحصائيات
   */
  const getStats = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/live-stream/status`);
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('خطأ في الحصول على الإحصائيات:', error);
    }
  }, [API_BASE]);

  /**
   * إرسال رسالة عبر WebSocket
   */
  const sendMessage = useCallback((message) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  /**
   * تهيئة الـ Hook
   */
  useEffect(() => {
    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connectWebSocket]);

  return {
    isStreaming,
    isConnected,
    frameRate,
    quality,
    resolution,
    stats,
    error,
    currentFrame,
    toggleStreaming,
    updateFrameRate,
    updateQuality,
    updateResolution,
    getStats,
    sendMessage
  };
}
