import { ToolsSystem } from './tools/ToolsSystem.mjs';

async function main() {
  console.log('Starting tool system test...');
  const toolsSystem = new ToolsSystem();
  await toolsSystem.initialize(); // Explicitly initialize

  const allTools = toolsSystem.getAllTools();

  console.log('\n--- All Loaded Tools ---');
  console.log(allTools);
  console.log('\n------------------------');
}

main().catch(console.error);
