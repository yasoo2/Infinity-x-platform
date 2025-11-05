import express from 'express';
import cors from 'cors';
import JOEngine from './index.mjs';

export function createApiServer(joengine) {
  const app = express();
  app.use(express.json());
  app.use(cors());

  app.post('/api/v1/joe/chat-advanced', async (req, res) => {
    const { message, conversationId, tokens, aiEngine } = req.body;

    try {
      const response = await joengine.reasoningEngine.analyzeGoal(message, { conversationId, tokens, aiEngine });
      res.json({ ok: true, response });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  return app;
}
