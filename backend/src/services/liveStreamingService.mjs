import { EventEmitter } from 'events';
import sharp from 'sharp';

/**
 * خدمة البث الحي لعرض سطح المكتب
 * تقوم بالتقاط لقطات شاشة وإرسالها عبر WebSocket
 */
export class LiveStreamingService extends EventEmitter {
  constructor() {
    super();
    this.isStreaming = false;
    this.captureProcess = null;
    this.frameRate = 2; // عدد الإطارات في الثانية
    this.quality = 70; // جودة الصورة (1-100)
    this.width = 1280;
    this.height = 720;
    this.lastFrameTime = 0;
    this.frameInterval = 1000 / this.frameRate;
    this.subscribers = new Set();
    this.currentScreen = null;
    this.stats = {
      totalFrames: 0,
      fps: 0,
      bandwidth: 0,
      startTime: null,
      uptime: 0
    };
  }

  /**
   * بدء البث الحي
   */
  async startStreaming() {
    if (this.isStreaming) {
      console.warn('البث الحي قيد التشغيل بالفعل');
      return;
    }

    this.isStreaming = true;
    this.stats.startTime = Date.now();
    this.emit('stream-started');

    // محاكاة التقاط الشاشة
    this.captureScreenLoop();
  }

  /**
   * إيقاف البث الحي
   */
  stopStreaming() {
    if (!this.isStreaming) {
      console.warn('البث الحي غير مفعل');
      return;
    }

    this.isStreaming = false;
    if (this.captureProcess) {
      this.captureProcess.kill();
      this.captureProcess = null;
    }
    this.emit('stream-stopped');
  }

  /**
   * حلقة التقاط الشاشة
   */
  async captureScreenLoop() {
    while (this.isStreaming) {
      const now = Date.now();
      
      if (now - this.lastFrameTime >= this.frameInterval) {
        try {
          const frame = await this.captureScreen();
          if (frame) {
            this.currentScreen = frame;
            this.broadcastFrame(frame);
            this.stats.totalFrames++;
            this.lastFrameTime = now;
          }
        } catch (error) {
          console.error('خطأ في التقاط الشاشة:', error);
        }
      }

      // تحديث الإحصائيات
      this.updateStats();

      // انتظر قليلاً قبل الإطار التالي
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  /**
   * التقاط لقطة شاشة
   */
  async captureScreen() {
    try {
      // في بيئة الإنتاج، يمكن استخدام أدوات مثل:
      // - ffmpeg
      // - gnome-screenshot
      // - scrot
      // - ImageMagick

      // هنا نقوم بإنشاء صورة وهمية للاختبار
      const canvas = await this.generateScreenCapture();
      
      // ضغط الصورة
      const compressed = await sharp(canvas)
        .resize(this.width, this.height, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: this.quality })
        .toBuffer();

      return compressed;
    } catch (error) {
      console.error('خطأ في التقاط الشاشة:', error);
      return null;
    }
  }

  /**
   * توليد صورة وهمية للشاشة (للاختبار)
   */
  async generateScreenCapture() {
    // في الإنتاج، سيتم استبدال هذا بالتقاط حقيقي
    const width = this.width;
    const height = this.height;
    
    // إنشاء صورة بسيطة
    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#1a1a2e;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#16213e;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="${width}" height="${height}" fill="url(#grad1)"/>
        
        <!-- شريط المهام العلوي -->
        <rect width="${width}" height="50" fill="#0f3460" opacity="0.8"/>
        <text x="20" y="35" font-family="Arial" font-size="20" fill="#00d4ff" font-weight="bold">
          Jo AI System - Live Stream
        </text>
        <text x="${width - 200}" y="35" font-family="Arial" font-size="14" fill="#00d4ff">
          ${new Date().toLocaleTimeString('ar-SA')}
        </text>
        
        <!-- منطقة المحتوى الرئيسية -->
        <rect x="20" y="70" width="${width - 40}" height="${height - 140}" fill="#16213e" stroke="#00d4ff" stroke-width="2" rx="8"/>
        
        <!-- عنوان -->
        <text x="40" y="100" font-family="Arial" font-size="24" fill="#00d4ff" font-weight="bold">
          نظام جو - عرض سطح المكتب الحي
        </text>
        
        <!-- معلومات النظام -->
        <text x="40" y="150" font-family="Arial" font-size="14" fill="#00ff88">
          الحالة: ${this.isStreaming ? 'قيد التشغيل' : 'متوقف'}
        </text>
        <text x="40" y="180" font-family="Arial" font-size="14" fill="#00ff88">
          الإطارات: ${this.stats.totalFrames}
        </text>
        <text x="40" y="210" font-family="Arial" font-size="14" fill="#00ff88">
          معدل الإطارات: ${this.stats.fps.toFixed(1)} FPS
        </text>
        <text x="40" y="240" font-family="Arial" font-size="14" fill="#00ff88">
          الوقت المنقضي: ${this.formatUptime(this.stats.uptime)}
        </text>
        
        <!-- شريط المهام السفلي -->
        <rect y="${height - 50}" width="${width}" height="50" fill="#0f3460" opacity="0.8"/>
        <text x="20" y="${height - 20}" font-family="Arial" font-size="12" fill="#00d4ff">
          Jo AI System v1.0 | Powered by Manus
        </text>
      </svg>
    `;

    return Buffer.from(svg, 'utf-8');
  }

  /**
   * بث الإطار إلى جميع المشتركين
   */
  broadcastFrame(frame) {
    if (this.subscribers.size === 0) return;

    const frameData = {
      timestamp: Date.now(),
      size: frame.length,
      data: frame.toString('base64'),
      stats: { ...this.stats }
    };

    this.subscribers.forEach(subscriber => {
      try {
        subscriber(frameData);
      } catch (error) {
        console.error('خطأ في إرسال الإطار:', error);
        this.subscribers.delete(subscriber);
      }
    });

    this.stats.bandwidth += frame.length;
  }

  /**
   * الاشتراك في البث الحي
   */
  subscribe(callback) {
    this.subscribers.add(callback);
    
    // إرسال الإطار الحالي فوراً
    if (this.currentScreen) {
      const frameData = {
        timestamp: Date.now(),
        size: this.currentScreen.length,
        data: this.currentScreen.toString('base64'),
        stats: { ...this.stats }
      };
      callback(frameData);
    }

    return () => this.subscribers.delete(callback);
  }

  /**
   * إلغاء الاشتراك
   */
  unsubscribe(callback) {
    this.subscribers.delete(callback);
  }

  /**
   * تحديث الإحصائيات
   */
  updateStats() {
    if (this.stats.startTime) {
      this.stats.uptime = Date.now() - this.stats.startTime;
      // حماية من القسمة على صفر
      if (this.stats.uptime > 0) {
        this.stats.fps = (this.stats.totalFrames * 1000) / this.stats.uptime;
      } else {
        this.stats.fps = 0;
      }
    }
  }

  /**
   * تنسيق الوقت المنقضي
   */
  formatUptime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (n) => n.toString().padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }

  /**
   * الحصول على الإحصائيات الحالية
   */
  getStats() {
    return {
      ...this.stats,
      isStreaming: this.isStreaming,
      subscribers: this.subscribers.size,
      uptime: this.formatUptime(this.stats.uptime)
    };
  }

  /**
   * تعيين معدل الإطارات
   */
  setFrameRate(fps) {
    this.frameRate = Math.max(1, Math.min(30, fps));
    this.frameInterval = 1000 / this.frameRate;
  }

  /**
   * تعيين جودة الصورة
   */
  setQuality(quality) {
    this.quality = Math.max(1, Math.min(100, quality));
  }

  /**
   * تعيين دقة الشاشة
   */
  setResolution(width, height) {
    this.width = width;
    this.height = height;
  }
}

// إنشاء مثيل واحد من الخدمة
export const liveStreamingService = new LiveStreamingService();
