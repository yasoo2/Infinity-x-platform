import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = express.Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = '/tmp/uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|txt|md|json|js|mjs|jsx|ts|tsx|html|css|xml|csv/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('File type not supported'));
    }
  }
});

// Upload and analyze file
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.json({ ok: false, error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const fileName = req.file.originalname;
    const fileType = path.extname(fileName).toLowerCase();

    let analysis = '';

    // Read file content
    if (['.txt', '.md', '.json', '.js', '.mjs', '.jsx', '.ts', '.tsx', '.html', '.css', '.xml', '.csv'].includes(fileType)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Analyze with Gemini
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
      const prompt = `Analyze this file (${fileName}) and provide insights in Arabic:\n\n${content.substring(0, 10000)}`;
      
      const result = await model.generateContent(prompt);
      analysis = result.response.text();
    } else if (['.jpg', '.jpeg', '.png'].includes(fileType)) {
      analysis = 'تم رفع صورة. يمكن تحليلها لاحقاً.';
    } else if (fileType === '.pdf') {
      analysis = 'تم رفع ملف PDF. يمكن استخراج النص وتحليله لاحقاً.';
    }

    // Clean up file after analysis
    fs.unlinkSync(filePath);

    res.json({
      ok: true,
      fileName,
      fileType,
      fileSize: req.file.size,
      analysis
    });

  } catch (error) {
    console.error('❌ File upload error:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ ok: false, error: error.message, stack: error.stack });
  }
});

export default router;
