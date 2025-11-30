import express from 'express'
import ChatSession from '../database/models/ChatSession.mjs'
import User from '../database/models/User.mjs'

const chatHistoryRouterFactory = ({ optionalAuth }) => {
  const router = express.Router()
  if (optionalAuth) router.use(optionalAuth)

  router.get('/sessions', async (req, res) => {
    try {
      if (!req.user) return res.json({ success: true, sessions: [] })
      const sessions = await ChatSession.find({ userId: req.user._id })
        .sort({ lastModified: -1 })
        .lean()
      return res.json({ success: true, sessions })
    } catch (e) {
      return res.status(500).json({ success: false, error: e?.message || 'INTERNAL_ERROR' })
    }
  })

  router.get('/sessions/:id', async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'UNAUTHORIZED' })
      const s = await ChatSession.findOne({ _id: req.params.id, userId: req.user._id }).lean()
      if (!s) return res.status(404).json({ success: false, error: 'NOT_FOUND' })
      return res.json({ success: true, session: s })
    } catch (e) {
      return res.status(500).json({ success: false, error: e?.message || 'INTERNAL_ERROR' })
    }
  })

  router.delete('/sessions/:id', async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'UNAUTHORIZED' })
      const r = await ChatSession.deleteOne({ _id: req.params.id, userId: req.user._id })
      return res.json({ success: true, deleted: r.deletedCount > 0 })
    } catch (e) {
      return res.status(500).json({ success: false, error: e?.message || 'INTERNAL_ERROR' })
    }
  })

  router.get('/user-context', async (req, res) => {
    try {
      if (!req.user) return res.json({ success: true, context: [] })
      const u = await User.findById(req.user._id).lean()
      const count = await ChatSession.countDocuments({ userId: req.user._id })
      const ctx = [{ key: 'sessionsCount', value: count }, { key: 'lastLoginAt', value: u?.lastLoginAt || null }]
      return res.json({ success: true, context: ctx })
    } catch (e) {
      return res.status(500).json({ success: false, error: e?.message || 'INTERNAL_ERROR' })
    }
  })

  return router
}

export default chatHistoryRouterFactory
