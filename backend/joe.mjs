/**
 * 🚀 Joe Orchestrator - المنسق الرئيسي للمهام
 * هذا هو نقطة الدخول لتشغيل نظام JOEngine بشكل مستقل.
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

main();
