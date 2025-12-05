import express from 'express'
// runtime mode toggling disabled
// Local LLaMA removed from Joe system
import config from '../config.mjs'
import { getConfig } from '../services/ai/runtime-config.mjs'

const runtimeModeRouterFactory = ({ optionalAuth }) => {
  const router = express.Router()
  if (optionalAuth) router.use(optionalAuth)

  router.get('/status', (req, res) => {
    const cfg = getConfig();
    const hasProvider = Boolean(cfg?.keys?.openai || cfg?.keys?.gemini);
    res.json({ success: true, mode: 'online', offlineReady: false, loading: false, stage: 'disabled', percent: 0, version: config.VERSION, hasProvider, modelPath: '' })
  })

  router.post('/toggle', (req, res) => {
    res.json({ success: true, mode: 'online' })
  })

  router.post('/load', async (req, res) => {
    res.json({ success: false, error: 'LOCAL_DISABLED', loading: false, stage: 'disabled', percent: 0 })
  })

  router.post('/set', (req, res) => {
    res.json({ success: true, mode: 'online' })
  })

  return router
}

export default runtimeModeRouterFactory
