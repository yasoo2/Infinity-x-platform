import express from 'express'
import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { getConfig, setKey, setActive } from '../services/ai/runtime-config.mjs'

const aiRouterFactory = ({ optionalAuth }) => {
  const router = express.Router()
  if (optionalAuth) router.use(optionalAuth)

  router.get('/providers', (req, res) => {
    try {
      const cfg = getConfig()
      const providers = [
        {
          id: 'openai',
          name: 'OpenAI',
          active: cfg.activeProvider === 'openai',
          hasKey: !!cfg.keys.openai,
          defaultModel: 'gpt-4o'
        },
        {
          id: 'gemini',
          name: 'Google Gemini',
          active: cfg.activeProvider === 'gemini',
          hasKey: !!cfg.keys.gemini,
          defaultModel: 'gemini-1.5-pro-latest'
        }
      ]
      res.json({ success: true, providers })
    } catch (e) {
      res.status(500).json({ success: false, message: e?.message || 'FAILED_PROVIDERS' })
    }
  })

  router.post('/validate', async (req, res) => {
    try {
      const provider = String(req.body?.provider || '').trim()
      const apiKey = String(req.body?.apiKey || '').trim()
      if (!provider || !apiKey) {
        return res.status(400).json({ success: false, error: 'MISSING_FIELDS' })
      }

      if (provider === 'openai') {
        try {
          const client = new OpenAI({ apiKey })
          const list = await client.models.list()
          const ok = Array.isArray(list?.data) && list.data.length > 0
          if (!ok) return res.status(400).json({ success: false, error: 'NO_MODELS' })
          setKey('openai', apiKey)
          return res.json({ success: true, provider: 'openai', models: list.data.map(m => m.id) })
        } catch (e) {
          const msg = e?.message || 'OPENAI_VERIFY_FAILED'
          return res.status(400).json({ success: false, error: msg })
        }
      }

      if (provider === 'gemini') {
        try {
          const client = new GoogleGenerativeAI(apiKey)
          const model = client.getGenerativeModel({ model: 'gemini-1.5-pro-latest' })
          void model
          setKey('gemini', apiKey)
          return res.json({ success: true, provider: 'gemini', models: ['gemini-1.5-pro-latest'] })
        } catch (e) {
          const msg = e?.message || 'GEMINI_VERIFY_FAILED'
          return res.status(400).json({ success: false, error: msg })
        }
      }

      return res.status(400).json({ success: false, error: 'UNSUPPORTED_PROVIDER' })
    } catch (e) {
      res.status(500).json({ success: false, error: 'SERVER_ERROR', message: e?.message })
    }
  })

  router.post('/activate', (req, res) => {
    try {
      const provider = String(req.body?.provider || '').trim()
      const model = String(req.body?.model || '').trim()
      const cfg = getConfig()
      const hasKey = provider === 'openai' ? !!cfg.keys.openai : (provider === 'gemini' ? !!cfg.keys.gemini : false)
      if (!provider) return res.status(400).json({ success: false, error: 'MISSING_PROVIDER' })
      if (!hasKey) return res.status(400).json({ success: false, error: 'MISSING_KEY' })
      const defaultModel = provider === 'openai' ? 'gpt-4o' : (provider === 'gemini' ? 'gemini-1.5-pro-latest' : null)
      setActive(provider, model || defaultModel)
      const next = getConfig()
      return res.json({ success: true, activeProvider: next.activeProvider, activeModel: next.activeModel })
    } catch (e) {
      res.status(500).json({ success: false, error: 'SERVER_ERROR', message: e?.message })
    }
  })

  return router
}

export default aiRouterFactory
