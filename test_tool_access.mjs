import toolManager from './backend/src/services/tools/tool-manager.service.mjs';
import SandboxManager from './backend/src/sandbox/SandboxManager.mjs';

(async () => {
  try {
    console.log('--- Running Tool Access and Sandbox Test ---');
    
    await toolManager.initialize();
    
    // Correctly initialize SandboxManager and its connections
    const sandboxManager = await new SandboxManager().initializeConnections();
    
    console.log('Executing shell command...');
    const result = await sandboxManager.executeShell('ls -la', { sessionId: 'test-session' });
    
    console.log('--- Test Result ---');
    console.log(result);
    console.log('---------------------');
    
    if (result.success) {
      console.log('✅ Test Passed: Sandbox executed the command successfully.');
    } else {
      console.error('❌ Test Failed: Sandbox execution returned an error.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Test Script Crashed:', error);
    process.exit(1);
  } finally {
    // In a real scenario, you might want to close connections, but we'll exit here
    process.exit(0);
  }
})();
