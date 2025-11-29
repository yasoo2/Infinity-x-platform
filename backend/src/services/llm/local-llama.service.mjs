import path from 'path'

class LocalLlamaService {
  constructor() {
    this.modelPath = process.env.LLAMA_MODEL_PATH || path.join(process.cwd(), 'backend', 'models', 'llama.gguf')
    this.llama = null
    this.model = null
    this.context = null
    this.chat = null
    this.initialized = false
  }

  async initialize() {
    try {
      const { getLlama, LlamaChatSession } = await import('node-llama-cpp')
      const gpu = process.env.LLAMA_METAL ? 'metal' : undefined
      const threads = Number(process.env.LLAMA_THREADS || 0) || undefined
      const llama = await getLlama({ gpu, numThreads: threads })
      const model = await llama.loadModel({ modelPath: this.modelPath })
      const context = await model.createContext()
      const chat = new LlamaChatSession({ contextSequence: context.getSequence() })
      this.llama = llama
      this.model = model
      this.context = context
      this.chat = chat
      this.initialized = true
      return true
    } catch (e) {
      try { console.error('local-llama initialize error:', e?.message || e) } catch {}
      this.initialized = false
      return false
    }
  }

  isReady() {
    return Boolean(this.initialized && this.chat)
  }

  async generate(prompt, options = {}) {
    if (!this.isReady()) throw new Error('MODEL_NOT_INITIALIZED')
    const temp = options.temperature ?? 0.7
    const maxTokens = options.maxTokens ?? 512
    const text = await this.chat.prompt(String(prompt), { temperature: temp, maxTokens })
    return String(text || '')
  }

  async stream(messages, onToken, opts = {}) {
    if (!this.isReady()) throw new Error('MODEL_NOT_INITIALIZED')
    const prompt = Array.isArray(messages) ? messages.map(m => `${m.role}: ${m.content}`).join('\n') : String(messages || '')
    const temp = opts.temperature ?? 0.7
    const maxTokens = opts.maxTokens ?? 1024
    const full = await this.chat.prompt(prompt, { temperature: temp, maxTokens })
    const chunks = String(full || '').match(/.{1,64}/g) || []
    for (const c of chunks) {
      onToken(c)
    }
  }
}

export const localLlamaService = new LocalLlamaService()
