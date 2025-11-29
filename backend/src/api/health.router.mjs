import express from 'express'
import os from 'os'
import { getMode } from '../core/runtime-mode.mjs'
import { localLlamaService } from '../services/llm/local-llama.service.mjs'

const healthRouterFactory = ({ db, optionalAuth }) => {
  const router = express.Router()
  if (optionalAuth) router.use(optionalAuth)

  router.get('/', async (req, res) => {
    const mode = getMode()
    const offlineReady = localLlamaService.isReady()
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
      uptime: process.uptime(),
      loadavg: os.loadavg(),
      memory: process.memoryUsage(),
    })
  })

  return router
}

export default healthRouterFactory
