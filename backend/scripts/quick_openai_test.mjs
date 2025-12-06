import toolManager from '../src/services/tools/tool-manager.service.mjs'
import MemoryManager from '../src/services/memory/memory.service.mjs'
import joeAdvanced from '../src/services/ai/joe-advanced.service.mjs'
import { setKey, setActive } from '../src/services/ai/runtime-config.mjs'

async function main() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY missing')
  setKey('openai', apiKey)
  setActive('openai', 'gpt-4o')
  const deps = { memoryManager: new MemoryManager(), db: null }
  await toolManager.initialize(deps)
  joeAdvanced.init({ ...deps })
  const userId = 'guest:test'
  const sessionId = `session_${Date.now()}`
  const msg = 'اكتب تعريف موجز عن قدرات النظام'
  const r = await joeAdvanced.processMessage(userId, msg, sessionId, { model: 'gpt-4o', lang: 'ar' })
  const out = { ok: !!r?.response, responsePreview: String(r?.response || '').slice(0, 240), toolsUsed: r?.toolsUsed || [] }
  console.log(JSON.stringify(out))
}

main().catch(e => { console.error('TEST_FAILED', e?.message || String(e)); process.exit(1) })

