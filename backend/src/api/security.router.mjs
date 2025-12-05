import express from 'express'
import toolManager from '../services/tools/tool-manager.service.mjs'

const securityRouterFactory = ({ optionalAuth }) => {
  const router = express.Router()
  if (optionalAuth) router.use(optionalAuth)

  router.get('/audit', async (req, res) => {
    try {
      const result = await toolManager.execute('runSecurityAudit', { dirs: ['backend','dashboard-x'] })
      res.json({ success: true, result })
    } catch (e) {
      res.status(500).json({ success: false, message: e?.message || String(e) })
    }
  })

  router.post('/scan', async (req, res) => {
    try {
      const { globsInsecure, globsSecrets } = req.body || {}
      const insecure = await toolManager.execute('scanInsecurePatterns', { globs: globsInsecure || ['backend/**/*.mjs','dashboard-x/src/**/*.{js,jsx,ts,tsx}'] })
      const secrets = await toolManager.execute('scanSecrets', { globs: globsSecrets || ['**/*.{js,mjs,ts,tsx,env,json}'] })
      res.json({ success: true, insecure, secrets })
    } catch (e) {
      res.status(500).json({ success: false, message: e?.message || String(e) })
    }
  })

  router.post('/network-scan', async (req, res) => {
    try {
      const { target, flags } = req.body || {}
      const result = await toolManager.execute('authorizedNetworkScan', { target, flags })
      const code = result?.success ? 200 : 400
      res.status(code).json(result)
    } catch (e) {
      res.status(500).json({ success: false, message: e?.message || String(e) })
    }
  })

  return router
}

export default securityRouterFactory
