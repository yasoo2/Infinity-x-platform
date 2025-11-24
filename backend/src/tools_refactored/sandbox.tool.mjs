/**
 * @file sandbox.tool.mjs
 * @description Tool for interacting with the SandboxManager, refactored to accept dependencies.
 * @version 2.0.0
 */

const sandboxToolFactory = (dependencies) => {
  const { sandboxManager } = dependencies;

  if (!sandboxManager) {
    throw new Error('SandboxManager dependency is missing for sandboxTool.');
  }

  const executeInSandbox = async ({ code, context }) => {
    try {
      const result = await sandboxManager.execute(code, context);
      return { success: true, ...result };
    } catch (error) {
      console.error('Sandbox execution error:', error);
      return { success: false, error: error.message };
    }
  };

  executeInSandbox.metadata = {
    name: 'executeInSandbox',
    description: 'Executes arbitrary code in a secure sandboxed environment.',
    parameters: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'The code to execute in the sandbox.',
        },
        context: {
          type: 'object',
          description: 'An optional object providing context to the sandboxed code.',
        },
      },
      required: ['code'],
    },
  };

  // Return the tool functions keyed by their name
  return {
    executeInSandbox,
  };
};

export default sandboxToolFactory;
