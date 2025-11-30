import express from 'express'
import { learningSystem } from '../systems/learning.service.mjs'
import { getDB } from '../services/db.mjs'

const learningRouterFactory = ({ optionalAuth }) => {
  const router = express.Router()
  if (optionalAuth) router.use(optionalAuth)

  router.get('/stats', async (_req, res) => {
    try {
      const db = await getDB()
      const stats = await learningSystem.getStats(db)
      res.json({ success: true, stats })
    } catch (e) {
      res.status(500).json({ success: false, message: e?.message || String(e) })
    }
  })

  router.post('/feedback', async (req, res) => {
    try {
      const { sessionId, userId, request, response, success, score, comment, toolsUsed, executionTime } = req.body || {}
      const interaction = { sessionId, userId, request, response, success: !!success, toolsUsed: toolsUsed || [], executionTime: executionTime || 0, userFeedback: { score, comment } }
      const result = await learningSystem.learn(interaction)
      res.json({ success: true, result })
    } catch (e) {
      res.status(500).json({ success: false, message: e?.message || String(e) })
    }
  })

  return router
}

export default learningRouterFactory
