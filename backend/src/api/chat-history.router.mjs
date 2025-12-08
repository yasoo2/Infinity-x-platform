import express from 'express'
import jwt from 'jsonwebtoken'
import ChatSession from '../database/models/ChatSession.mjs'
import ChatMessage from '../database/models/ChatMessage.mjs'
import config from '../config.mjs'

const chatHistoryRouterFactory = ({ optionalAuth, requireRole, io, memoryManager }) => {
  const router = express.Router()
  if (optionalAuth) router.use(optionalAuth)

  const ensureOwnSession = async (userId, sessionId) => {
    const s = await ChatSession.findById(sessionId)
    if (!s) return null
    const u1 = String(s.userId)
    const u2 = String(userId)
    if (u1 !== u2) return null
    if (s.deleted) return null
    return s
  }

  router.get('/sessions', requireRole('USER'), async (req, res) => {
    try {
      const uid = ensureUid(req)
      if (!uid) return res.json({ success: true, sessions: [] })
      const useMemory = !memoryManager?._getDB?.()
      if (useMemory) {
        const sessions = await memoryManager.listSessions(uid)
        return res.json({ success: true, sessions })
      }
      const sessions = await ChatSession.find({ userId: { $in: [uid, String(uid)] }, deleted: { $ne: true } })
        .sort({ updatedAt: -1 })
        .limit(500)
        .select({ title: 1, pinned: 1, updatedAt: 1, lastModified: 1 })
        .lean()
      res.json({ success: true, sessions })
    } catch (error) {
      res.status(500).json({ success: false, error: 'SESSIONS_LIST_FAILED', message: error.message })
    }
  })

  const ensureUid = (req) => {
    const uid = req?.user?._id
    if (uid) return uid
    try {
      const auth = req.headers['authorization'] || ''
      const token = auth.split(' ')[1]
      if (!token) return null
      const decoded = jwt.verify(token, config.JWT_SECRET)
      return decoded?.userId || null
    } catch { return null }
  }

  router.post('/sessions', requireRole('USER'), async (req, res) => {
    try {
      const uid = ensureUid(req)
      const title = String(req.body?.title || 'New Conversation').trim() || 'New Conversation'
      const useMemory = !memoryManager?._getDB?.()
      if (useMemory) {
        const sid = `sess:${Date.now()}:${Math.random().toString(16).slice(2,10)}`
        try { await memoryManager.saveInteraction(uid, '', { content: '' }, { sessionId: sid, type: 'user' }) } catch { /* noop */ }
        res.status(201).json({ success: true, session: { id: sid, title } })
        return
      }
      const s = await ChatSession.create({ userId: uid, title, pinned: false, lastModified: new Date(), updatedAt: new Date() })
      try { io?.of?.('/joe-agent')?.emit?.('session_updated', { op: 'create', id: String(s._id), title: s.title }); } catch { /* noop */ }
      res.json({ success: true, session: s })
    } catch (error) {
      res.status(500).json({ success: false, error: 'SESSION_CREATE_FAILED', message: error.message })
    }
  })

  router.get('/sessions/:id', requireRole('USER'), async (req, res) => {
    try {
      const uid = ensureUid(req)
      const sid = req.params.id
      const useMemory = !memoryManager?._getDB?.()
      if (useMemory) {
        const session = await memoryManager.getSession(sid, uid)
        if (!session) return res.status(404).json({ success: false, error: 'SESSION_NOT_FOUND' })
        const messages = (session?.interactions || []).map(i => ({ type: String(i?.metadata?.type || '').toLowerCase() === 'joe' ? 'joe' : 'user', content: String(i?.result?.content || i?.command || '') }))
        return res.json({ success: true, session, messages })
      }
      const s = await ensureOwnSession(uid, sid)
      if (!s) return res.status(404).json({ success: false, error: 'SESSION_NOT_FOUND' })
      const msgs = await ChatMessage.find({ sessionId: s._id })
        .sort({ createdAt: 1 })
        .limit(2000)
        .select({ type: 1, content: 1, createdAt: 1 })
        .lean()
      res.json({ success: true, session: s, messages: msgs })
    } catch (error) {
      res.status(500).json({ success: false, error: 'SESSION_FETCH_FAILED', message: error.message })
    }
  })

  router.put('/sessions/:id', requireRole('USER'), async (req, res) => {
    try {
      const uid = req.user?._id
      const sid = req.params.id
      const s = await ensureOwnSession(uid, sid)
      if (!s) return res.status(404).json({ success: false, error: 'SESSION_NOT_FOUND' })
      const patch = {}
      if (typeof req.body?.title === 'string') {
        patch.title = req.body.title.trim() || s.title
      }
      if (typeof req.body?.pinned !== 'undefined') {
        patch.pinned = !!req.body.pinned
      }
      patch.updatedAt = new Date()
      patch.lastModified = new Date()
      const updated = await ChatSession.findByIdAndUpdate(s._id, { $set: patch }, { new: true })
      try { io?.of?.('/joe-agent')?.emit?.('session_updated', { op: 'update', id: String(updated._id), title: updated.title }); } catch { /* noop */ }
      res.json({ success: true, session: updated })
    } catch (error) {
      res.status(500).json({ success: false, error: 'SESSION_UPDATE_FAILED', message: error.message })
    }
  })

  router.delete('/sessions/:id', requireRole('USER'), async (req, res) => {
    try {
      const uid = ensureUid(req)
      const sid = req.params.id
      const useMemory = !memoryManager?._getDB?.()
      if (useMemory) {
        const r = await memoryManager.deleteSession(sid, uid)
        const code = r?.success ? 200 : (r?.error === 'NOT_FOUND' ? 404 : 500)
        return res.status(code).json(r)
      }
      const s = await ensureOwnSession(uid, sid)
      if (!s) return res.status(404).json({ success: false, error: 'SESSION_NOT_FOUND' })
      await ChatSession.findByIdAndUpdate(s._id, { $set: { deleted: true, updatedAt: new Date(), lastModified: new Date() } }, { new: true })
      try { io?.of?.('/joe-agent')?.emit?.('session_updated', { op: 'delete', id: String(s._id) }); } catch { /* noop */ }
      res.json({ success: true })
      Promise.resolve().then(async () => {
        try { await ChatMessage.deleteMany({ sessionId: s._id }) } catch { /* ignore */ }
        try { await ChatSession.deleteOne({ _id: s._id }) } catch { /* ignore */ }
      })
    } catch (error) {
      res.status(500).json({ success: false, error: 'SESSION_DELETE_FAILED', message: error.message })
    }
  })

  router.get('/sessions/:id/messages', requireRole('USER'), async (req, res) => {
    try {
      const uid = ensureUid(req)
      const sid = req.params.id
      const useMemory = !memoryManager?._getDB?.()
      if (useMemory) {
        const session = await memoryManager.getSession(sid, uid)
        const messages = (session?.interactions || []).map(i => ({ type: String(i?.metadata?.type || '').toLowerCase() === 'joe' ? 'joe' : 'user', content: String(i?.result?.content || i?.command || '') }))
        return res.json({ success: true, messages })
      }
      const s = await ensureOwnSession(uid, sid)
      if (!s) return res.status(404).json({ success: false, error: 'SESSION_NOT_FOUND' })
      const msgs = await ChatMessage.find({ sessionId: s._id })
        .sort({ createdAt: 1 })
        .limit(2000)
        .select({ type: 1, content: 1, createdAt: 1 })
        .lean()
      res.json({ success: true, messages: msgs })
    } catch (error) {
      res.status(500).json({ success: false, error: 'MESSAGES_LIST_FAILED', message: error.message })
    }
  })

  router.post('/sessions/:id/messages', requireRole('USER'), async (req, res) => {
    try {
      const uid = ensureUid(req)
      const sid = req.params.id
      const type = String(req.body?.type || '').trim()
      const content = String(req.body?.content || '').trim()
      if (!content || !['user','joe'].includes(type)) return res.status(400).json({ success: false, error: 'INVALID_MESSAGE' })
      const useMemory = !memoryManager?._getDB?.()
      if (useMemory) {
        const r = await memoryManager.saveInteraction(uid, type === 'user' ? content : '', type === 'joe' ? { content } : {}, { sessionId: sid, type })
        return res.json({ success: true, saved: r })
      }
      const s = await ensureOwnSession(uid, sid)
      if (!s) return res.status(404).json({ success: false, error: 'SESSION_NOT_FOUND' })
      const msg = await ChatMessage.create({ sessionId: s._id, userId: uid, type, content })
      await ChatSession.findByIdAndUpdate(s._id, { $set: { updatedAt: new Date(), lastModified: new Date() } })
      try { io?.of?.('/joe-agent')?.emit?.('session_updated', { op: 'message', id: String(s._id) }); } catch { /* noop */ }
      res.json({ success: true, message: msg })
    } catch (error) {
      res.status(500).json({ success: false, error: 'MESSAGE_CREATE_FAILED', message: error.message })
    }
  })

  router.delete('/sessions/:id/messages/:messageId', requireRole('USER'), async (req, res) => {
    try {
      const uid = req.user?._id
      const sid = req.params.id
      const mid = req.params.messageId
      const s = await ensureOwnSession(uid, sid)
      if (!s) return res.status(404).json({ success: false, error: 'SESSION_NOT_FOUND' })
      const m = await ChatMessage.findById(mid)
      if (!m || String(m.sessionId) !== String(s._id)) return res.status(404).json({ success: false, error: 'MESSAGE_NOT_FOUND' })
      await ChatMessage.deleteOne({ _id: mid })
      res.json({ success: true })
    } catch (error) {
      res.status(500).json({ success: false, error: 'MESSAGE_DELETE_FAILED', message: error.message })
    }
  })

  return router
}

export default chatHistoryRouterFactory
