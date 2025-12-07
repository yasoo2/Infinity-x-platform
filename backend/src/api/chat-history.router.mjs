import express from 'express'
import mongoose from 'mongoose'
import ChatSession from '../database/models/ChatSession.mjs'
import ChatMessage from '../database/models/ChatMessage.mjs'

const chatHistoryRouterFactory = ({ requireRole }) => {
  const router = express.Router()

  const ensureOwnSession = async (userId, sessionId) => {
    const s = await ChatSession.findById(sessionId)
    if (!s) return null
    const u1 = String(s.userId)
    const u2 = String(userId)
    return u1 === u2 ? s : null
  }

  router.get('/sessions', requireRole('USER'), async (req, res) => {
    try {
      const uid = req.user?._id
      const sessions = await ChatSession.find({ userId: { $in: [uid, String(uid)] } }).sort({ updatedAt: -1 }).limit(500)
      res.json({ success: true, sessions })
    } catch (error) {
      res.status(500).json({ success: false, error: 'SESSIONS_LIST_FAILED', message: error.message })
    }
  })

  router.post('/sessions', requireRole('USER'), async (req, res) => {
    try {
      const uid = req.user?._id
      const title = String(req.body?.title || 'New Conversation').trim() || 'New Conversation'
      const s = await ChatSession.create({ userId: uid, title, pinned: false, lastModified: new Date(), updatedAt: new Date() })
      res.json({ success: true, session: s })
    } catch (error) {
      res.status(500).json({ success: false, error: 'SESSION_CREATE_FAILED', message: error.message })
    }
  })

  router.get('/sessions/:id', requireRole('USER'), async (req, res) => {
    try {
      const uid = req.user?._id
      const sid = req.params.id
      const s = await ensureOwnSession(uid, sid)
      if (!s) return res.status(404).json({ success: false, error: 'SESSION_NOT_FOUND' })
      const msgs = await ChatMessage.find({ sessionId: s._id }).sort({ createdAt: 1 }).limit(2000)
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
      res.json({ success: true, session: updated })
    } catch (error) {
      res.status(500).json({ success: false, error: 'SESSION_UPDATE_FAILED', message: error.message })
    }
  })

  router.delete('/sessions/:id', requireRole('USER'), async (req, res) => {
    try {
      const uid = req.user?._id
      const sid = req.params.id
      const s = await ensureOwnSession(uid, sid)
      if (!s) return res.status(404).json({ success: false, error: 'SESSION_NOT_FOUND' })
      await ChatMessage.deleteMany({ sessionId: s._id })
      await ChatSession.findByIdAndDelete(s._id)
      res.json({ success: true })
    } catch (error) {
      res.status(500).json({ success: false, error: 'SESSION_DELETE_FAILED', message: error.message })
    }
  })

  router.get('/sessions/:id/messages', requireRole('USER'), async (req, res) => {
    try {
      const uid = req.user?._id
      const sid = req.params.id
      const s = await ensureOwnSession(uid, sid)
      if (!s) return res.status(404).json({ success: false, error: 'SESSION_NOT_FOUND' })
      const msgs = await ChatMessage.find({ sessionId: s._id }).sort({ createdAt: 1 }).limit(2000)
      res.json({ success: true, messages: msgs })
    } catch (error) {
      res.status(500).json({ success: false, error: 'MESSAGES_LIST_FAILED', message: error.message })
    }
  })

  router.post('/sessions/:id/messages', requireRole('USER'), async (req, res) => {
    try {
      const uid = req.user?._id
      const sid = req.params.id
      const s = await ensureOwnSession(uid, sid)
      if (!s) return res.status(404).json({ success: false, error: 'SESSION_NOT_FOUND' })
      const type = String(req.body?.type || '').trim()
      const content = String(req.body?.content || '').trim()
      if (!content || !['user','joe'].includes(type)) return res.status(400).json({ success: false, error: 'INVALID_MESSAGE' })
      const msg = await ChatMessage.create({ sessionId: s._id, userId: uid, type, content })
      await ChatSession.findByIdAndUpdate(s._id, { $set: { updatedAt: new Date(), lastModified: new Date() } })
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
