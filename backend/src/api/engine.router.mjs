import express from 'express'
import { localLlamaService } from '../services/llm/local-llama.service.mjs'

const engineRouterFactory = ({ optionalAuth }) => {
  const router = express.Router()
  if (optionalAuth) router.use(optionalAuth)

  router.get('/status', (req, res) => {
    const mode = (process.env.AI_ENGINE_MODE || '').toLowerCase() || (process.env.OPENAI_API_KEY ? 'openai' : (localLlamaService.isReady() ? 'local_llama' : 'unknown'))
    res.json({
      ok: true,
      mode,
      offlineReady: localLlamaService.isReady(),
      loading: localLlamaService.loading,
      stage: localLlamaService.loadingStage,
      percent: localLlamaService.loadingPercent,
      hasOpenAI: !!process.env.OPENAI_API_KEY,
      modelPath: localLlamaService.modelPath || ''
    })
  })

  return router
}

export default engineRouterFactory
