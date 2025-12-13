#!/usr/bin/env node
import toolManager from '../backend/src/services/tools/tool-manager.service.mjs';

async function main() {
  console.log('🔎 Testing tools usage and execution policy...');
  await toolManager.initialize();

  const schemas = toolManager.getToolSchemas();
  console.log(`📚 Registered tools: ${schemas.length}`);
  if (!schemas.length) throw new Error('No tools registered');

  // Register a failing dynamic tool to test circuit breaker
  const failingSchema = {
    name: 'alwaysFail',
    description: 'Intentionally fails for circuit breaker testing',
    parameters: { type: 'object', properties: {} }
  };
  toolManager.registerDynamicTool('alwaysFail', async () => { throw new Error('FAIL_INTENTIONAL'); }, failingSchema);

  // Trip the circuit
  for (let i = 0; i < 3; i++) {
    try { await toolManager.execute('alwaysFail', {}); } catch (e) { console.log(`⚠️ Fail ${i+1}: ${e.message}`); }
  }

  // Fourth call should hit CIRCUIT_OPEN
  try { await toolManager.execute('alwaysFail', {}); }
  catch (e) { console.log(`🔒 Circuit response: ${e.message}`); }

  const snapshot = toolManager.getStatsSnapshot();
  console.log('📊 Circuit open tools:', snapshot.openCircuits);

  // Execute a safe local tool
  const out1 = await toolManager.execute('generateBoilerplate', {
    templateType: 'BASIC_HTML',
    name: 'PolicyCheck',
    outputFilePath: '/tmp/policy-check.html',
    cache: true,
    cacheTtlMs: 10000
  });
  console.log('✅ generateBoilerplate result:', out1);

  // Cached call
  const out2 = await toolManager.execute('generateBoilerplate', {
    templateType: 'BASIC_HTML',
    name: 'PolicyCheck',
    outputFilePath: '/tmp/policy-check.html',
    cache: true,
    cacheTtlMs: 10000
  });
  console.log('🧠 Cached generateBoilerplate result:', out2);

  // Summary
  console.log('✅ Tools usable:', schemas.length > 0);
  console.log('✅ Circuit breaker works:', snapshot.openCircuits.includes('alwaysFail'));
}

main().catch((e) => { console.error('❌ Test failed:', e); process.exit(1); });
