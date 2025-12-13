#!/usr/bin/env node
import MemoryManager from '../backend/src/services/memory/memory.service.mjs'
import toolManager from '../backend/src/services/tools/tool-manager.service.mjs'
import MediaGenerationTool from '../backend/src/tools_refactored/media_generation.tool.mjs'
import { init as initImageMaster, processMessage } from '../backend/src/services/ai/joe-imagemaster.service.mjs'

async function main() {
  process.env.PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || 'http://localhost:4001'
  const memoryManager = new MemoryManager()
  const mediaGenerationTool = new MediaGenerationTool({ memoryManager, openaiApiKey: process.env.OPENAI_API_KEY })
  const mediaGenerationTools = {
    generateImage: mediaGenerationTool.generateImage.bind(mediaGenerationTool),
    editImage: mediaGenerationTool.editImage.bind(mediaGenerationTool),
    generateSpeech: mediaGenerationTool.generateSpeech.bind(mediaGenerationTool),
    downloadImageFromUrl: mediaGenerationTool.downloadImageFromUrl.bind(mediaGenerationTool)
  }
  toolManager._registerModule(mediaGenerationTools)
  toolManager._isInitialized = true
  initImageMaster({ memoryManager })
  const userId = 'test_user'
  const sessionId = 'sess_imagemaster_' + Date.now()
  const message = 'صمم صوره قدم قدم'
  const ctx = { userId, sessionId, lang: 'ar', provider: 'openai', model: null }
  console.log('🔎 Generating image for:', message)
  const result = await processMessage(message, ctx)
  console.log('✅ Result:', result)
}

main().catch((e) => { console.error('❌ Test failed:', e); process.exit(1) })
