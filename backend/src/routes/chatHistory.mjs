/**
 * chatHistory.mjs - إدارة المحادثات (النسخة النهائية)
 * يدعم: إنشاء، قائمة، إضافة رسالة، توليد عنوان، حذف، تعديل
 * + ربط تلقائي بالمهام عند طلب "أنشئ"
 */

import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getDb } from '../db.mjs';

const router = express.Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// === إنشاء محادثة جديدة ===
router.post('/create', async (req, res) => {
  try {
    const { userId, title } = req.body;
    if (!userId) return res.json({ ok: false, error: 'User ID required' });

    const db = await getDb();
    const conversation = {
      userId,
      title: title || 'محادثة جديدة',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('conversations').insertOne(conversation);

    res.json({
      ok: true,
      conversationId: result.insertedId.toString(),
      conversation: { ...conversation, _id: result.insertedId }
    });
  } catch (error) {
    console.error('Create error:', error);
    res.json({ ok: false, error: error.message });
  }
});

// === جلب قائمة المحادثات ===
router.post('/list', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.json({ ok: false, error: 'User ID required' });

    const db = await getDb();
    const conversations = await db.collection('conversations')
      .find({ userId })
      .sort({ updatedAt: -1 })
      .toArray();

    res.json({ ok: true, conversations });
  } catch (error) {
    res.json({ ok: false, error: error.message });
  }
});

// === جلب محادثة واحدة ===
router.post('/get', async (req, res) => {
  try {
    const { conversationId } = req.body;
    if (!conversationId) return res.json({ ok: false, error: 'ID required' });

    const db = await getDb();
    const { ObjectId } = await import('mongodb');
    const conversation = await db.collection('conversations')
      .findOne({ _id: new ObjectId(conversationId) });

    if (!conversation) return res.json({ ok: false, error: 'Not found' });

    res.json({ ok: true, conversation });
  } catch (error) {
    res.json({ ok: false, error: error.message });
  }
});

// === إضافة رسالة + ربط بالمهمة ===
router.post('/add-message', async (req, res) => {
  try {
    const { conversationId, message } = req.body;
    if (!conversationId || !message) return res.json({ ok: false, error: 'Required fields missing' });

    const db = await getDb();
    const { ObjectId } = await import('mongodb');

    const messageObj = {
      id: Date.now() + Math.random(),
      content: message.content,
      type: message.type || 'user',
      timestamp: new Date().toLocaleTimeString(),
      createdAt: new Date()
    };

    // حفظ الرسالة
    await db.collection('conversations').updateOne(
      { _id: new ObjectId(conversationId) },
      {
        $push: { messages: messageObj },
        $set: { updatedAt: new Date() }
      }
    );

    // === ربط بالمهمة إذا كان أمر إنشاء ===
    const content = message.content.toLowerCase();
    if (
      message.type === 'user' &&
      (content.includes('أنشئ') || content.includes('create') || content.includes('سوي') || content.includes('build'))
    ) {
      const job = {
        conversationId,
        command: message.content,
        title: 'إنشاء موقع',
        style: 'modern',
        deploy: true,
        status: 'QUEUED',
        createdAt: new Date()
      };

      const jobResult = await db.collection('jobs').insertOne(job);
      console.log('مهمة جديدة في المحادثة:', jobResult.insertedId.toString());
    }

    res.json({ ok: true, message: messageObj });
  } catch (error) {
    console.error('Add message error:', error);
    res.json({ ok: false, error: error.message });
  }
});

// === توليد عنوان تلقائي ===
router.post('/generate-title', async (req, res) => {
  try {
    const { conversationId, firstMessage } = req.body;
    if (!conversationId) return res.json({ ok: false, error: 'ID required' });

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    const prompt = `أنشئ عنوان قصير (5 كلمات كحد أقصى) بالعربية لمحادثة تبدأ بـ: "${firstMessage}"\nرجّع العنوان فقط.`;

    const result = await model.generateContent(prompt);
    const title = result.response.text().trim().replace(/["']/g, '');

    const db = await getDb();
    const { ObjectId } = await import('mongodb');
    await db.collection('conversations').updateOne(
      { _id: new ObjectId(conversationId) },
      { $set: { title, updatedAt: new Date() } }
    );

    res.json({ ok: true, title });
  } catch (error) {
    console.error('Generate title error:', error);
    res.json({ ok: false, error: error.message });
  }
});

// === حذف محادثة ===
router.post('/delete', async (req, res) => {
  try {
    const { conversationId } = req.body;
    if (!conversationId) return res.json({ ok: false, error: 'ID required' });

    const db = await getDb();
    const { ObjectId } = await import('mongodb');
    await db.collection('conversations').deleteOne({ _id: new ObjectId(conversationId) });

    res.json({ ok: true, message: 'تم الحذف' });
  } catch (error) {
    res.json({ ok: false, error: error.message });
  }
});

// === تعديل العنوان ===
router.post('/update-title', async (req, res) => {
  try {
    const { conversationId, title } = req.body;
    if (!conversationId || !title) return res.json({ ok: false, error: 'Required' });

    const db = await getDb();
    const { ObjectId } = await import('mongodb');
    await db.collection('conversations').updateOne(
      { _id: new ObjectId(conversationId) },
      { $set: { title, updatedAt: new Date() } }
    );

    res.json({ ok: true, message: 'تم التعديل' });
  } catch (error) {
    res.json({ ok: false, error: error.message });
  }
});

export default router;