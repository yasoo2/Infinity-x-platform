import express from 'express'
import searchTools from '../tools_refactored/search.tool.mjs'
import browserTool from '../services/tools/browser.tool.mjs'
import { getMode } from '../core/runtime-mode.mjs'
import { localLlamaService } from '../services/llm/local-llama.service.mjs'

const chatRouterFactory = ({ optionalAuth }) => {
  const router = express.Router()
  if (optionalAuth) router.use(optionalAuth)

  router.post('/completion', async (req, res) => {
    try {
      const prompt = String(req.body?.prompt || '').trim()
      if (!prompt) return res.status(400).json({ success: false, error: 'PROMPT_REQUIRED' })
      const mode = getMode()
      if (mode === 'offline') {
        if (!localLlamaService.isReady()) {
          const ok = await localLlamaService.initialize()
          if (!ok) return res.status(503).json({ success: false, error: 'MODEL_NOT_INITIALIZED' })
        }
        const text = await localLlamaService.generate(prompt, req.body?.options || {})
        return res.json({ success: true, text, sources: [] })
      } else {
        const sr = await searchTools.searchWeb({ query: prompt })
        if (!sr.success || !sr.results?.length) return res.json({ success: true, text: 'لا توجد نتائج كافية.' })
        const top = sr.results.slice(0, 3)
        const contents = []
        for (const r of top) {
          const b = await browserTool.browseWebsite({ url: r.url })
          if (b?.success && b?.content) contents.push({ url: r.url, title: b.title || r.title, content: b.content })
        }
        const text = summarize(prompt, contents)
        return res.json({ success: true, text, sources: contents.map(c => ({ title: c.title, url: c.url })) })
      }
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message })
    }
  })

  router.post('/stream', async (req, res) => {
    try {
      const messages = req.body?.messages || []
      if ((!Array.isArray(messages) || messages.length === 0) && !req.body?.prompt) {
        return res.status(400).json({ success: false, error: 'MESSAGES_REQUIRED' })
      }
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')
      const write = (data) => res.write(`data: ${data}\n\n`)
      const src = Array.isArray(messages) && messages.length ? messages : [{ role: 'user', content: String(req.body?.prompt || '') }]
      const prompt = src[src.length - 1]?.content || ''
      const mode = getMode()
      if (mode === 'offline') {
        write('وضع المصنع الذاتي مفعل')
        if (!localLlamaService.isReady()) {
          const ok = await localLlamaService.initialize()
          if (!ok) {
            write('تعذر تحميل النموذج المحلي')
            return res.end()
          }
        }
        await localLlamaService.stream(src, (t) => write(t), req.body?.options || {})
      } else {
        const sr = await searchTools.searchWeb({ query: prompt })
        if (!sr.success || !sr.results?.length) {
          write('لا توجد نتائج كافية.')
          return res.end()
        }
        write('يتم البحث...')
        const top = sr.results.slice(0, 3)
        const contents = []
        for (const r of top) {
          write(`مصدر: ${r.url}`)
        const b = await browserTool.browseWebsite({ url: r.url })
          if (b?.success && b?.content) {
            contents.push({ url: r.url, title: b.title || r.title, content: b.content })
            write(`تم التحميل: ${b.title || r.title}`)
          }
        }
        const text = summarize(prompt, contents)
        write(text)
      }
      res.end()
    } catch (error) {
      try {
        res.write(`event: error\n`)
        res.write(`data: ${error.message}\n\n`)
      } catch {}
      res.end()
    }
  })

  function summarize(q, items) {
    const key = q.toLowerCase().split(/\s+/).filter(w => w.length > 2)
    const pick = (str) => {
      const sents = String(str).split(/(?<=[.!؟\?])\s+/).slice(0, 50)
      const scored = sents.map(s => ({ s, score: key.reduce((a, k) => a + (s.toLowerCase().includes(k) ? 1 : 0), 0) + Math.min(s.length / 80, 2) }))
      return scored.sort((a,b)=>b.score-a.score).slice(0, 5).map(x=>x.s)
    }
    const chunks = []
    for (const it of items) {
      chunks.push(`من: ${it.title}\n` + pick(it.content).join('\n'))
    }
    return chunks.join('\n\n')
  }

  return router
}

export default chatRouterFactory
