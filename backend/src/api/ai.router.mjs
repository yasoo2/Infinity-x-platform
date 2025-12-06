import express from 'express'
import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { getConfig, setKey, setActive } from '../services/ai/runtime-config.mjs'

const aiRouterFactory = ({ optionalAuth, db }) => {
  const router = express.Router()
  if (optionalAuth) router.use(optionalAuth)

  router.get('/providers', async (req, res) => {
    try {
      const cfg = getConfig()
      const userId = req.user?._id?.toString?.() || req.user?.id || null
      let userCfg = null
      try {
        if (db && userId) {
          userCfg = await db.collection('ai_user_config').findOne({ userId })
        }
      } catch { /* noop */ }
      const merged = {
        activeProvider: userCfg?.activeProvider || cfg.activeProvider,
        activeModel: userCfg?.activeModel || cfg.activeModel,
        keys: {
          openai: (userCfg?.keys?.openai) || cfg.keys.openai,
          gemini: (userCfg?.keys?.gemini) || cfg.keys.gemini,
          anthropic: (userCfg?.keys?.anthropic) || cfg.keys?.anthropic,
          mistral: (userCfg?.keys?.mistral) || cfg.keys?.mistral,
          cohere: (userCfg?.keys?.cohere) || cfg.keys?.cohere,
          grok: (userCfg?.keys?.grok) || cfg.keys?.grok,
          openrouter: (userCfg?.keys?.openrouter) || cfg.keys?.openrouter,
        }
      }
      const providers = [
        { id: 'openai', name: 'OpenAI', defaultModel: 'gpt-4o', active: merged.activeProvider === 'openai', hasKey: !!merged.keys.openai },
        { id: 'gemini', name: 'Google Gemini', defaultModel: 'gemini-1.5-pro-latest', active: merged.activeProvider === 'gemini', hasKey: !!merged.keys.gemini },
        { id: 'anthropic', name: 'Anthropic Claude', defaultModel: 'claude-3-5-sonnet-latest', active: merged.activeProvider === 'anthropic', hasKey: !!merged.keys.anthropic },
        { id: 'mistral', name: 'Mistral AI', defaultModel: 'mistral-large-latest', active: merged.activeProvider === 'mistral', hasKey: !!merged.keys.mistral },
        { id: 'cohere', name: 'Cohere', defaultModel: 'command-r-plus', active: merged.activeProvider === 'cohere', hasKey: !!merged.keys.cohere },
        { id: 'groq', name: 'Groq', defaultModel: 'llama3-70b-8192', active: merged.activeProvider === 'groq', hasKey: !!merged.keys.grok },
        { id: 'openrouter', name: 'OpenRouter', defaultModel: 'openrouter/auto', active: merged.activeProvider === 'openrouter', hasKey: !!merged.keys.openrouter },
      ]
      res.json({ success: true, providers, activeProvider: merged.activeProvider, activeModel: merged.activeModel })
    } catch (e) {
      res.status(500).json({ success: false, message: e?.message || 'FAILED_PROVIDERS' })
    }
  })

  router.post('/validate', async (req, res) => {
    try {
      const provider = String(req.body?.provider || '').trim()
      const apiKey = String(req.body?.apiKey || '').trim()
      const scope = String(req.body?.scope || '').trim() || 'user' // 'user' | 'global'
      if (!provider || !apiKey) {
        return res.status(400).json({ success: false, error: 'MISSING_FIELDS' })
      }

      if (provider === 'openai') {
        try {
          const client = new OpenAI({ apiKey })
          // Prefer a minimal completion call instead of listing models (which requires api.model.read scope)
          const ping = await client.chat.completions.create({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: 'ping' }] })
          const ok = !!ping?.id
          if (!ok) return res.status(400).json({ success: false, error: 'OPENAI_VERIFY_FAILED', code: 'OPENAI_VERIFY_FAILED' })
          setKey('openai', apiKey)
          try {
            const userId = req.user?._id?.toString?.() || req.user?.id || null
            if (scope === 'user' && db && userId) {
              await db.collection('ai_user_config').updateOne(
                { userId },
                { $set: { userId, keys: { openai: apiKey }, updatedAt: new Date() } },
                { upsert: true }
              )
            }
          } catch { /* noop */ }
          return res.json({ success: true, provider: 'openai', models: ['gpt-4o', 'gpt-4o-mini'] })
        } catch (e) {
          // Fallback: attempt with gpt-4o
          try {
            const client2 = new OpenAI({ apiKey })
            const ping2 = await client2.chat.completions.create({ model: 'gpt-4o', messages: [{ role: 'user', content: 'ping' }] })
            const ok2 = !!ping2?.id
            if (!ok2) throw e
            setKey('openai', apiKey)
            try {
              const userId = req.user?._id?.toString?.() || req.user?.id || null
              if (scope === 'user' && db && userId) {
                await db.collection('ai_user_config').updateOne(
                  { userId },
                  { $set: { userId, keys: { openai: apiKey }, updatedAt: new Date() } },
                  { upsert: true }
                )
              }
            } catch { /* noop */ }
            return res.json({ success: true, provider: 'openai', models: ['gpt-4o', 'gpt-4o-mini'] })
          } catch (e2) {
            const m = String(e2?.message || e?.message || '')
            const status = Number(e2?.status || e2?.response?.status || e?.status || e?.response?.status || 0)
            const insufficient = /insufficient permissions|missing scopes|scope/i.test(m)
            if (insufficient) {
              return res.status(401).json({ success: false, error: 'INSUFFICIENT_SCOPES', code: 'INSUFFICIENT_SCOPES', message: 'The API key lacks required scope (model.request). Create a non-restricted key or adjust organization/project roles.' })
            }
            const rateLimited = status === 429 || /rate limit|too many requests/i.test(m)
            if (rateLimited) {
              return res.status(429).json({ success: false, error: 'RATE_LIMITED', code: 'RATE_LIMITED', message: m || 'RATE_LIMITED' })
            }
            const upstreamDown = (status >= 500 && status < 600) || /bad gateway|gateway|timeout|timed out|fetch failed|ECONNRESET|ENOTFOUND|EAI_AGAIN/i.test(m)
            if (upstreamDown) {
              return res.status(502).json({ success: false, error: 'UPSTREAM_UNAVAILABLE', code: 'UPSTREAM_UNAVAILABLE', message: m || 'OPENAI_UNAVAILABLE' })
            }
            return res.status(400).json({ success: false, error: 'OPENAI_VERIFY_FAILED', code: 'OPENAI_VERIFY_FAILED', message: m || 'OPENAI_VERIFY_FAILED' })
          }
        }
      }

      if (provider === 'gemini') {
        try {
          const client = new GoogleGenerativeAI(apiKey)
          const model = client.getGenerativeModel({ model: 'gemini-1.5-pro-latest' })
          // Minimal content generation to verify key validity without listing models
          const resp = await model.generateContent({ contents: [{ role: 'user', parts: [{ text: 'ping' }] }] }).catch(() => null)
          const ok = !!resp
          if (!ok) return res.status(400).json({ success: false, error: 'GEMINI_VERIFY_FAILED', code: 'GEMINI_VERIFY_FAILED' })
          setKey('gemini', apiKey)
          try {
            const userId = req.user?._id?.toString?.() || req.user?.id || null
            if (scope === 'user' && db && userId) {
              await db.collection('ai_user_config').updateOne(
                { userId },
                { $set: { userId, keys: { gemini: apiKey }, updatedAt: new Date() } },
                { upsert: true }
              )
            }
          } catch { /* noop */ }
          return res.json({ success: true, provider: 'gemini', models: ['gemini-1.5-pro-latest'] })
        } catch (e) {
          const m = String(e?.message || '')
          const status = Number(e?.status || e?.response?.status || 0)
          const insufficient = /insufficient permissions|missing scopes|scope/i.test(m)
          if (insufficient) {
            return res.status(401).json({ success: false, error: 'INSUFFICIENT_SCOPES', code: 'INSUFFICIENT_SCOPES', message: 'The API key lacks required scope. Ensure the key allows model requests and your role has sufficient permissions.' })
          }
          const rateLimited = status === 429 || /rate limit|too many requests/i.test(m)
          if (rateLimited) {
            return res.status(429).json({ success: false, error: 'RATE_LIMITED', code: 'RATE_LIMITED', message: m || 'RATE_LIMITED' })
          }
          const upstreamDown = (status >= 500 && status < 600) || /bad gateway|gateway|timeout|timed out|fetch failed|ECONNRESET|ENOTFOUND|EAI_AGAIN/i.test(m)
          if (upstreamDown) {
            return res.status(502).json({ success: false, error: 'UPSTREAM_UNAVAILABLE', code: 'UPSTREAM_UNAVAILABLE', message: m || 'GEMINI_UNAVAILABLE' })
          }
          return res.status(400).json({ success: false, error: 'GEMINI_VERIFY_FAILED', code: 'GEMINI_VERIFY_FAILED', message: m || 'GEMINI_VERIFY_FAILED' })
        }
      }

      return res.status(400).json({ success: false, error: 'UNSUPPORTED_PROVIDER' })
    } catch (e) {
      res.status(500).json({ success: false, error: 'SERVER_ERROR', message: e?.message })
    }
  })

  router.post('/activate', async (req, res) => {
    try {
      const provider = String(req.body?.provider || '').trim()
      const model = String(req.body?.model || '').trim()
      const scope = String(req.body?.scope || '').trim() || 'user'
      const cfg = getConfig()
      const hasKey = provider === 'openai' ? !!cfg.keys.openai : (provider === 'gemini' ? !!cfg.keys.gemini : false)
      if (!provider) return res.status(400).json({ success: false, error: 'MISSING_PROVIDER' })
      if (!hasKey) return res.status(400).json({ success: false, error: 'MISSING_KEY' })
      const defaultModel = provider === 'openai' ? 'gpt-4o' : (provider === 'gemini' ? 'gemini-1.5-pro-latest' : null)
      setActive(provider, model || defaultModel)
      try {
        const userId = req.user?._id?.toString?.() || req.user?.id || null
        if (scope === 'user' && db && userId) {
          await db.collection('ai_user_config').updateOne(
            { userId },
            { $set: { userId, activeProvider: provider, activeModel: (model || defaultModel), updatedAt: new Date() } },
            { upsert: true }
          )
        }
      } catch { /* noop */ }
      const next = getConfig()
      return res.json({ success: true, activeProvider: next.activeProvider, activeModel: next.activeModel })
    } catch (e) {
      res.status(500).json({ success: false, error: 'SERVER_ERROR', message: e?.message })
    }
  })

  router.get('/engine/status', async (req, res) => {
    try {
      const cfg = getConfig()
      const userId = req.user?._id?.toString?.() || req.user?.id || null
      let userCfg = null
      try {
        if (db && userId) {
          userCfg = await db.collection('ai_user_config').findOne({ userId })
        }
      } catch { /* noop */ }
      const provider = userCfg?.activeProvider || cfg.activeProvider
      const model = userCfg?.activeModel || cfg.activeModel
      const mode = provider === 'openai' ? 'openai' : (provider === 'gemini' ? 'gemini' : 'unknown')
      res.json({ ok: true, mode, provider, model })
    } catch (e) {
      res.status(500).json({ ok: false, error: 'ENGINE_STATUS_FAILED', message: e?.message })
    }
  })

  return router
}

export default aiRouterFactory
