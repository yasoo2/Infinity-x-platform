import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getDb } from '../db.mjs';
import { ObjectId } from 'mongodb';

const router = express.Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.post('/add-message', async (req, res) => {
  try {
    const { conversationId, message } = req.body;
    if (!conversationId || !message) return res.json({ ok: false, error: 'Required' });

    const db = await getDb();
    const now = new Date();

    const messageObj = {
      id: new ObjectId(), // استخدام ObjectId لضمان التفرد والتنظيم
      content: message.content,
      type: message.type || 'user',
      timestamp: new Date().toLocaleTimeString(),
      createdAt: now
    };

    await db.collection('conversations').updateOne(
      { _id: new ObjectId(conversationId) },
      { $push: { messages: messageObj }, $set: { updatedAt: now } }
    );

    // === إذا كان أمر GitHub ===
    if (message.type === 'user') {
      const text = message.content.toLowerCase();

      if (text.includes('فحص') && text.includes('ريبو') && text.includes('github')) {
        await db.collection('factory_jobs').insertOne({
          createdAt: now,
          sessionToken: `github-list-${conversationId}`,
          projectType: 'github-list-repos',
          shortDescription: 'فحص كل الريبوهات',
          status: 'QUEUED',
          source: 'chat',
          conversationId
        });
      }

      if (/^افتح الريبو رقم \d+$/.test(text) || /^عدّل الريبو رقم \d+$/.test(text)) {
        const num = text.match(/\d+/)[0];
        await db.collection('factory_jobs').insertOne({
          createdAt: now,
          sessionToken: `github-improve-${conversationId}`,
          projectType: 'github-improve-repo',
          shortDescription: `تعديل الريبو رقم ${num}`,
          status: 'QUEUED',
          source: 'chat',
          conversationId,
          repoNumber: parseInt(num)
        });
      }
    }

    res.json({ ok: true, message: messageObj });
  } catch (error) {
    res.json({ ok: false, error: error.message });
  }
});

// Create new conversation
router.post('/create', async (req, res) => {
  try {
    const { userId, title } = req.body;
    if (!userId) return res.json({ ok: false, error: 'userId required' });

    const db = await getDb();
    const now = new Date();

    const conversation = {
      userId,
      title: title || 'محادثة جديدة',
      messages: [],
      createdAt: now,
      updatedAt: now
    };

    const result = await db.collection('conversations').insertOne(conversation);

    res.json({
      ok: true,
      conversationId: result.insertedId.toString()
    });
  } catch (error) {
    res.json({ ok: false, error: error.message });
  }
});

// List all conversations for a user (GET)
router.get('/list', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.json({ ok: false, error: 'userId required' });

    const db = await getDb();
    const conversations = await db.collection('conversations')
      .find({ userId })
      .sort({ updatedAt: -1 })
      .limit(50)
      .toArray();

    const list = conversations.map(c => ({
      id: c._id.toString(),
      title: c.title,
      messageCount: c.messages?.length || 0,
      lastMessage: c.messages?.[c.messages.length - 1]?.content?.substring(0, 50) || '',
      updatedAt: c.updatedAt,
      // إضافة معرف الجلسة (Session ID) لضمان التنظيم
      sessionId: c.sessionId || null 
    }));

    res.json({ ok: true, conversations: list });
  } catch (error) {
    res.json({ ok: false, error: error.message });
  }
});

// List all conversations for a user (POST) - for compatibility
router.post('/list', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.json({ ok: false, error: 'userId required' });

    const db = await getDb();
    const conversations = await db.collection('conversations')
      .find({ userId })
      .sort({ updatedAt: -1 })
      .limit(50)
      .toArray();

    const list = conversations.map(c => ({
      id: c._id.toString(),
      title: c.title,
      messageCount: c.messages?.length || 0,
      lastMessage: c.messages?.[c.messages.length - 1]?.content?.substring(0, 50) || '',
      updatedAt: c.updatedAt,
      sessionId: c.sessionId || null 
    }));

    res.json({ ok: true, conversations: list });
  } catch (error) {
    res.json({ ok: false, error: error.message });
  }
});

// Get a specific conversation
router.post('/get', async (req, res) => {
  try {
    const { conversationId } = req.body;
    if (!conversationId) return res.json({ ok: false, error: 'conversationId required' });

    const db = await getDb();
    const conversation = await db.collection('conversations')
      .findOne({ _id: new ObjectId(conversationId) });

    if (!conversation) {
      return res.json({ ok: false, error: 'Conversation not found' });
    }

    res.json({ ok: true, conversation });
  } catch (error) {
    res.json({ ok: false, error: error.message });
  }
});

// Delete a conversation
router.post('/delete', async (req, res) => {
  try {
    const { conversationId } = req.body;
    if (!conversationId) return res.json({ ok: false, error: 'conversationId required' });

    const db = await getDb();
    await db.collection('conversations').deleteOne({ _id: new ObjectId(conversationId) });

    res.json({ ok: true });
  } catch (error) {
    res.json({ ok: false, error: error.message });
  }
});

// Generate title using AI
router.post('/generate-title', async (req, res) => {
  try {
    const { conversationId, firstMessage } = req.body;
    if (!conversationId || !firstMessage) {
      return res.json({ ok: false, error: 'Required fields missing' });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    const prompt = `Generate a short, concise Arabic title (max 5 words) for a conversation that starts with: "${firstMessage}". Only return the title, nothing else.`;
    
    const result = await model.generateContent(prompt);
    const title = result.response.text().trim();

    const db = await getDb();
    await db.collection('conversations').updateOne(
      { _id: new ObjectId(conversationId) },
      { $set: { title } }
    );

    res.json({ ok: true, title });
  } catch (error) {
    res.json({ ok: false, error: error.message });
  }
});

export default router;