import express from 'express'
import { getConfig, setActive, setKey } from '../services/ai/runtime-config.mjs'
import { OpenAI } from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'

const aiRouterFactory = ({ optionalAuth } = {}) => {
  const router = express.Router()
  if (optionalAuth) router.use(optionalAuth)

  router.get('/engine/status', async (_req, res) => {
    try {
      const cfg = getConfig()
      const provider = cfg.activeProvider || null
      const model = cfg.activeModel || null
      const providers = []
      const hasOpenAI = !!process.env.OPENAI_API_KEY
      const hasGemini = !!process.env.GOOGLE_API_KEY || !!process.env.GOOGLE_GENERATIVE_AI_API_KEY
      if (hasOpenAI) providers.push({ name: 'openai', models: [cfg.activeModel || 'gpt-4o', 'gpt-4o-mini', 'o3-mini'].filter(Boolean) })
      if (hasGemini) providers.push({ name: 'gemini', models: ['gemini-1.5-pro', 'gemini-1.5-flash'] })
      const ok = !!provider && !!model
      return res.json({ success: true, ok, provider, model, providers })
    } catch {
      return res.status(200).json({ success: true, ok: false, provider: null, model: null, providers: [] })
    }
  })

  router.get('/providers', async (_req, res) => {
    try {
      const cfg = getConfig()
      const hasOpenAI = !!process.env.OPENAI_API_KEY
      const hasGemini = !!process.env.GOOGLE_API_KEY || !!process.env.GOOGLE_GENERATIVE_AI_API_KEY
      return res.json({ success: true, activeProvider: cfg.activeProvider || null, activeModel: cfg.activeModel || null, available: { openai: hasOpenAI, gemini: hasGemini } })
    } catch {
      return res.json({ success: true, activeProvider: null, activeModel: null, available: { openai: false, gemini: false } })
    }
  })

  router.post('/validate', async (req, res) => {
    try {
      const provider = String(req.body?.provider || '').trim().toLowerCase()
      const apiKey = String(req.body?.apiKey || '').trim()
      if (!provider) return res.status(400).json({ ok: false, message: 'provider is required' })
      if (!apiKey) return res.status(400).json({ ok: false, message: 'apiKey is required' })
      let ok = false
      if (provider === 'openai') {
        try {
          const client = new OpenAI({ apiKey })
          const resp = await client.models.list()
          ok = Array.isArray(resp?.data)
        } catch { ok = false }
      } else if (provider === 'gemini') {
        try {
          const client = new GoogleGenerativeAI(apiKey)
          const model = client.getGenerativeModel({ model: 'gemini-1.5-pro-latest' })
          const resp = await model.generateContent({ contents: [{ role: 'user', parts: [{ text: 'ping' }] }] })
          ok = !!resp
        } catch { ok = false }
      } else {
        return res.status(400).json({ ok: false, message: 'unsupported provider' })
      }
      if (ok) {
        try { setKey(provider, apiKey) } catch { /* noop */ }
      }
      return res.json({ ok })
    } catch (e) {
      return res.status(500).json({ ok: false, message: e?.message || 'VALIDATE_FAILED' })
    }
  })

  router.post('/activate', async (req, res) => {
    try {
      const provider = String(req.body?.provider || '').trim().toLowerCase()
      const model = String(req.body?.model || '').trim()
      if (!provider) return res.status(400).json({ ok: false, message: 'provider is required' })
      const cfg = getConfig()
      const hasKey = !!(cfg?.keys?.[provider])
      const hasEnv = provider === 'openai' ? !!process.env.OPENAI_API_KEY : !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY)
      if (!hasKey && !hasEnv) return res.status(400).json({ ok: false, message: 'provider key not configured' })
      const defaultModel = provider === 'openai' ? 'gpt-4o' : 'gemini-1.5-pro-latest'
      try { setActive(provider, model || defaultModel) } catch { /* noop */ }
      const c = getConfig()
      return res.json({ ok: true, activeProvider: c.activeProvider, activeModel: c.activeModel })
    } catch (e) {
      return res.status(500).json({ ok: false, message: e?.message || 'ACTIVATE_FAILED' })
    }
  })

  return router
}

export default aiRouterFactory
