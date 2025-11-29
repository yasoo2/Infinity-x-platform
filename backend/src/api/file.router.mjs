
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
        limits: { fileSize: 500 * 1024 * 1024 },
    });

    router.use(isServiceAvailable);

    /**
     * @route POST /api/v1/file/upload
     * @description Uploads a file for processing and knowledge extraction.
     * @access USER
     */
    router.post('/upload', requireRole('USER'), upload.array('files'), async (req, res) => {
        try {
            const files = req.files;
            if (!files || files.length === 0) {
                return res.status(400).json({ success: false, error: 'No files were uploaded.' });
            }

            const userId = req.user._id;
            const results = [];
            for (const f of files) {
                try {
                    const r = await fileProcessingService.processUploadedFile({ file: f, userId });
                    results.push({ success: true, ...r });
                } catch (e) {
                    results.push({ success: false, error: e.message, fileName: f?.originalname });
                }
            }

            res.json({ success: true, count: results.length, results });

        } catch (error) {
            console.error('❌ File upload router error:', error);
            res.status(500).json({ success: false, error: 'File upload failed', details: error.message });
        }
    });

    return router;
};

export default fileRouterFactory;
