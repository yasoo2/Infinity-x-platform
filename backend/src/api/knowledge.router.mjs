import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs/promises'
import toolManager from '../services/tools/tool-manager.service.mjs'

const knowledgeRouterFactory = ({ optionalAuth }) => {
  const router = express.Router()
  if (optionalAuth) router.use(optionalAuth)

  router.post('/ingest', async (req, res) => {
    try {
      const { documentTitle, summaryGoal, content, filePath } = req.body || {}
      const result = await toolManager.execute('ingestDocument', { documentTitle, summaryGoal, content, filePath })
      res.json(result)
    } catch (e) {
      res.status(500).json({ success: false, message: e?.message || String(e) })
    }
  })

  router.post('/query', async (req, res) => {
    try {
      const { query, limit } = req.body || {}
      const result = await toolManager.execute('queryKnowledgeBase', { query, limit })
      res.json(result)
    } catch (e) {
      res.status(500).json({ success: false, message: e?.message || String(e) })
    }
  })

  const upload = multer({ storage: multer.memoryStorage() })

  router.post('/upload-ingest', upload.single('file'), async (req, res) => {
    try {
      const file = req.file
      if (!file) return res.status(400).json({ success: false, message: 'File is required' })
      const { originalname, buffer } = file
      const ext = path.extname(originalname).toLowerCase()
      let format = 'PDF'
      if (ext === '.pdf') format = 'PDF'
      else if (ext === '.docx' || ext === '.doc') format = 'WORD'
      else if (ext === '.png' || ext === '.jpg' || ext === '.jpeg' || ext === '.webp') format = 'IMAGE'
      const tmpPath = path.join('/tmp', `joe_${Date.now()}_${Math.random().toString(36).slice(2,8)}${ext || ''}`)
      await fs.writeFile(tmpPath, buffer)
      const extract = await toolManager.execute('extractTextFromDocument', { filePath: tmpPath, format })
      const title = String(req.body?.documentTitle || originalname)
      const summaryGoal = String(req.body?.summaryGoal || '')
      const ingest = await toolManager.execute('ingestDocument', { documentTitle: title, summaryGoal, content: extract?.extractedText || '', filePath: tmpPath })
      res.json({ success: true, extracted: extract, ingested: ingest })
    } catch (e) {
      res.status(500).json({ success: false, message: e?.message || String(e) })
    }
  })

  return router
}

export default knowledgeRouterFactory
