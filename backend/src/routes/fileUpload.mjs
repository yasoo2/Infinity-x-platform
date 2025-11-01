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
    // إضافة أنواع ملفات الصوت والفيديو لمعالجة الرسائل الصوتية
    const allowedTypes = /jpeg|jpg|png|pdf|txt|md|json|js|mjs|jsx|ts|tsx|html|css|xml|csv|mp3|wav|ogg|m4a|mp4|webm/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    // التحقق من نوع الملف (MIME type)
    const mimetype = allowedTypes.test(file.mimetype) || file.mimetype.startsWith('audio/') || file.mimetype.startsWith('video/');
    
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
    let transcription = null;

    // 1. معالجة الملفات الصوتية/الفيديو (الرسائل الصوتية)
    if (['.mp3', '.wav', '.ogg', '.m4a', '.mp4', '.webm'].includes(fileType) || req.file.mimetype.startsWith('audio/') || req.file.mimetype.startsWith('video/')) {
      // هنا يتم استخدام OpenAI API (Whisper) أو أي خدمة نسخ صوتي
      // بما أننا لا نملك الوصول المباشر إلى API، سنقوم بمحاكاة الاستدعاء
      // في بيئة الإنتاج، يجب استبدال هذا بمنطق استدعاء API حقيقي
      console.log(`🎤 Attempting to transcribe audio file: ${fileName}`);
      
      // محاكاة عملية النسخ الصوتي
      // يجب أن يتم استبدال هذا الكود باستدعاء حقيقي لـ OpenAI.audio.transcriptions.create
      // أو أي خدمة نسخ صوتي أخرى
      transcription = `[تحذير: هذا نسخ صوتي مُحاكى. يجب ربط هذا الكود بـ OpenAI Whisper API أو خدمة نسخ صوتي أخرى للحصول على النص الكامل.] الملف: ${fileName}`; 
      
      // إذا كان هناك استدعاء حقيقي، يجب أن يكون شيء مثل:
      /*
      const transcriptionResult = await openai.audio.transcriptions.create({
        file: fs.createReadStream(filePath),
        model: "whisper-1",
      });
      transcription = transcriptionResult.text;
      */
    }

    // 2. تحليل الملفات الأخرى باستخدام Gemini
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
      analysis,
      transcription
    });

  } catch (error) {
    console.error('❌ File upload error:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ ok: false, error: error.message, stack: error.stack });
  }
});

export default router;
