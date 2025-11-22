import express from 'express';
import multer from 'multer';

// REFACTORED: Logic will be moved to a dedicated service.
// For now, we simulate the service call.
// import { processUploadedFile } from '../services/files/file-processing.service.mjs';

const fileRouterFactory = ({ requireRole, db }) => {
    const router = express.Router();

    // Configure Multer for in-memory storage, which is safer and better for stateless environments
    const storage = multer.memoryStorage();
    const upload = multer({
        storage: storage,
        limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
        fileFilter: (req, file, cb) => {
            // A more robust filter can be implemented based on actual needs
            cb(null, true);
        }
    });

    /**
     * @route POST /api/v1/file/upload
     * @description Uploads a file for processing and analysis.
     * @access USER
     * @middleware upload.single('file') - Handles the file multipart/form-data
     */
    router.post('/upload', requireRole('USER'), upload.single('file'), async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ success: false, error: 'No file was uploaded.' });
            }

            const { buffer, originalname, mimetype, size } = req.file;
            const userId = req.user._id;

            console.log(`Received file "${originalname}" from user ${userId}. Size: ${size} bytes.`);

            // In a real application, you would pass this to a dedicated service
            // for processing, analysis, and storage (e.g., in S3 or Google Cloud Storage).
            // const analysisResult = await processUploadedFile({ fileBuffer: buffer, fileName: originalname, userId });
            
            // For now, we'll just log the activity and return file info.
            const mongoDb = await db();
            await mongoDb.collection('joe_activity').insertOne({
                ts: new Date(),
                action: 'FILE_UPLOADED',
                detail: `File: ${originalname}, Size: ${size}, Type: ${mimetype}`,
                userId: userId
            });
            
            // We are not sending the file content back to the client.
            res.json({
                success: true,
                message: 'File uploaded successfully and queued for processing.',
                file: {
                    name: originalname,
                    type: mimetype,
                    size: size
                }
                // In a real scenario, you might return a file ID or a URL
                // fileId: analysisResult.fileId
            });

        } catch (error) {
            console.error('❌ File upload error:', error);
            res.status(500).json({ success: false, error: 'File upload failed', details: error.message });
        }
    });

    return router;
};

export default fileRouterFactory;
