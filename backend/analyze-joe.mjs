import { selfEvolutionTools } from './src/tools/selfEvolutionTools.mjs';

console.log('🔍 تحليل شامل لقدرات JOE...\n');

const analysis = await selfEvolutionTools.analyzeCurrentCapabilities();

if (analysis.success) {
  console.log('📊 النتائج:');
  console.log(`- عدد الأدوات الكلي: ${analysis.capabilities.totalTools}`);
  console.log(`- عدد الملفات: ${analysis.capabilities.toolFiles.length}`);
  console.log('\n📁 الملفات:');
  analysis.capabilities.toolFiles.forEach(file => {
    console.log(`  - ${file.name}: ${file.functions.length} دالة`);
  });
}

const suggestions = await selfEvolutionTools.suggestImprovements();

if (suggestions.success) {
  console.log('\n💡 اقتراحات التحسين:');
  console.log(JSON.stringify(suggestions.suggestions, null, 2));
}
