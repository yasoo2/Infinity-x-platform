import { localLlamaService } from './local-llama.service.mjs'

export async function runLocalLlamaChat(messages, opts = {}) {
  if (!localLlamaService.isReady()) {
    try { localLlamaService.startInitialize() } catch { /* noop */ }
    if (!localLlamaService.isReady()) throw new Error('MODEL_NOT_INITIALIZED')
  }
  const text = await localLlamaService.runLocalLlamaChat(messages, opts)
  return String(text || '')
}

export default { runLocalLlamaChat, localLlamaService }
