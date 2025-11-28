import express from 'express';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getConfig, setActive, setKey } from '../services/ai/runtime-config.mjs';
import { requireAdmin } from '../middleware/auth.mjs';
import jwt from 'jsonwebtoken';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

const aiRouterFactory = ({ optionalAuth, requireRole }) => {
  const router = express.Router();
  router.use(optionalAuth);

  // Allow any authenticated user (user/admin/super_admin)
  const allowLoggedIn = (req, res, next) => {
    if (req.user) return next();
    try {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];
      if (!token) return res.status(403).json({ ok: false, error: 'ACCESS_DENIED' });
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded?.userId || decoded?.role === 'guest') return next();
      return res.status(403).json({ ok: false, error: 'ACCESS_DENIED' });
    } catch {
      return res.status(403).json({ ok: false, error: 'ACCESS_DENIED' });
    }
  };

  const allowSuperAdmin = (req, res, next) => {
    if (req.user?.role === 'super_admin') return next();
    try {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];
      if (!token) return res.status(403).json({ ok: false, error: 'ACCESS_DENIED' });
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded?.role === 'super_admin') return next();
      return res.status(403).json({ ok: false, error: 'ACCESS_DENIED' });
    } catch {
      return res.status(403).json({ ok: false, error: 'ACCESS_DENIED' });
    }
  };

  // In-memory active provider and model
  let { activeProvider, activeModel } = getConfig();

  const providers = [
    { id: 'openai', name: 'OpenAI', createUrl: 'https://platform.openai.com/api-keys', defaultModel: 'gpt-4o' },
    { id: 'gemini', name: 'Google Gemini', createUrl: 'https://aistudio.google.com/app/apikey', defaultModel: 'gemini-1.5-pro-latest' },
    { id: 'grok', name: 'xAI Grok', createUrl: 'https://console.x.ai/', defaultModel: 'grok-2' },
    { id: 'anthropic', name: 'Anthropic Claude', createUrl: 'https://console.anthropic.com/account/keys', defaultModel: 'claude-3-5-sonnet-latest' },
    { id: 'mistral', name: 'Mistral AI', createUrl: 'https://console.mistral.ai/api-keys/', defaultModel: 'mistral-large-latest' },
    { id: 'cohere', name: 'Cohere', createUrl: 'https://dashboard.cohere.com/api-keys', defaultModel: 'command-r-plus' },
    { id: 'azure-openai', name: 'Azure OpenAI', createUrl: 'https://portal.azure.com/#view/Microsoft_Azure_ProjectOxford/CompositeKeys', defaultModel: 'gpt-4o' },
    { id: 'aws-bedrock', name: 'AWS Bedrock', createUrl: 'https://us-east-1.console.aws.amazon.com/bedrock/home', defaultModel: 'anthropic.claude-3-sonnet' },
    { id: 'huggingface', name: 'Hugging Face', createUrl: 'https://huggingface.co/settings/tokens', defaultModel: 'tiiuae/falcon-180b' },
    { id: 'together', name: 'Together AI', createUrl: 'https://api.together.xyz/settings/api-keys', defaultModel: 'meta-llama/Meta-Llama-3-70B-Instruct' },
    { id: 'replicate', name: 'Replicate', createUrl: 'https://replicate.com/account/api-tokens', defaultModel: 'meta/llama-3-70b-instruct' },
    { id: 'octoai', name: 'OctoAI', createUrl: 'https://octoai.cloud/dashboard/keys', defaultModel: 'meta-llama/llama-3-70b-instruct' },
    { id: 'openrouter', name: 'OpenRouter', createUrl: 'https://openrouter.ai/settings/keys', defaultModel: 'openrouter/auto' },
    { id: 'groq', name: 'Groq', createUrl: 'https://console.groq.com/keys', defaultModel: 'llama3-70b-8192' },
    { id: 'perplexity', name: 'Perplexity', createUrl: 'https://www.perplexity.ai/settings', defaultModel: 'pplx-70b-online' },
    { id: 'stability', name: 'Stability AI', createUrl: 'https://platform.stability.ai/account/keys', defaultModel: 'stable-diffusion-xl' },
    { id: 'meta', name: 'Meta LLaMA (via providers)', createUrl: 'https://llama.meta.com/', defaultModel: 'llama-3-70b-instruct' },
    { id: 'ollama', name: 'Ollama (Local)', createUrl: 'https://ollama.ai/', defaultModel: 'llama3:latest' },
    { id: 'lmstudio', name: 'LM Studio (Local)', createUrl: 'https://lmstudio.ai/', defaultModel: 'llama-3-70b-instruct' },
    { id: 'ibm-watsonx', name: 'IBM watsonx', createUrl: 'https://cloud.ibm.com/watsonx', defaultModel: 'ibm/granite-20b-instruct' },
    { id: 'databricks-mosaic', name: 'Databricks Mosaic', createUrl: 'https://www.databricks.com/product/mosaic-ai', defaultModel: 'db/mpt-7b-instruct' },
    { id: 'snowflake-cortex', name: 'Snowflake Cortex', createUrl: 'https://www.snowflake.com/en/data-cloud/cortex/', defaultModel: 'snowflake/llm' },
  ];

  router.get('/providers', allowLoggedIn, (req, res) => {
    const status = providers.map(p => ({
      ...p,
      isActive: p.id === activeProvider,
      hasEnvKey: !!(
        (p.id === 'openai' && process.env.OPENAI_API_KEY) ||
        (p.id === 'gemini' && process.env.GOOGLE_API_KEY) ||
        (p.id === 'grok' && process.env.GROK_API_KEY)
      ),
    }));
    res.json({ ok: true, providers: status, activeProvider, activeModel });
  });

  router.post('/activate', allowSuperAdmin, (req, res) => {
    const { provider, model } = req.body || {};
    if (!provider || !providers.find(p => p.id === provider)) {
      return res.status(400).json({ ok: false, error: 'UNKNOWN_PROVIDER' });
    }
    activeProvider = provider;
    const def = providers.find(p => p.id === provider)?.defaultModel;
    activeModel = model || def || activeModel;
    setActive(activeProvider, activeModel);
    return res.json({ ok: true, activeProvider, activeModel });
  });

  router.post('/validate', allowLoggedIn, async (req, res) => {
    try {
      const { provider, apiKey } = req.body || {};
      if (!provider || !apiKey) {
        return res.status(400).json({ ok: false, error: 'PROVIDER_AND_API_KEY_REQUIRED' });
      }
      if (provider === 'openai') {
        const client = new OpenAI({ apiKey });
        // Simple lightweight request
        await client.models.list();
        setKey('openai', apiKey);
        return res.json({ ok: true, valid: true });
      } else if (provider === 'gemini') {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const r = await model.generateContent('ping');
        if (r?.response?.text) {
          setKey('gemini', apiKey);
          return res.json({ ok: true, valid: true });
        }
        return res.json({ ok: true, valid: false });
      } else {
        return res.status(501).json({ ok: false, error: 'VALIDATION_NOT_IMPLEMENTED' });
      }
    } catch (error) {
      return res.status(200).json({ ok: true, valid: false, message: error.message });
    }
  });

  router.get('/active', requireAdmin, (req, res) => {
    const { activeProvider: ap, activeModel: am } = getConfig();
    res.json({ ok: true, activeProvider: ap, activeModel: am });
  });

  return router;
};

export default aiRouterFactory;
