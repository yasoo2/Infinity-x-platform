
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';

class FileProcessingService {
    constructor({ memoryManager }) {
        this.memoryManager = memoryManager;
        this.uploadDir = path.join(os.tmpdir(), 'infinity-uploads');
        this.initialize();
    }

    async initialize() {
        try {
            await fs.mkdir(this.uploadDir, { recursive: true });
            console.log(`✅ FileProcessingService initialized. Upload directory: ${this.uploadDir}`);
        } catch (error) {
            console.error('❌ Failed to create upload directory:', error);
        }
    }

    /**
     * Processes an uploaded file.
     * 
     * @param {object} file - The file object from multer (including buffer, originalname).
     * @param {string} userId - The ID of the user who uploaded the file.
     * @returns {Promise<object>} - An object containing information about the processed file.
     */
    async processUploadedFile({ file, userId }) {
        const { buffer, originalname, mimetype, size } = file;
        const fileId = uuidv4();
        const fileExtension = path.extname(originalname);
        const storedFileName = `${fileId}${fileExtension}`;
        const filePath = path.join(this.uploadDir, storedFileName);

        try {
            // 1. Save the file to a persistent or semi-persistent location
            await fs.writeFile(filePath, buffer);
            console.log(`📄 File saved locally: ${filePath}`);

            // 2. (Future Implementation) Extract content from the file
            // For now, we'll just use the file name.
            const extractedContent = `File named "${originalname}" was uploaded.`;

            // 3. Add the information as a "knowledge" entry into the memory service
            const knowledgeId = await this.memoryManager.addKnowledge({
                userId,
                source: 'file_upload',
                type: mimetype,
                content: extractedContent,
                metadata: {
                    originalName: originalname,
                    size,
                    storedPath: filePath // For internal reference
                }
            });

            console.log(`🧠 Knowledge from file added to memory with ID: ${knowledgeId}`);

            return {
                success: true,
                message: 'File processed and knowledge stored.',
                fileId: storedFileName,
                knowledgeId: knowledgeId.toString()
            };

        } catch (error) {
            console.error(`❌ Error processing file ${originalname}:`, error);
            throw new Error('Failed to process uploaded file.');
        }
    }
}

export default FileProcessingService;
