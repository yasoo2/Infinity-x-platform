import express from 'express';
import { ObjectId } from 'mongodb';

// REFACTORED: Import AI services correctly
import { getOpenAI } from '../services/ai/ai-engine.service.mjs';

const chatHistoryRouterFactory = ({ requireRole, db }) => {
    const router = express.Router();

    // Middleware to ensure conversation ownership
    const checkOwnership = async (req, res, next) => {
        try {
            const mongoDb = await db();
            const { conversationId } = req.body.conversationId ? req.body : req.params;
            const conversation = await mongoDb.collection('conversations').findOne({ _id: new ObjectId(conversationId) });

            if (!conversation) {
                return res.status(404).json({ success: false, error: 'Conversation not found' });
            }
            // Allow admins to bypass ownership check
            if (req.user.role !== 'SUPER_ADMIN' && conversation.userId.toString() !== req.user._id.toString()) {
                return res.status(403).json({ success: false, error: 'Forbidden: You do not own this conversation' });
            }
            req.conversation = conversation;
            next();
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    };

    // Create a new conversation
    router.post('/create', requireRole('USER'), async (req, res) => {
        try {
            const mongoDb = await db();
            const { title } = req.body;
            const now = new Date();

            const newConversation = {
                userId: new ObjectId(req.user._id),
                title: title || 'New Conversation',
                messages: [],
                createdAt: now,
                updatedAt: now,
            };

            const result = await mongoDb.collection('conversations').insertOne(newConversation);
            res.status(201).json({ success: true, conversationId: result.insertedId.toString() });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // Add a message to a conversation
    router.post('/:conversationId/messages', requireRole('USER'), checkOwnership, async (req, res) => {
        try {
            const mongoDb = await db();
            const { message } = req.body;
            const now = new Date();

            const messageObj = {
                _id: new ObjectId(),
                role: message.role || 'user',
                content: message.content,
                createdAt: now,
            };

            await mongoDb.collection('conversations').updateOne(
                { _id: req.conversation._id },
                { $push: { messages: messageObj }, $set: { updatedAt: now } }
            );
            res.status(201).json({ success: true, message: messageObj });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // List conversations for the logged-in user
    router.get('/', requireRole('USER'), async (req, res) => {
        try {
            const mongoDb = await db();
            const conversations = await mongoDb.collection('conversations')
                .find({ userId: new ObjectId(req.user._id) })
                .sort({ updatedAt: -1 })
                .project({ title: 1, updatedAt: 1, createdAt: 1 }) // Project only necessary fields
                .toArray();
            res.json({ success: true, conversations });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // Get a single conversation with all messages
    router.get('/:conversationId', requireRole('USER'), checkOwnership, (req, res) => {
        res.json({ success: true, conversation: req.conversation });
    });

    // Delete a conversation
    router.delete('/:conversationId', requireRole('USER'), checkOwnership, async (req, res) => {
        try {
            const mongoDb = await db();
            await mongoDb.collection('conversations').deleteOne({ _id: req.conversation._id });
            res.json({ success: true, message: 'Conversation deleted' });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // Generate a title for a conversation using AI
    router.post('/:conversationId/generate-title', requireRole('USER'), checkOwnership, async (req, res) => {
        try {
            const firstMessage = req.conversation.messages[0]?.content;
            if (!firstMessage) {
                return res.status(400).json({ success: false, error: 'Conversation has no messages to generate a title from.' });
            }
            
            const ai = getOpenAI();
            const prompt = `Generate a short, concise Arabic title (max 5 words) for a conversation that starts with: "${firstMessage}". Only return the title.`;
            const title = await ai.generateResponse(prompt, []);

            const mongoDb = await db();
            await mongoDb.collection('conversations').updateOne(
                { _id: req.conversation._id },
                { $set: { title } }
            );

            res.json({ success: true, title });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    return router;
};

export default chatHistoryRouterFactory;
