import fs from 'fs/promises'

class ApiContractTestTool {
  constructor(dependencies){ this.dependencies = dependencies; this._initializeMetadata() }
  _initializeMetadata(){
    this.testEndpointAgainstSpec.metadata = {
      name: "testEndpointAgainstSpec",
      description: "Validates an HTTP endpoint response against a minimal OpenAPI JSON schema (top-level properties).",
      parameters: {
        type: "object",
        properties: {
          specPath: { type: "string", description: "Absolute path to OpenAPI JSON." },
          baseUrl: { type: "string", description: "API base URL." },
          path: { type: "string", description: "Endpoint path (e.g., /users)." },
          method: { type: "string", description: "HTTP method.", default: "get" }
        },
        required: ["specPath","baseUrl","path"]
      }
    }
  }
  async testEndpointAgainstSpec({ specPath, baseUrl, path, method = 'get' }){
    try {
      const raw = await fs.readFile(specPath, 'utf8')
      const spec = JSON.parse(raw)
      const p = spec?.paths?.[path]
      const op = p?.[method]
      if (!op) return { success: false, error: "Operation not found in spec" }
      const resp200 = op.responses?.['200'] || op.responses?.['201'] || op.responses?.default
      const schema = resp200?.content?.['application/json']?.schema
      const url = `${String(baseUrl).replace(/\/$/,'')}${path}`
      const res = await fetch(url)
      const status = res.status
      let json = null
      try { json = await res.json() } catch { json = null }
      const checks = []
      let passed = status < 400
      if (schema && json && typeof json === 'object'){
        const props = Object.keys(schema.properties || {})
        for (const k of props){
          const ok = Object.prototype.hasOwnProperty.call(json, k)
          checks.push({ property: k, exists: ok })
          if (!ok) passed = false
        }
      }
      return { success: passed, status, checks, url }
    } catch (e){
      return { success: false, error: e?.message || String(e) }
    }
  }
}

export default ApiContractTestTool
