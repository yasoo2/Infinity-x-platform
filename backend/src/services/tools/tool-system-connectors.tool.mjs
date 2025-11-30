import axios from 'axios'
import toolManager from './tool-manager.service.mjs'

export default () => {
  async function registerHttpTool({ baseUrl, name, defaultHeaders = {}, timeoutMs = 20000 }) {
    const toolName = `http_${String(name||'generic').replace(/[^a-zA-Z0-9_]/g,'_')}`
    const fn = async ({ method = 'GET', path = '/', params = {}, data = {}, headers = {} }) => {
      const client = axios.create({ baseURL: baseUrl, timeout: timeoutMs, headers: { ...defaultHeaders, ...headers } })
      const res = await client.request({ method, url: path, params, data })
      return { ok: true, status: res.status, data: res.data }
    }
    const schema = { name: toolName, description: `HTTP connector for ${baseUrl}`, parameters: { type: 'object', properties: { method: { type: 'string' }, path: { type: 'string' }, params: { type: 'object' }, data: { type: 'object' }, headers: { type: 'object' } } } }
    toolManager.registerDynamicTool(toolName, fn, schema)
    return { success: true, toolName }
  }
  registerHttpTool.metadata = { name: 'registerHttpTool', description: 'Register dynamic HTTP connector tool', parameters: { type: 'object', properties: { baseUrl: { type: 'string' }, name: { type: 'string' }, defaultHeaders: { type: 'object' }, timeoutMs: { type: 'integer' } }, required: ['baseUrl'] } }

  return { registerHttpTool }
}
