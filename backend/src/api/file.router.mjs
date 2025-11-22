
import express from 'express';
import multer from 'multer';
import path from 'path';
import os from 'os';

// This factory function receives the instantiated file service.
const fileRouterFactory = ({ requireRole, fileProcessingService }) => {
    const router = express.Router();

    // Check if the service is available
    const isServiceAvailable = (req, res, next) => {
        if (!fileProcessingService) {
            return res.status(503).json({ success: false, error: 'SERVICE_UNAVAILABLE', message: 'File Processing service is not configured.' });
        }
        next();
    };

    // Configure Multer for temporary disk storage
    const upload = multer({
        dest: path.join(os.tmpdir(), 'infinity-uploads'),
        limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
    });

    router.use(isServiceAvailable);

    /**
     * @route POST /api/v1/file/upload
     * @description Uploads a file for processing and knowledge extraction.
     * @access USER
     */
    router.post('/upload', requireRole('USER'), upload.single('file'), async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ success: false, error: 'No file was uploaded.' });
            }

            const userId = req.user._id;

            // Delegate processing to the dedicated service
            const result = await fileProcessingService.processUploadedFile({ file: req.file, userId });

            res.json(result);

        } catch (error) {
            console.error('❌ File upload router error:', error);
            res.status(500).json({ success: false, error: 'File upload failed', details: error.message });
        }
    });

    return router;
};

export default fileRouterFactory;
