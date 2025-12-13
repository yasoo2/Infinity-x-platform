import express from 'express'
import { processMessage, init as initImageMaster } from '../services/ai/joe-imagemaster.service.mjs'

const joeChatAdvancedRouterFactory = ({ requireRole, optionalAuth, memoryManager }) => {
  const router = express.Router()
  if (optionalAuth) router.use(optionalAuth)

  router.post('/', requireRole('USER'), async (req, res) => {
    try {
      const { message, sessionId, lang, provider, model } = req.body || {}
      const userId = req.user?._id ? String(req.user._id) : (req.session?.token ? `guest:${req.session.token}` : `guest:${Date.now()}`)
      const sess = typeof sessionId === 'string' && sessionId.trim() ? sessionId.trim() : `sess_${Date.now()}`
      if (!message) return res.status(400).json({ success: false, error: 'Message is required' })

      if (!memoryManager) {
        return res.status(503).json({ success: false, error: 'MEMORY_UNAVAILABLE' })
      }

      initImageMaster({ memoryManager })

      const context = {
        userId,
        sessionId: sess,
        lang: lang || 'ar',
        provider: provider || 'openai',
        model: model || null
      }

      const result = await processMessage(message, context)
      return res.json({ success: true, response: result?.response || '', toolsUsed: result?.toolsUsed || [], sessionId: sess })
    } catch (error) {
      return res.status(500).json({ success: false, error: 'IMAGEMASTER_ROUTER_ERROR', message: error?.message || String(error) })
    }
  })

  return router
}

export default joeChatAdvancedRouterFactory
