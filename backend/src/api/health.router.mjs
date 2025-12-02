import express from 'express'
import os from 'os'
import { getMode } from '../core/runtime-mode.mjs'
import toolManager from '../services/tools/tool-manager.service.mjs'
import { getConfig } from '../services/ai/runtime-config.mjs'

const healthRouterFactory = ({ db, optionalAuth }) => {
  const router = express.Router()
  if (optionalAuth) router.use(optionalAuth)

  router.get('/', async (req, res) => {
    const mode = getMode()
    let offlineReady = false
    try {
      const mod = await import('../services/llm/local-llama.service.mjs')
      const svc = mod?.localLlamaService
      offlineReady = Boolean(svc && typeof svc.isReady === 'function' && svc.isReady())
    } catch { offlineReady = false }
    const { activeProvider, activeModel } = getConfig()
    let dbOk = false
    try {
      if (db) {
        const mongo = await db()
        await mongo.command({ ping: 1 })
        dbOk = true
      }
    } catch {
      dbOk = false
    }
    res.json({
      success: true,
      status: 'ok',
      mode,
      offlineReady,
      db: dbOk ? 'up' : 'down',
      toolsCount: Array.isArray(toolManager.getToolSchemas?.()) ? toolManager.getToolSchemas().length : 0,
      ai: { activeProvider, activeModel },
      uptime: process.uptime(),
      loadavg: os.loadavg(),
      memory: process.memoryUsage(),
    })
  })

  return router
}

export default healthRouterFactory
