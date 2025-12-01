import path from 'path'
import fs from 'fs'
import os from 'os'

class LocalLlamaService {
  constructor() {
    this.modelPath = process.env.LLAMA_MODEL_PATH || path.join(process.cwd(), 'backend', 'models', 'llama.gguf')
    this.llama = null
    this.model = null
    this.context = null
    this.chat = null
    this.initialized = false
    this.loading = false
    this.loadingStage = ''
    this.loadingPercent = 0
  }

  async initialize() {
    try {
      this.loading = true
      this.loadingStage = 'init'
      this.loadingPercent = 5
      if (!this.modelPath || !fs.existsSync(this.modelPath)) {
        this.loadingStage = 'missing_model'
        this.loadingPercent = 0
        this.loading = false
        this.initialized = false
        return false
      }
      const { getLlama, LlamaChatSession } = await import('node-llama-cpp')
      const gpu = process.env.LLAMA_METAL ? 'metal' : (process.platform === 'darwin' ? 'metal' : undefined)
      const cores = Array.isArray(os.cpus()) ? os.cpus().length : 4
      const defaultThreads = Math.max(1, Math.min(cores - 1, 8))
      const threads = Number(process.env.LLAMA_THREADS || defaultThreads)
      const llama = await getLlama({ gpu, numThreads: threads })
      this.loadingStage = 'load_model'
      this.loadingPercent = 35
      const model = await llama.loadModel({ modelPath: this.modelPath })
      this.loadingStage = 'create_context'
      this.loadingPercent = 65
      const context = await model.createContext()
      this.loadingStage = 'create_session'
      this.loadingPercent = 85
      const chat = new LlamaChatSession({ contextSequence: context.getSequence() })
      this.llama = llama
      this.model = model
      this.context = context
      this.chat = chat
      this.initialized = true
      this.loadingStage = 'done'
      this.loadingPercent = 100
      this.loading = false
      return true
    } catch (e) {
      try { console.error('local-llama initialize error:', e?.message || e) } catch { void 0 }
      this.initialized = false
      this.loadingStage = 'error'
      this.loading = false
      return false
    }
  }

  startInitialize() {
    if (this.loading || this.isReady()) return true
    this.loading = true
    this.loadingStage = 'init'
    this.loadingPercent = 1
    ;(async () => { await this.initialize() })()
    return true
  }

  isReady() {
    return Boolean(this.initialized && this.chat)
  }

  async generateContent(prompt, options = {}) {
    if (!this.isReady()) throw new Error('MODEL_NOT_INITIALIZED')
    const temp = options.temperature ?? 0.7
    const maxTokens = options.maxTokens ?? 512
    const text = await this.chat.prompt(String(prompt), { temperature: temp, maxTokens })
    return {
      content: String(text || ''),
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }, // Placeholder for actual usage
      model: 'llama',
    }
  }

  async stream(messages, onToken, opts = {}) {
    if (!this.isReady()) throw new Error('MODEL_NOT_INITIALIZED')
    const prompt = Array.isArray(messages) ? messages.map(m => `${m.role}: ${m.content}`).join('\n') : String(messages || '')
    const temp = opts.temperature ?? 0.7
    const maxTokens = opts.maxTokens ?? 1024
    if (this.model && typeof this.model.createCompletionStream === 'function') {
      const iter = await this.model.createCompletionStream({ prompt, temperature: temp, maxTokens })
      for await (const t of iter) {
        const piece = String(t?.text || '')
        if (piece) onToken(piece)
      }
      return
    }
    const full = await this.chat.prompt(prompt, { temperature: temp, maxTokens })
    const chunks = String(full || '').match(/.{1,64}/g) || []
    for (const c of chunks) onToken(c)
  }
}


export const localLlamaService = new LocalLlamaService()
