import express from 'express'
import axios from 'axios'
import * as cheerio from 'cheerio'
import searchTools from '../tools_refactored/search.tool.mjs'

const webRouterFactory = ({ optionalAuth }) => {
  const router = express.Router()
  if (optionalAuth) router.use(optionalAuth)

  const fetchOgImage = async (url) => {
    try {
      const { data } = await axios.get(url, { timeout: 7000, headers: { 'User-Agent': 'Mozilla/5.0' } })
      const $ = cheerio.load(data)
      const og = $('meta[property="og:image"]').attr('content') || $('meta[name="twitter:image"]').attr('content')
      if (og && /^https?:\/\//.test(og)) return og
      return null
    } catch {
      return null
    }
  }

  router.get('/search', async (req, res) => {
    try {
      const query = String(req.query.q || '').trim()
      const includeImages = String(req.query.images || 'false').toLowerCase() === 'true'
      if (!query) return res.status(400).json({ success: false, error: 'QUERY_REQUIRED' })

      const result = await searchTools.searchWeb({ query })
      if (!result.success) return res.status(502).json({ success: false, error: result.error })

      let results = result.results || []
      if (includeImages && results.length) {
        const limited = results.slice(0, 5)
        const images = await Promise.all(limited.map(r => fetchOgImage(r.url)))
        results = results.map((r, i) => ({ ...r, image: i < images.length ? images[i] : null }))
      }
      return res.json({ success: true, results })
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message })
    }
  })

  router.post('/search', async (req, res) => {
    try {
      const query = String(req.body?.query || '').trim()
      const includeImages = Boolean(req.body?.images)
      if (!query) return res.status(400).json({ success: false, error: 'QUERY_REQUIRED' })

      const result = await searchTools.searchWeb({ query })
      if (!result.success) return res.status(502).json({ success: false, error: result.error })

      let results = result.results || []
      if (includeImages && results.length) {
        const limited = results.slice(0, 5)
        const images = await Promise.all(limited.map(r => fetchOgImage(r.url)))
        results = results.map((r, i) => ({ ...r, image: i < images.length ? images[i] : null }))
      }
      return res.json({ success: true, results })
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message })
    }
  })

  return router
}

export default webRouterFactory
