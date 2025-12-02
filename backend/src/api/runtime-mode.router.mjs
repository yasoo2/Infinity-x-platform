import express from 'express'
import { getMode, toggleMode, setMode } from '../core/runtime-mode.mjs'
import { localLlamaService } from '../services/llm/local-llama.service.mjs'
import config from '../config.mjs'
import { getConfig } from '../services/ai/runtime-config.mjs'

const runtimeModeRouterFactory = ({ optionalAuth }) => {
  const router = express.Router()
  if (optionalAuth) router.use(optionalAuth)

  router.get('/status', (req, res) => {
    const cfg = getConfig();
    const hasProvider = Boolean(cfg?.keys?.openai || cfg?.keys?.gemini);
    if (!hasProvider && !localLlamaService.isReady() && !localLlamaService.loading) {
      try { localLlamaService.startInitialize(); } catch { /* ignore */ }
    }
    res.json({ success: true, mode: getMode(), offlineReady: localLlamaService.isReady(), loading: localLlamaService.loading, stage: localLlamaService.loadingStage, percent: localLlamaService.loadingPercent, version: config.VERSION, hasProvider, modelPath: localLlamaService.modelPath })
  })

  router.post('/toggle', (req, res) => {
    const current = getMode()
    const next = current === 'online' ? 'offline' : 'online'
    if (next === 'offline' && !localLlamaService.isReady()) {
      return res.status(400).json({ success: false, error: 'OFFLINE_NOT_READY', mode: current, offlineReady: false })
    }
    const applied = toggleMode()
    res.json({ success: true, mode: applied })
  })

  router.post('/load', async (req, res) => {
    try {
      localLlamaService.startInitialize()
      res.json({ success: true, started: true, loading: localLlamaService.loading, stage: localLlamaService.loadingStage, percent: localLlamaService.loadingPercent })
    } catch (e) {
      res.status(500).json({ success: false, error: e?.message || 'INIT_FAILED' })
    }
  })

  router.post('/set', (req, res) => {
    const m = String(req.body?.mode || '').toLowerCase()
    setMode(m)
    res.json({ success: true, mode: getMode() })
  })

  return router
}

export default runtimeModeRouterFactory
