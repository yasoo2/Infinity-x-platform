import express from 'express'

const chatHistoryRouterFactory = ({ optionalAuth }) => {
  const router = express.Router()
  if (optionalAuth) router.use(optionalAuth)

  // Minimal stub endpoints to support frontend sync
  router.get('/sessions', async (req, res) => {
    void req
    try {
      return res.json({ success: true, sessions: [] })
    } catch (e) {
      return res.status(500).json({ success: false, error: e?.message || 'INTERNAL_ERROR' })
    }
  })

  router.get('/sessions/:id', async (req, res) => {
    void req
    try {
      return res.json({ success: true, session: null })
    } catch (e) {
      return res.status(500).json({ success: false, error: e?.message || 'INTERNAL_ERROR' })
    }
  })

  router.delete('/sessions/:id', async (req, res) => {
    void req
    try {
      return res.json({ success: true, deleted: false })
    } catch (e) {
      return res.status(500).json({ success: false, error: e?.message || 'INTERNAL_ERROR' })
    }
  })

  router.get('/user-context', async (req, res) => {
    void req
    try {
      return res.json({ success: true, context: [] })
    } catch (e) {
      return res.status(500).json({ success: false, error: e?.message || 'INTERNAL_ERROR' })
    }
  })

  return router
}

export default chatHistoryRouterFactory

