import express from 'express'
import ChatSession from '../database/models/ChatSession.mjs'
import ChatMessage from '../database/models/ChatMessage.mjs'
import User from '../database/models/User.mjs'

const chatHistoryRouterFactory = ({ optionalAuth, requireRole }) => {
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

  // Create new session
  router.post('/sessions', requireRole ? requireRole('USER') : (req, res, next) => next(), async (req, res) => {
    try {
      const title = String(req.body?.title || 'New Conversation')
      const s = await ChatSession.create({ userId: req.user._id, title })
      return res.status(201).json({ success: true, session: s })
    } catch (e) {
      return res.status(500).json({ success: false, error: e?.message || 'INTERNAL_ERROR' })
    }
  })

  // Update session metadata
  router.put('/sessions/:id', requireRole ? requireRole('USER') : (req, res, next) => next(), async (req, res) => {
    try {
      const patch = {}
      if (typeof req.body?.title !== 'undefined') patch.title = String(req.body.title)
      if (typeof req.body?.pinned !== 'undefined') patch.pinned = !!req.body.pinned
      patch.lastModified = new Date()
      const r = await ChatSession.findOneAndUpdate(
        { _id: req.params.id, userId: req.user._id },
        { $set: patch },
        { new: true }
      ).lean()
      if (!r) return res.status(404).json({ success: false, error: 'NOT_FOUND' })
      return res.json({ success: true, session: r })
    } catch (e) {
      return res.status(500).json({ success: false, error: e?.message || 'INTERNAL_ERROR' })
    }
  })

  // List messages in a session
  router.get('/sessions/:id/messages', requireRole ? requireRole('USER') : (req, res, next) => next(), async (req, res) => {
    try {
      const own = await ChatSession.exists({ _id: req.params.id, userId: req.user._id })
      if (!own) return res.status(404).json({ success: false, error: 'NOT_FOUND' })
      const msgs = await ChatMessage.find({ sessionId: req.params.id, userId: req.user._id })
        .sort({ createdAt: 1 })
        .lean()
      return res.json({ success: true, messages: msgs })
    } catch (e) {
      return res.status(500).json({ success: false, error: e?.message || 'INTERNAL_ERROR' })
    }
  })

  // Append message to a session
  router.post('/sessions/:id/messages', requireRole ? requireRole('USER') : (req, res, next) => next(), async (req, res) => {
    try {
      const own = await ChatSession.exists({ _id: req.params.id, userId: req.user._id })
      if (!own) return res.status(404).json({ success: false, error: 'NOT_FOUND' })
      const type = String(req.body?.type || '')
      const content = String(req.body?.content || '')
      if (!content || (type !== 'user' && type !== 'joe')) {
        return res.status(400).json({ success: false, error: 'INVALID_MESSAGE' })
      }
      const m = await ChatMessage.create({ sessionId: req.params.id, userId: req.user._id, type, content })
      await ChatSession.updateOne({ _id: req.params.id }, { $set: { lastModified: new Date() } })
      return res.status(201).json({ success: true, message: m })
    } catch (e) {
      return res.status(500).json({ success: false, error: e?.message || 'INTERNAL_ERROR' })
    }
  })

  // Delete message in a session
  router.delete('/sessions/:id/messages/:messageId', requireRole ? requireRole('USER') : (req, res, next) => next(), async (req, res) => {
    try {
      const own = await ChatSession.exists({ _id: req.params.id, userId: req.user._id })
      if (!own) return res.status(404).json({ success: false, error: 'NOT_FOUND' })
      const r = await ChatMessage.deleteOne({ _id: req.params.messageId, sessionId: req.params.id, userId: req.user._id })
      return res.json({ success: true, deleted: r.deletedCount > 0 })
    } catch (e) {
      return res.status(500).json({ success: false, error: e?.message || 'INTERNAL_ERROR' })
    }
  })

  return router
}

export default chatHistoryRouterFactory
