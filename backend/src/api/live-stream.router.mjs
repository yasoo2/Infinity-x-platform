import express from 'express';

// This router controls a live screen streaming service.
// It needs to be properly secured and structured.

const liveStreamRouterFactory = ({ requireRole, liveStreamingService }) => {
    const router = express.Router();

    // Middleware to check if the service is available
    const isServiceAvailable = (req, res, next) => {
        if (!liveStreamingService) {
            return res.status(503).json({ success: false, error: 'SERVICE_UNAVAILABLE', message: 'Live streaming service is not configured on the server.' });
        }
        next();
    };

    router.use(isServiceAvailable);

    /**
     * @route POST /api/v1/live-stream/start
     * @description Starts the live stream.
     * @access ADMIN
     */
    router.post('/start', requireRole('ADMIN'), async (req, res) => {
        try {
            await liveStreamingService.startStreaming();
            res.json({ success: true, message: 'Live stream started.', stats: liveStreamingService.getStats() });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * @route POST /api/v1/live-stream/stop
     * @description Stops the live stream.
     * @access ADMIN
     */
    router.post('/stop', requireRole('ADMIN'), (req, res) => {
        try {
            liveStreamingService.stopStreaming();
            res.json({ success: true, message: 'Live stream stopped.', stats: liveStreamingService.getStats() });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * @route GET /api/v1/live-stream/status
     * @description Gets the current status of the live stream.
     * @access USER
     */
    router.get('/status', requireRole('USER'), (req, res) => {
        try {
            res.json({ success: true, stats: liveStreamingService.getStats() });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * @route GET /api/v1/live-stream/frame
     * @description Gets the latest frame from the live stream.
     * @access USER
     */
    router.get('/frame', requireRole('USER'), (req, res) => {
        try {
            const frame = liveStreamingService.getCurrentFrame();
            if (!frame) {
                return res.status(404).json({ success: false, error: 'No frame available.' });
            }
            res.setHeader('Content-Type', 'image/jpeg');
            res.send(frame);
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * @route POST /api/v1/live-stream/config
     * @description Updates the stream's configuration.
     * @access ADMIN
     * @body { fps, quality, width, height }
     */
    router.post('/config', requireRole('ADMIN'), (req, res) => {
        try {
            const { fps, quality, width, height } = req.body;
            const updates = {};
            if (fps) updates.fps = liveStreamingService.setFrameRate(fps);
            if (quality) updates.quality = liveStreamingService.setQuality(quality);
            if (width && height) updates.resolution = liveStreamingService.setResolution(width, height);

            res.json({ success: true, message: 'Stream configuration updated.', newStats: liveStreamingService.getStats(), updatesApplied: updates });
        } catch (error) {
            // The service methods themselves might throw errors for invalid values
            res.status(400).json({ success: false, error: error.message });
        }
    });

    return router;
};

export default liveStreamRouterFactory;
