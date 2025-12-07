import express from 'express'
import { getConfig } from '../services/ai/runtime-config.mjs'

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

  return router
}

export default aiRouterFactory
