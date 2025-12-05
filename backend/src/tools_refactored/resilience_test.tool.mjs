class ResilienceTestTool {
  constructor(dependencies){ this.dependencies = dependencies; this._initializeMetadata() }
  _initializeMetadata(){
    this.simulateHttpFailures.metadata = {
      name: "simulateHttpFailures",
      description: "Sends requests with induced timeouts/abort to observe service resilience and error handling.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "Target URL." },
          method: { type: "string", description: "HTTP method.", default: "GET" },
          timeoutMs: { type: "number", description: "Abort timeout in ms.", default: 1000 },
          body: { type: "string", description: "Request body as JSON string." }
        },
        required: ["url"]
      }
    }
  }
  async simulateHttpFailures({ url, method = 'GET', timeoutMs = 1000, body }){
    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), timeoutMs)
    let status = 0
    let error = null
    try {
      const init = { method, signal: controller.signal }
      if (body) { init.headers = { 'Content-Type': 'application/json' }; init.body = body }
      const res = await fetch(url, init)
      status = res.status
      clearTimeout(t)
      return { success: status < 500, status }
    } catch (e){
      error = e?.name === 'AbortError' ? 'aborted' : (e?.message || String(e))
      return { success: false, error }
    }
  }
}

export default ResilienceTestTool
