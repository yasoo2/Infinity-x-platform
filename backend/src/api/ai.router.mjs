import express from 'express';
import { getConfig, setActive } from '../services/ai/runtime-config.mjs';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

const aiRouterFactory = ({ optionalAuth }) => {
  const router = express.Router();
  if (optionalAuth) router.use(optionalAuth);

  router.get('/providers', async (_req, res) => {
    try {
      const cfg = getConfig();
      const available = [];
      const status = { openai: false, gemini: false };

      if (process.env.OPENAI_API_KEY) {
        available.push('openai');
        try {
          const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
          await client.models.list();
          status.openai = true;
        } catch { status.openai = false; }
      }
      if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) {
        available.push('gemini');
        try {
          const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
          void client.getGenerativeModel({ model: 'gemini-1.5-pro-latest' });
          status.gemini = true;
        } catch { status.gemini = false; }
      }

      res.json({
        ok: true,
        activeProvider: cfg.activeProvider || null,
        activeModel: cfg.activeModel || null,
        availableProviders: available,
        status
      });
    } catch (e) {
      res.status(500).json({ ok: false, message: e?.message || 'Failed to get AI providers' });
    }
  });

  router.post('/providers/activate', async (req, res) => {
    try {
      const { provider, model } = req.body || {};
      const p = String(provider || '').trim();
      const m = String(model || '').trim();
      if (!p) return res.status(400).json({ ok: false, message: 'provider is required' });
      if (p === 'openai' && !process.env.OPENAI_API_KEY) return res.status(400).json({ ok: false, message: 'OPENAI_API_KEY not set' });
      if (p === 'gemini' && !process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) return res.status(400).json({ ok: false, message: 'GEMINI_API_KEY/GOOGLE_API_KEY not set' });
      setActive(p, m || (p === 'openai' ? 'gpt-4o-mini' : 'gemini-1.5-pro-latest'));
      const cfg = getConfig();
      res.json({ ok: true, activeProvider: cfg.activeProvider, activeModel: cfg.activeModel });
    } catch (e) {
      res.status(500).json({ ok: false, message: e?.message || 'Failed to activate provider' });
    }
  });

  return router;
};

export default aiRouterFactory;
