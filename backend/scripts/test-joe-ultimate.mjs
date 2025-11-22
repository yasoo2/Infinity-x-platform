/**
 * اختبار شامل لجميع قدرات JOE Ultimate
 */

import { advancedBrowserTools } from './src/tools/advancedBrowserTools.mjs';
import { advancedSearchTools } from './src/tools/advancedSearchTools.mjs';
import { selfEvolutionTools } from './src/tools/selfEvolutionTools.mjs';
import { autoUpdateTools } from './src/tools/autoUpdateTools.mjs';
import { softwareDevelopmentTools } from './src/tools/softwareDevelopmentTools.mjs';
import { ecommerceTools } from './src/tools/ecommerceTools.mjs';

console.log('🧪 بدء اختبار JOE Ultimate...\n');

const testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

/**
 * تسجيل نتيجة الاختبار
 */
function logTest(name, result, details = '') {
  const status = result ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} - ${name}`);
  if (details) console.log(`   ${details}`);
  
  testResults.tests.push({ name, result, details });
  if (result) testResults.passed++;
  else testResults.failed++;
}

/**
 * 1. اختبار أدوات البحث المتقدم
 */
async function testAdvancedSearch() {
  console.log('\n📍 اختبار 1: أدوات البحث المتقدم\n');
  
  try {
    const result = await advancedSearchTools.advancedWebSearch('React tutorials', { maxResults: 3 });
    logTest('Advanced Web Search', result.success, `Found ${result.results?.length || 0} results`);
  } catch (error) {
    logTest('Advanced Web Search', false, error.message);
  }
}

/**
 * 2. اختبار أدوات التصفح المتقدم
 */
async function testAdvancedBrowsing() {
  console.log('\n📍 اختبار 2: أدوات التصفح المتقدم\n');
  
  try {
    const result = await advancedBrowserTools.advancedBrowse('https://example.com', { extractImages: false });
    logTest('Advanced Browse', result.success, `Title: ${result.metadata?.title || 'N/A'}`);
  } catch (error) {
    logTest('Advanced Browse', false, error.message);
  }
}

/**
 * 3. اختبار أدوات التطوير الذاتي
 */
async function testSelfEvolution() {
  console.log('\n📍 اختبار 3: أدوات التطوير الذاتي\n');
  
  try {
    const result = await selfEvolutionTools.analyzeCurrentCapabilities();
    logTest('Analyze Capabilities', result.success, `Found ${result.capabilities?.totalTools || 0} tools`);
  } catch (error) {
    logTest('Analyze Capabilities', false, error.message);
  }
  
  try {
    const result = await selfEvolutionTools.monitorPerformance();
    logTest('Monitor Performance', result.success, `Memory: ${result.analysis?.memoryUsageMB || 0}MB`);
  } catch (error) {
    logTest('Monitor Performance', false, error.message);
  }
}

/**
 * 4. اختبار أدوات التحديث التلقائي
 */
async function testAutoUpdate() {
  console.log('\n📍 اختبار 4: أدوات التحديث التلقائي\n');
  
  try {
    const result = await autoUpdateTools.checkForUpdates();
    logTest('Check For Updates', result.success, `Has updates: ${result.hasUpdates ? 'Yes' : 'No'}`);
  } catch (error) {
    logTest('Check For Updates', false, error.message);
  }
}

/**
 * 5. اختبار أدوات تطوير البرمجيات
 */
async function testSoftwareDevelopment() {
  console.log('\n📍 اختبار 5: أدوات تطوير البرمجيات\n');
  
  try {
    const testCode = `var x = 10; console.log(x);`;
    const result = await softwareDevelopmentTools.analyzeCode(testCode, 'javascript');
    logTest('Analyze Code', result.success, `Issues: ${result.analysis?.issues?.length || 0}`);
  } catch (error) {
    logTest('Analyze Code', false, error.message);
  }
}

/**
 * تشغيل جميع الاختبارات
 */
async function runAllTests() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🚀 JOE Ultimate - اختبار شامل لجميع القدرات');
  console.log('═══════════════════════════════════════════════════════');
  
  await testAdvancedSearch();
  await testAdvancedBrowsing();
  await testSelfEvolution();
  await testAutoUpdate();
  await testSoftwareDevelopment();
  
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('📊 نتائج الاختبار النهائية');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`✅ نجح: ${testResults.passed}`);
  console.log(`❌ فشل: ${testResults.failed}`);
  console.log(`📈 نسبة النجاح: ${Math.round((testResults.passed / (testResults.passed + testResults.failed)) * 100)}%`);
  console.log('═══════════════════════════════════════════════════════\n');
  
  return testResults;
}

// تشغيل الاختبارات
runAllTests().then(results => {
  if (results.failed === 0) {
    console.log('🎉 جميع الاختبارات نجحت! JOE Ultimate جاهز للعمل!\n');
    process.exit(0);
  } else {
    console.log('⚠️ بعض الاختبارات فشلت. يرجى مراجعة النتائج أعلاه.\n');
    process.exit(1);
  }
}).catch(error => {
  console.error('❌ خطأ في تشغيل الاختبارات:', error);
  process.exit(1);
});
