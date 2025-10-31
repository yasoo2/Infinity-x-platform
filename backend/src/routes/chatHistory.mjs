import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getDb } from '../db.mjs';

const router = express.Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Create new conversation
router.post('/create', async (req, res) => {
  try {
    const { userId, title } = req.body;

    if (!userId) {
      return res.json({ ok: false, error: 'User ID required' });
    }

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
    console.error('Create conversation error:', error);
    res.json({ ok: false, error: error.message });
  }
});

// Get all conversations for a user
router.post('/list', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.json({ ok: false, error: 'User ID required' });
    }

    const db = await getDb();
    const conversations = await db.collection('conversations')
      .find({ userId })
      .sort({ updatedAt: -1 })
      .toArray();

    res.json({ ok: true, conversations });

  } catch (error) {
    console.error('List conversations error:', error);
    res.json({ ok: false, error: error.message });
  }
});

// Get single conversation
router.post('/get', async (req, res) => {
  try {
    const { conversationId } = req.body;

    if (!conversationId) {
      return res.json({ ok: false, error: 'Conversation ID required' });
    }

    const db = await getDb();
    const { ObjectId } = await import('mongodb');
    const conversation = await db.collection('conversations')
      .findOne({ _id: new ObjectId(conversationId) });

    if (!conversation) {
      return res.json({ ok: false, error: 'Conversation not found' });
    }

    res.json({ ok: true, conversation });

  } catch (error) {
    console.error('Get conversation error:', error);
    res.json({ ok: false, error: error.message });
  }
});

// Add message to conversation
router.post('/add-message', async (req, res) => {
  try {
    const { conversationId, message } = req.body;

    if (!conversationId || !message) {
      return res.json({ ok: false, error: 'Conversation ID and message required' });
    }

    const db = await getDb();
    const { ObjectId } = await import('mongodb');

    const messageObj = {
      id: Date.now() + Math.random(),
      content: message.content,
      type: message.type || 'user',
      timestamp: new Date().toLocaleTimeString(),
      createdAt: new Date()
    };

    await db.collection('conversations').updateOne(
      { _id: new ObjectId(conversationId) },
      {
        $push: { messages: messageObj },
        $set: { updatedAt: new Date() }
      }
    );

    res.json({ ok: true, message: messageObj });

  } catch (error) {
    console.error('Add message error:', error);
    res.json({ ok: false, error: error.message });
  }
});

// Generate title for conversation
router.post('/generate-title', async (req, res) => {
  try {
    const { conversationId, firstMessage } = req.body;

    if (!conversationId) {
      return res.json({ ok: false, error: 'Conversation ID required' });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const prompt = `Generate a short, concise title (max 5 words) in Arabic for a conversation that starts with: "${firstMessage}"

Just return the title, nothing else.`;

    const result = await model.generateContent(prompt);
    const title = result.response.text().trim();

    // Update conversation title
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

// Delete conversation
router.post('/delete', async (req, res) => {
  try {
    const { conversationId } = req.body;

    if (!conversationId) {
      return res.json({ ok: false, error: 'Conversation ID required' });
    }

    const db = await getDb();
    const { ObjectId } = await import('mongodb');
    await db.collection('conversations').deleteOne({ _id: new ObjectId(conversationId) });

    res.json({ ok: true, message: 'Conversation deleted' });

  } catch (error) {
    console.error('Delete conversation error:', error);
    res.json({ ok: false, error: error.message });
  }
});

// Update conversation title
router.post('/update-title', async (req, res) => {
  try {
    const { conversationId, title } = req.body;

    if (!conversationId || !title) {
      return res.json({ ok: false, error: 'Conversation ID and title required' });
    }

    const db = await getDb();
    const { ObjectId } = await import('mongodb');
    await db.collection('conversations').updateOne(
      { _id: new ObjectId(conversationId) },
      { $set: { title, updatedAt: new Date() } }
    );

    res.json({ ok: true, message: 'Title updated' });

  } catch (error) {
    console.error('Update title error:', error);
    res.json({ ok: false, error: error.message });
  }
});

export default router;
