import express from 'express'
import http from 'http'
import jwt from 'jsonwebtoken'
import axios from 'axios'
import WebSocket from 'ws'
import joeRouterFactory from '../src/api/joe.router.mjs'
import toolManager from '../src/services/tools/tool-manager.service.mjs'
import MemoryManager from '../src/services/memory/memory.service.mjs'
import { JoeAgentWebSocketServer } from '../src/services/joeAgentWebSocket.mjs'

async function main(){
  const JWT_SECRET = 'test-secret-for-flow'
  const memoryManager = new MemoryManager()
  const deps = {
    memoryManager,
    JWT_SECRET,
    requireRole: () => (req, _res, next) => next(),
    optionalAuth: () => (req, _res, next) => next(),
    db: async () => null
  }
  await toolManager.initialize(deps)
  const schemas = toolManager.getToolSchemas()
  const names = schemas.map(s => String(s?.function?.name || '').trim()).filter(Boolean)
  const uniqueCount = new Set(names).size
  console.log('[Tools] total:', names.length, 'unique:', uniqueCount)

  const restPort = 5002
  const restApp = express()
  restApp.use(express.json())
  const restRouter = joeRouterFactory(deps)
  restApp.use('/api/v1/joe', restRouter)
  const restServer = http.createServer(restApp)
  await new Promise(resolve => restServer.listen(restPort, '127.0.0.1', resolve))
  console.log('[REST] listening on', restPort)
  let restResult = null
  try {
    const r = await axios.post(
      `http://127.0.0.1:${restPort}/api/v1/joe/execute`,
      { instruction: 'ملخص عن النظام والأدوات' },
      { timeout: 30000 }
    )
    restResult = r.data
    console.log('[REST] ok response length:', String(restResult?.response || '').length, 'tools:', Array.isArray(restResult?.toolsUsed) ? restResult.toolsUsed.join(',') : '')
  } catch (e) {
    console.log('[REST] error', e?.response?.status || '', e?.response?.data || e?.message)
  }

  try {
    const mon = await axios.get(`http://127.0.0.1:${restPort}/api/v1/joe/monitor`, { timeout: 5000 })
    console.log('[REST] monitor length:', String(mon?.data || '').length)
  } catch (e) {
    console.log('[REST] monitor error', e?.response?.status || '', e?.response?.data || e?.message)
  }

  const wsPort = 5001
  const wsServer = http.createServer()
  const joeWs = new JoeAgentWebSocketServer(wsServer, deps)
  void joeWs
  await new Promise(resolve => wsServer.listen(wsPort, '127.0.0.1', resolve))
  console.log('[WS] listening on', wsPort)
  const token = jwt.sign({ userId: 'guest:test', role: 'guest' }, JWT_SECRET, { expiresIn: '1h' })
  const wsUrl = `ws://127.0.0.1:${wsPort}/ws/joe-agent?token=${token}&lang=ar`
  const client = new WebSocket(wsUrl)
  let wsResponse = null
  let wsTools = []
  await new Promise((resolve) => {
    setTimeout(resolve, 15000)
    client.on('open', () => {
      client.send(JSON.stringify({ action: 'instruct', message: 'ملخص عن النظام والأدوات', lang: 'ar' }))
    })
    client.on('message', (msg) => {
      try {
        const data = JSON.parse(String(msg))
        if (data.type === 'response') {
          wsResponse = data.response
          wsTools = Array.isArray(data.toolsUsed) ? data.toolsUsed : []
        }
      } catch { void 0 }
    })
    client.on('close', () => resolve())
    client.on('error', () => resolve())
  })

  console.log('[WS] response length:', String(wsResponse || '').length, 'tools:', wsTools.join(','))

  try { client.close() } catch { void 0 }
  try { await new Promise(r => wsServer.close(r)) } catch { void 0 }
  try { await new Promise(r => restServer.close(r)) } catch { void 0 }

  const report = {
    tools: { total: names.length, unique: uniqueCount, duplicated: names.length - uniqueCount },
    rest: { success: !!(restResult && (restResult.response || restResult.message || restResult.output)), toolsUsed: restResult?.toolsUsed || [] },
    ws: { success: !!wsResponse, toolsUsed: wsTools }
  }
  console.log(JSON.stringify(report))
  process.exit(0)
}

main().catch(e => { console.error('fatal', e?.message || String(e)) ; process.exit(1) })
