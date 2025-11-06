import express from 'express';
import { liveStreamingService } from '../services/liveStreamingService.mjs';

const router = express.Router();

/**
 * بدء البث الحي
 * POST /api/live-stream/start
 */
router.post('/start', async (req, res) => {
  try {
    await liveStreamingService.startStreaming();
    res.json({
      success: true,
      message: 'تم بدء البث الحي',
      stats: liveStreamingService.getStats()
    });
  } catch (error) {
    console.error('خطأ في بدء البث:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * إيقاف البث الحي
 * POST /api/live-stream/stop
 */
router.post('/stop', (req, res) => {
  try {
    liveStreamingService.stopStreaming();
    res.json({
      success: true,
      message: 'تم إيقاف البث الحي',
      stats: liveStreamingService.getStats()
    });
  } catch (error) {
    console.error('خطأ في إيقاف البث:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * الحصول على حالة البث الحي
 * GET /api/live-stream/status
 */
router.get('/status', (req, res) => {
  try {
    const stats = liveStreamingService.getStats();
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('خطأ في الحصول على الحالة:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * تعيين معدل الإطارات
 * POST /api/live-stream/set-frame-rate
 */
router.post('/set-frame-rate', (req, res) => {
  try {
    const { fps } = req.body;
    
    if (!fps || fps < 1 || fps > 30) {
      return res.status(400).json({
        success: false,
        error: 'معدل الإطارات يجب أن يكون بين 1 و 30'
      });
    }

    liveStreamingService.setFrameRate(fps);
    res.json({
      success: true,
      message: `تم تعيين معدل الإطارات إلى ${fps} FPS`,
      stats: liveStreamingService.getStats()
    });
  } catch (error) {
    console.error('خطأ في تعيين معدل الإطارات:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * تعيين جودة الصورة
 * POST /api/live-stream/set-quality
 */
router.post('/set-quality', (req, res) => {
  try {
    const { quality } = req.body;
    
    if (!quality || quality < 1 || quality > 100) {
      return res.status(400).json({
        success: false,
        error: 'جودة الصورة يجب أن تكون بين 1 و 100'
      });
    }

    liveStreamingService.setQuality(quality);
    res.json({
      success: true,
      message: `تم تعيين جودة الصورة إلى ${quality}%`,
      stats: liveStreamingService.getStats()
    });
  } catch (error) {
    console.error('خطأ في تعيين جودة الصورة:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * تعيين دقة الشاشة
 * POST /api/live-stream/set-resolution
 */
router.post('/set-resolution', (req, res) => {
  try {
    const { width, height } = req.body;
    
    if (!width || !height || width < 320 || height < 240) {
      return res.status(400).json({
        success: false,
        error: 'الدقة يجب أن تكون على الأقل 320x240'
      });
    }

    liveStreamingService.setResolution(width, height);
    res.json({
      success: true,
      message: `تم تعيين دقة الشاشة إلى ${width}x${height}`,
      stats: liveStreamingService.getStats()
    });
  } catch (error) {
    console.error('خطأ في تعيين دقة الشاشة:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * الحصول على الإطار الحالي
 * GET /api/live-stream/frame
 */
router.get('/frame', (req, res) => {
  try {
    if (!liveStreamingService.currentScreen) {
      return res.status(404).json({
        success: false,
        error: 'لا توجد إطارات متاحة'
      });
    }

    res.setHeader('Content-Type', 'image/jpeg');
    res.send(liveStreamingService.currentScreen);
  } catch (error) {
    console.error('خطأ في الحصول على الإطار:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
