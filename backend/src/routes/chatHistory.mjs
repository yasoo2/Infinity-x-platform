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
      id: Date.now() + Math.random(),
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

// باقي الروابط (create, list, get, etc.) زي ما هي...

export default router;