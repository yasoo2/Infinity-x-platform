import toolManager from './tool-manager.service.mjs'

export default (dependencies) => {
  const { sandboxManager } = dependencies || {}

  async function registerNpmTool({ packageName, version = 'latest', functionName = 'default', schema, initCode = '', invokeTemplate = 'fn(args)' }) {
    if (!sandboxManager) return { success: false, error: 'SandboxManager not available' }
    const name = String(packageName || '').trim()
    if (!name) return { success: false, error: 'packageName required' }
    const toolName = `npm_${name.replace(/[^a-zA-Z0-9_]/g, '_')}_${functionName}`

    const fn = async (args) => {
      const escaped = JSON.stringify(args || {})
      const code = `
        set -e
        cd /workspace
        npm init -y >/dev/null 2>&1 || true
        npm install ${name}@${version} >/dev/null 2>&1
        node -e "(async () => { 
          try { 
            ${initCode || ''}
            const mod = await import('${name}');
            const fn = (mod.${functionName} || (typeof mod.default==='function'?mod.default:mod));
            const args = ${escaped};
            const out = await Promise.resolve((() => { ${invokeTemplate}; })());
            console.log(JSON.stringify({ ok: true, out }));
          } catch (e) { 
            console.log(JSON.stringify({ ok: false, error: e?.message || String(e) }))
          }
        })()"`
      const result = await sandboxManager.executeShell(code, { sessionId: `npm-${name}`, language: 'shell', allowNetwork: true })
      try {
        const lastLine = String(result.stdout || '').split('\n').filter(Boolean).pop() || '{}'
        return JSON.parse(lastLine)
      } catch { return { ok: false, error: 'parse_failed', raw: result } }
    }

    const toolSchema = schema || {
      name: toolName,
      description: `Dynamic wrapper for npm package ${name} function ${functionName}`,
      parameters: { type: 'object', properties: {}, additionalProperties: true }
    }

    toolManager.registerDynamicTool(toolName, fn, toolSchema)
    return { success: true, toolName }
  }
  registerNpmTool.metadata = {
    name: 'registerNpmTool',
    description: 'Install npm package and register a dynamic tool that calls its function',
    parameters: { type: 'object', properties: { packageName: { type: 'string' }, version: { type: 'string' }, functionName: { type: 'string' }, schema: { type: 'object' }, initCode: { type: 'string' } }, required: ['packageName'] }
  }

  return { registerNpmTool }
}
