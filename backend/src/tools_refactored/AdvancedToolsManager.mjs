/**
 * 🚀 Advanced Tools Manager (The Executor) - المنفذ الرئيسي للخطط
 * هذا هو العقل التنفيذي لنظام JOEngine. يقوم بتنسيق وتنفيذ الخطط التي تم إنشاؤها بواسطة AIEngine.
 * 
 * @module AdvancedToolsManager
 * @version 3.0.0
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class AdvancedToolsManager {
    constructor(options = {}) {
        this.toolsDir = options.toolsDir || path.join(__dirname);
        this.toolInstances = new Map();
        this.isInitialized = false;

        console.log('✅ Advanced Tools Manager (Executor) initialized.');
    }

    /**
     * 📂 تحميل وتهيئة جميع الأدوات المتاحة بشكل ديناميكي
     * يقوم بقراءة مجلد الأدوات واستيرادها وإنشاء نسخة منها.
     */
    async loadTools() {
        if (this.isInitialized) return;

        console.log(`📂 Loading tools from: ${this.toolsDir}`);

        try {
            const files = await fs.readdir(this.toolsDir);

            for (const file of files) {
                // تجاهل هذا الملف (المدير نفسه) والملفات غير MJS
                if (file.endsWith('.mjs') && file !== 'AdvancedToolsManager.mjs') {
                    const toolName = path.basename(file, '.mjs');
                    
                    try {
                        const toolModule = await import(path.join(this.toolsDir, file));
                        const ToolClass = toolModule.default || Object.values(toolModule)[0];
                        
                        if (typeof ToolClass === 'function') {
                            const instance = new ToolClass();
                            this.toolInstances.set(toolName, instance);
                            console.log(`✅ Tool loaded: ${toolName}`);
                        } else {
                            console.warn(`⚠️ No valid class found in ${file}`);
                        }

                    } catch (error) {
                        console.error(`❌ Error loading tool ${file}:`, error);
                    }
                }
            }

            this.isInitialized = true;
            console.log('👍 All tools loaded successfully.');

        } catch (error) {
            console.error('❌ Critical error loading tools:', error);
            throw new Error('Could not initialize the tool manager.');
        }
    }

    /**
     * 🏃‍♂️ تنفيذ خطة عمل منظمة
     * هذه هي الدالة الأساسية التي تستقبل خطة JSON وتنفذها خطوة بخطوة.
     * 
     * @param {Array<object>} plan - مصفوفة من الخطوات، تم إنشاؤها بواسطة AIEngine.createPlan
     * @returns {Promise<object>} - ملخص لنتائج تنفيذ الخطة
     */
    async executePlan(plan) {
        if (!this.isInitialized) {
            await this.loadTools();
        }

        console.log('🚀 Starting plan execution...');

        const executionResults = {};
        const summary = [];

        for (const step of plan) {
            console.log(`\n▶️ Executing Step ${step.step}: ${step.thought}`);

            const { tool, action, params } = step;

            if (!this.toolInstances.has(tool)) {
                const errorMsg = `Tool "${tool}" not found.`;
                console.error(`❌ ${errorMsg}`);
                summary.push({ step: step.step, status: 'Failed', error: errorMsg });
                return { success: false, summary, results: executionResults };
            }

            try {
                const toolInstance = this.toolInstances.get(tool);

                // 🧠 معالجة ذكية للمعلمات: استبدال نتائج الخطوات السابقة
                const resolvedParams = this.resolvePlaceholders(params, executionResults);

                // 📝 بناء متطلبات المهمة
                const taskRequirements = {
                    action: action,
                    ...resolvedParams
                };

                console.log(`   - Tool: ${tool}`);
                console.log(`   - Action: ${action}`);
                console.log(`   - Params: ${JSON.stringify(resolvedParams, null, 2)}`);

                // 🚀 تنفيذ المهمة الفعلية
                const result = await toolInstance.executeTask(taskRequirements);

                if (!result.success) {
                    throw new Error(result.error || 'Tool execution failed without a specific error message.');
                }

                // 💾 تخزين النتيجة
                executionResults[`step${step.step}`] = result;
                summary.push({ step: step.step, tool, action, status: 'Success', result: result.message });

                console.log(`✅ Step ${step.step} completed successfully.`);
                console.log(`   - Result: ${JSON.stringify(result, null, 2)}`);

            } catch (error) {
                const errorMsg = `Step ${step.step} (${tool}.${action}) failed: ${error.message}`;
                console.error(`❌ ${errorMsg}`);
                summary.push({ step: step.step, status: 'Failed', error: errorMsg });
                return { success: false, summary, results: executionResults };
            }
        }

        console.log('\n🎉 Plan execution completed successfully!');
        return { success: true, summary, results: executionResults };
    }

    /**
     * 🧩 حل الاعتماديات بين الخطوات
     * يستبدل النصوص النائبة (e.g., "result of step 1") بالنتائج الفعلية.
     * 
     * @param {object} params - المعلمات التي قد تحتوي على نصوص نائبة.
     * @param {object} results - كائن يحتوي على نتائج الخطوات السابقة.
     * @returns {object} - المعلمات بعد استبدال النصوص النائبة.
     */
    resolvePlaceholders(params, results) {
        const resolved = {};
        const placeholderRegex = /result of step (\d+)/i;

        for (const key in params) {
            const value = params[key];

            if (typeof value === 'string') {
                const match = value.match(placeholderRegex);
                if (match && match[1]) {
                    const stepNumber = `step${match[1]}`;
                    if (results[stepNumber]) {
                        console.log(`   - Resolving placeholder: "${value}" with result from ${stepNumber}`);
                        resolved[key] = results[stepNumber].result; // استخدام نتيجة الخطوة السابقة
                    } else {
                        // إذا لم تكن النتيجة موجودة، اتركها كما هي ليتم التعامل معها لاحقًا
                        resolved[key] = value; 
                    }
                } else {
                    resolved[key] = value;
                }
            } else if (typeof value === 'object' && value !== null) {
                // البحث المتكرر في الكائنات والمصفوفات
                resolved[key] = this.resolvePlaceholders(value, results);
            } else {
                resolved[key] = value;
            }
        }
        return resolved;
    }
}

export default AdvancedToolsManager;
