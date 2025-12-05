import express from 'express'
// Local engine removed from Joe system

const engineRouterFactory = ({ optionalAuth }) => {
  const router = express.Router()
  if (optionalAuth) router.use(optionalAuth)

  router.get('/status', (req, res) => {
    const mode = (process.env.OPENAI_API_KEY ? 'openai' : 'unknown')
    res.json({
      ok: true,
      mode,
      offlineReady: false,
      loading: false,
      stage: 'disabled',
      percent: 0,
      hasOpenAI: !!process.env.OPENAI_API_KEY,
      modelPath: ''
    })
  })

  return router
}

export default engineRouterFactory
