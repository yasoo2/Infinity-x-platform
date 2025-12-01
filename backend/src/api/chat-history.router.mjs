import express from 'express'
import { v4 as uuidv4 } from 'uuid'
import mongoose from 'mongoose'
import ChatSession from '../database/models/ChatSession.mjs'
import ChatMessage from '../database/models/ChatMessage.mjs'

const chatHistoryRouterFactory = ({ optionalAuth, requireRole, db }) => {
  const router = express.Router()
  if (optionalAuth) router.use(optionalAuth)

  const memory = {
    sessions: new Map(),
    messages: new Map(),
  }

  const hasDb = !!db

  // List sessions
  router.get('/sessions', async (req, res) => {
    try {
      if (hasDb && req.user?._id) {
        const list = await ChatSession.find({ userId: req.user._id }).sort({ lastModified: -1 })
        return res.json({ success: true, sessions: list.map(s => ({ id: s._id.toString(), title: s.title, lastModified: s.lastModified })) })
      }
      const sessions = Array.from(memory.sessions.values()).map(s => ({ id: s.id, title: s.title, lastModified: s.lastModified }))
      return res.json({ success: true, sessions })
    } catch (e) {
      res.status(500).json({ success: false, error: e?.message || 'FAILED_LIST' })
    }
  })

  // Create session
  router.post('/sessions', requireRole ? requireRole('USER') : (req, _res, next) => next(), async (req, res) => {
    try {
      const title = String(req.body?.title || 'New Conversation')
      if (hasDb && req.user?._id) {
        const s = await ChatSession.create({ userId: req.user._id, title, lastModified: new Date() })
        return res.json({ success: true, session: { _id: s._id.toString(), id: s._id.toString(), title } })
      }
      const id = uuidv4()
      memory.sessions.set(id, { id, title, lastModified: new Date() })
      return res.json({ success: true, session: { id, title } })
    } catch (e) {
      res.status(500).json({ success: false, error: e?.message || 'FAILED_CREATE' })
    }
  })

  // Get session detail
  router.get('/sessions/:id', async (req, res) => {
    try {
      const id = req.params.id
      const isObjId = mongoose.Types.ObjectId.isValid(id)
      if (hasDb && isObjId) {
        const s = await ChatSession.findById(id)
        if (!s) return res.status(404).json({ success: false, error: 'NOT_FOUND' })
        const msgs = await ChatMessage.find({ sessionId: s._id }).sort({ createdAt: 1 })
        const interactions = msgs.map(m => ({ command: m.type === 'user' ? m.content : undefined, result: m.type === 'joe' ? m.content : undefined, metadata: { timestamp: m.createdAt } }))
        return res.json({ success: true, session: { id: s._id.toString(), title: s.title, interactions } })
      }
      const s = memory.sessions.get(id)
      if (!s) return res.status(404).json({ success: false, error: 'NOT_FOUND' })
      const msgs = memory.messages.get(id) || []
      const interactions = msgs.map(m => ({ command: m.type === 'user' ? m.content : undefined, result: m.type === 'joe' ? m.content : undefined, metadata: { timestamp: m.createdAt } }))
      return res.json({ success: true, session: { id, title: s.title, interactions } })
    } catch (e) {
      res.status(500).json({ success: false, error: e?.message || 'FAILED_DETAIL' })
    }
  })

  // Update session
  router.put('/sessions/:id', requireRole ? requireRole('USER') : (req, _res, next) => next(), async (req, res) => {
    try {
      const id = req.params.id
      const patch = req.body || {}
      const isObjId = mongoose.Types.ObjectId.isValid(id)
      if (hasDb && isObjId) {
        const s = await ChatSession.findById(id)
        if (!s) return res.status(404).json({ success: false, error: 'NOT_FOUND' })
        if (typeof patch.title === 'string') s.title = patch.title
        if (typeof patch.pinned === 'boolean') s.pinned = patch.pinned
        s.lastModified = new Date()
        await s.save()
        return res.json({ success: true })
      }
      const s = memory.sessions.get(id)
      if (!s) return res.status(404).json({ success: false, error: 'NOT_FOUND' })
      memory.sessions.set(id, { ...s, ...patch, lastModified: new Date() })
      return res.json({ success: true })
    } catch (e) {
      res.status(500).json({ success: false, error: e?.message || 'FAILED_UPDATE' })
    }
  })

  // Delete session
  router.delete('/sessions/:id', requireRole ? requireRole('USER') : (req, _res, next) => next(), async (req, res) => {
    try {
      const id = req.params.id
      const isObjId = mongoose.Types.ObjectId.isValid(id)
      if (hasDb && isObjId) {
        await ChatMessage.deleteMany({ sessionId: id })
        await ChatSession.findByIdAndDelete(id)
        return res.json({ success: true })
      }
      memory.sessions.delete(id)
      memory.messages.delete(id)
      return res.json({ success: true })
    } catch (e) {
      res.status(500).json({ success: false, error: e?.message || 'FAILED_DELETE' })
    }
  })

  // List messages
  router.get('/sessions/:id/messages', async (req, res) => {
    try {
      const id = req.params.id
      const isObjId = mongoose.Types.ObjectId.isValid(id)
      if (hasDb && isObjId) {
        const msgs = await ChatMessage.find({ sessionId: id }).sort({ createdAt: 1 })
        return res.json({ success: true, messages: msgs.map(m => ({ id: m._id.toString(), type: m.type, content: m.content, createdAt: m.createdAt })) })
      }
      const msgs = memory.messages.get(id) || []
      return res.json({ success: true, messages: msgs })
    } catch (e) {
      res.status(500).json({ success: false, error: e?.message || 'FAILED_MESSAGES' })
    }
  })

  // Add message
  router.post('/sessions/:id/messages', requireRole ? requireRole('USER') : (req, _res, next) => next(), async (req, res) => {
    try {
      const id = req.params.id
      const { type, content } = req.body || {}
      if (!type || !content) return res.status(400).json({ success: false, error: 'TYPE_CONTENT_REQUIRED' })
      const isObjId = mongoose.Types.ObjectId.isValid(id)
      if (hasDb && req.user?._id && isObjId) {
        const msg = await ChatMessage.create({ sessionId: id, userId: req.user._id, type, content })
        await ChatSession.findByIdAndUpdate(id, { $set: { lastModified: new Date() } })
        return res.json({ success: true, id: msg._id.toString() })
      }
      const list = memory.messages.get(id) || []
      const mid = uuidv4()
      list.push({ id: mid, type, content, createdAt: new Date() })
      memory.messages.set(id, list)
      const s = memory.sessions.get(id)
      if (s) memory.sessions.set(id, { ...s, lastModified: new Date() })
      return res.json({ success: true, id: mid })
    } catch (e) {
      res.status(500).json({ success: false, error: e?.message || 'FAILED_ADD_MESSAGE' })
    }
  })

  // Delete message
  router.delete('/sessions/:id/messages/:mid', requireRole ? requireRole('USER') : (req, _res, next) => next(), async (req, res) => {
    try {
      const { id, mid } = req.params
      if (hasDb) {
        await ChatMessage.findByIdAndDelete(mid)
        await ChatSession.findByIdAndUpdate(id, { $set: { lastModified: new Date() } })
        return res.json({ success: true })
      }
      const list = (memory.messages.get(id) || []).filter(m => m.id !== mid)
      memory.messages.set(id, list)
      return res.json({ success: true })
    } catch (e) {
      res.status(500).json({ success: false, error: e?.message || 'FAILED_DELETE_MESSAGE' })
    }
  })

  // User context summary
  router.get('/user-context', async (req, res) => {
    try {
      if (hasDb && req.user?._id) {
        const sessions = await ChatSession.find({ userId: req.user._id }).sort({ lastModified: -1 })
        const messages = await ChatMessage.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(20)
        return res.json({ success: true, sessionsCount: sessions.length, recentMessages: messages.map(m => ({ type: m.type, content: m.content })) })
      }
      const sessions = Array.from(memory.sessions.values())
      const recent = []
      for (const id of memory.messages.keys()) {
        recent.push(...(memory.messages.get(id) || []))
      }
      recent.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))
      return res.json({ success: true, sessionsCount: sessions.length, recentMessages: recent.slice(0, 20).map(m => ({ type: m.type, content: m.content })) })
    } catch (e) {
      res.status(500).json({ success: false, error: e?.message || 'FAILED_USER_CONTEXT' })
    }
  })

  return router
}

export default chatHistoryRouterFactory
