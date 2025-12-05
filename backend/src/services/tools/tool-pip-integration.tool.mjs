export default (dependencies) => {
  const { sandboxManager } = dependencies || {}

  async function registerPipTool({ packageName, version = '', moduleName = '', functionName = '', schema, initCode = '' }) {
    if (!sandboxManager) return { success: false, error: 'SandboxManager not available' }
    const name = String(packageName || '').trim()
    const modName = String(moduleName || name).trim()
    const fnName = String(functionName || '').trim()
    if (!name) return { success: false, error: 'packageName required' }
    const toolName = `pip_${modName.replace(/[^a-zA-Z0-9_]/g, '_')}_${fnName || 'call'}`

    const fn = async (args) => {
      const escaped = JSON.stringify(args || {})
      const code = `
        set -e
        cd /workspace
        apt-get update >/dev/null 2>&1 || true
        apt-get install -y python3 python3-pip >/dev/null 2>&1
        pip3 install ${name}${version ? '==' + version : ''} >/dev/null 2>&1
        python3 - <<'PY'
import json
${initCode || ''}
try:
  import ${modName} as _mod
  fn = getattr(_mod, '${fnName}') if '${fnName}' else _mod
  args = json.loads('${escaped}')
  out = fn(args)
  if hasattr(out, 'result'):
    print(json.dumps({'ok': True, 'out': out.result}))
  else:
    print(json.dumps({'ok': True, 'out': out}))
except Exception as e:
  print(json.dumps({'ok': False, 'error': str(e)}))
PY`
      const result = await sandboxManager.executeShell(code, { sessionId: `pip-${modName}`, language: 'shell', allowNetwork: true })
      try {
        const lastLine = String(result.stdout || '').split('\n').filter(Boolean).pop() || '{}'
        return JSON.parse(lastLine)
      } catch { return { ok: false, error: 'parse_failed', raw: result } }
    }

    const toolSchema = schema || {
      name: toolName,
      description: `Dynamic wrapper for pip package ${modName} function ${fnName || 'call'}`,
      parameters: { type: 'object', properties: {}, additionalProperties: true }
    }

    dependencies.toolManager.registerDynamicTool(toolName, fn, toolSchema)
    return { success: true, toolName }
  }
  registerPipTool.metadata = {
    name: 'registerPipTool',
    description: 'Install pip package and register a dynamic tool that calls its function',
    parameters: { type: 'object', properties: { packageName: { type: 'string' }, version: { type: 'string' }, moduleName: { type: 'string' }, functionName: { type: 'string' }, schema: { type: 'object' }, initCode: { type: 'string' } }, required: ['packageName'] }
  }

  async function registerBulkNpmTools({ items = [] }) {
    const results = []
    for (const it of items) {
      try {
        const r = await dependencies.toolManager.execute('registerNpmTool', it)
        results.push({ ok: true, item: it, r })
      } catch (e) {
        results.push({ ok: false, item: it, error: e?.message || String(e) })
      }
    }
    return { success: true, results }
  }
  registerBulkNpmTools.metadata = {
    name: 'registerBulkNpmTools',
    description: 'Register a curated list of npm wrappers in bulk',
    parameters: { type: 'object', properties: { items: { type: 'array' } }, required: ['items'] }
  }

  return { registerPipTool, registerBulkNpmTools }
}
