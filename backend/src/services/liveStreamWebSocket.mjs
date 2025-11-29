import { WebSocketServer, WebSocket } from 'ws';
import { liveStreamingService } from './liveStreamingService.mjs';

/**
 * خادم WebSocket للبث الحي
 * يدير الاتصالات الفعلية مع العملاء
 */
export class LiveStreamWebSocketServer {
  constructor(server) {
    this.wss = new WebSocketServer({ server, path: '/ws/live-stream' });
    this.clients = new Set();
    this.setupWebSocketServer();
  }

  /**
   * إعداد خادم WebSocket
   */
  setupWebSocketServer() {
    this.wss.on('connection', (ws) => {
      console.log('عميل جديد متصل بالبث الحي');
      this.clients.add(ws);

      // الاشتراك في البث الحي
      const unsubscribe = liveStreamingService.subscribe((frameData) => {
        if (ws.readyState === WebSocket.OPEN) {
          try {
            ws.send(JSON.stringify({
              type: 'frame',
              timestamp: frameData.timestamp,
              size: frameData.size,
              data: frameData.data,
              stats: frameData.stats
            }));
          } catch (error) {
            console.error('خطأ في إرسال الإطار عبر WebSocket:', error);
          }
        }
      });

      // معالجة الرسائل الواردة من العميل
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          this.handleClientMessage(ws, data);
        } catch (error) {
          console.error('خطأ في معالجة رسالة العميل:', error);
        }
      });

      // معالجة قطع الاتصال
      ws.on('close', () => {
        console.log('قطع اتصال العميل بالبث الحي');
        this.clients.delete(ws);
        unsubscribe();
      });

      // معالجة الأخطاء
      ws.on('error', (error) => {
        console.error('خطأ في WebSocket:', error);
      });

      // إرسال رسالة ترحيب
      ws.send(JSON.stringify({
        type: 'connected',
        message: 'تم الاتصال بخدمة البث الحي',
        stats: liveStreamingService.getStats()
      }));
    });

    // بدء البث الحي تلقائياً عند الاتصال الأول
    this.wss.on('connection', () => {
      if (!liveStreamingService.isStreaming && this.clients.size > 0) {
        liveStreamingService.startStreaming();
      }
    });
  }

  /**
   * معالجة رسائل العميل
   */
  handleClientMessage(ws, data) {
    const { type, payload } = data;

    switch (type) {
      case 'ping':
        ws.send(JSON.stringify({
          type: 'pong',
          timestamp: Date.now()
        }));
        break;

      case 'get-stats':
        ws.send(JSON.stringify({
          type: 'stats',
          stats: liveStreamingService.getStats()
        }));
        break;

      case 'set-frame-rate':
        if (payload && payload.fps) {
          liveStreamingService.setFrameRate(payload.fps);
          this.broadcastToAll({
            type: 'frame-rate-changed',
            fps: payload.fps
          });
        }
        break;

      case 'set-quality':
        if (payload && payload.quality) {
          liveStreamingService.setQuality(payload.quality);
          this.broadcastToAll({
            type: 'quality-changed',
            quality: payload.quality
          });
        }
        break;

      case 'set-resolution':
        if (payload && payload.width && payload.height) {
          liveStreamingService.setResolution(payload.width, payload.height);
          this.broadcastToAll({
            type: 'resolution-changed',
            width: payload.width,
            height: payload.height
          });
        }
        break;

      default:
        console.warn('نوع رسالة غير معروف:', type);
    }
  }

  /**
   * بث رسالة إلى جميع العملاء
   */
  broadcastToAll(message) {
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(JSON.stringify(message));
        } catch (error) {
          console.error('خطأ في البث إلى العميل:', error);
        }
      }
    });
  }

  /**
   * الحصول على عدد العملاء المتصلين
   */
  getConnectedClients() {
    return this.clients.size;
  }

  /**
   * إغلاق خادم WebSocket
   */
  close() {
    this.wss.close();
  }
}

export default LiveStreamWebSocketServer;
