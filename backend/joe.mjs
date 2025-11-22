/**
 * 🚀 Joe Orchestrator - المنسق الرئيسي للمهام
 * هذا هو نقطة الدخول لتشغيل نظام JOEngine بشكل مستقل.
 * يعتمد هذا الملف على متغيرات البيئة التي يتم توفيرها بواسطة بيئة التشغيل (مثل IDX).
 * 
 * كيفية الاستخدام:
 * node backend/joe.mjs
 */

import { createPlan } from './src/services/ai/ai-engine.service.mjs';
import AdvancedToolsManager from './src/tools_refactored/AdvancedToolsManager.mjs';

// --- المهمة الأساسية ---
const mainTask = "قم أولاً بقراءة محتوى الملف src/services/ai/ai-engine.service.mjs. بعد ذلك، قم بتحليل هذا المحتوى لتحديد نقاط القوة والضعف. أخيرًا، اكتب تقريرًا مفصلاً بهذه النتائج في ملف جديد اسمه analysis_report.md";

// --- التنفيذ ---
async function main() {
    // التحقق من أن المفتاح موجود في بيئة التشغيل
    if (!process.env.GEMINI_API_KEY) {
        console.error('❌ CRITICAL ERROR: The GEMINI_API_KEY environment variable is not set.');
        console.error('Please ensure it is defined in your environment configuration (e.g., .idx/dev.nix) and that you have reloaded the workspace.');
        return; // التوقف عن التنفيذ
    }

    console.log(`🎯 Starting main task: \"${mainTask}\"`);
    console.log('--------------------------------------------------');

    try {
        // 1. التخطيط (Thinking & Planning)
        console.log('🧠 Step 1: Creating a plan...');
        const planResponse = await createPlan(mainTask, {
            workingDirectory: process.cwd(),
            relevantFiles: ['backend/src/services/ai/ai-engine.service.mjs']
        });

        if (!planResponse.success || !planResponse.plan || planResponse.plan.length === 0) {
            console.error('❌ Failed to create a valid plan.');
            return;
        }
        
        const plan = planResponse.plan;
        console.log('✅ Plan created successfully:');
        console.log(JSON.stringify(plan, null, 2));
        console.log('--------------------------------------------------');

        // 2. التنفيذ (Execution)
        console.log('🚀 Step 2: Executing the plan...');
        const executor = new AdvancedToolsManager();
        const executionResult = await executor.executePlan(plan);

        console.log('--------------------------------------------------');
        
        // 3. عرض النتائج النهائية
        if (executionResult.success) {
            console.log('🎉🎉🎉 Main task completed successfully! 🎉🎉🎉');
            console.log('📊 Final Summary:');
            console.log(JSON.stringify(executionResult.summary, null, 2));
        } else {
            console.error('❌ Main task failed during execution.');
            console.error('📊 Execution Summary:');
            console.error(JSON.stringify(executionResult.summary, null, 2));
        }

    } catch (error) {
        console.error(`❌ A critical error occurred in the orchestrator: ${error.message}`);
    }
}

// بدء العملية بأكملها
main();
