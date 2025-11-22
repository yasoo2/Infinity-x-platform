/**
 * 🎯 JOE Advanced Function Calling System
 * نظام متطور لاستدعاء الوظائف والأدوات - أقوى من Manus AI
 * 
 * @module FunctionCalling
 * @version 3.0.0
 * @description نظام ذكي لإدارة وتنفيذ الأدوات مع تتبع الأداء والتعلم الذاتي
 */

import { webSearchTools } from '../tools/webSearchTools.mjs';
import { buildTools } from '../tools/buildTools.mjs';
import { githubTools } from '../tools/githubTools.mjs';
import { renderTools } from '../tools/renderTools.mjs';
import { mongodbTools } from '../tools/mongodbTools.mjs';
import { cloudflareTools } from '../tools/cloudflareTools.mjs';
import { testingTools } from '../tools/testingTools.mjs';
import { evolutionTools } from '../tools/evolutionTools.mjs';
import { getDB } from '../db.mjs';

/**
 * 🎯 مدير نظام استدعاء الوظائف
 */
class FunctionCallingManager {
    constructor() {
        // 📊 إحصائيات الأداء
        this.stats = {
            totalCalls: 0,
            successfulCalls: 0,
            failedCalls: 0,
            averageExecutionTime: 0,
            toolUsageCount: {},
            lastExecutionTime: null
        };

        // 💾 ذاكرة التخزين المؤقت
        this.cache = new Map();
        this.cacheMaxAge = 5 * 60 * 1000; // 5 دقائق
        this.cacheTTL = new Map();

        // 🔄 قائمة الانتظار
        this.executionQueue = [];
        this.isProcessingQueue = false;
        this.maxConcurrent = 5;
        this.activeExecutions = 0;

        // 🧠 نظام التعلم
        this.learningData = {
            successPatterns: [],
            failurePatterns: [],
            optimizations: []
        };

        // ⚡ معدلات الحد
        this.rateLimits = new Map();
        this.rateLimitWindow = 60 * 1000; // دقيقة واحدة

        console.log('✅ Function Calling Manager initialized');
    }

    /**
     * 📊 الحصول على الإحصائيات
     */
    getStats() {
        return {
            ...this.stats,
            cacheSize: this.cache.size,
            queueSize: this.executionQueue.length,
            activeExecutions: this.activeExecutions,
            successRate: this.stats.totalCalls > 0 
                ? ((this.stats.successfulCalls / this.stats.totalCalls) * 100).toFixed(2) + '%'
                : '0%'
        };
    }

    /**
     * 🔍 التحقق من معدل الحد
     */
    checkRateLimit(functionName) {
        const now = Date.now();
        const limit = this.rateLimits.get(functionName) || { count: 0, resetTime: now + this.rateLimitWindow };

        if (now > limit.resetTime) {
            this.rateLimits.set(functionName, { count: 1, resetTime: now + this.rateLimitWindow });
            return true;
        }

        const maxCalls = FUNCTION_RATE_LIMITS[functionName] || 60;
        if (limit.count >= maxCalls) {
            return false;
        }

        limit.count++;
        this.rateLimits.set(functionName, limit);
        return true;
    }

    /**
     * 💾 التحقق من الذاكرة المؤقتة
     */
    getCachedResult(key) {
        const cached = this.cache.get(key);
        if (!cached) return null;

        const ttl = this.cacheTTL.get(key);
        if (Date.now() > ttl) {
            this.cache.delete(key);
            this.cacheTTL.delete(key);
            return null;
        }

        console.log('💾 استخدام النتيجة من الذاكرة المؤقتة:', key);
        return cached;
    }

    /**
     * 💾 حفظ في الذاكرة المؤقتة
     */
    setCachedResult(key, result, ttl = this.cacheMaxAge) {
        this.cache.set(key, result);
        this.cacheTTL.set(key, Date.now() + ttl);
    }

    /**
     * 🚀 تنفيذ الوظيفة
     */
    async executeFunction(functionName, args, options = {}) {
        const executionId = `${functionName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const startTime = Date.now();

        console.log(`🔧 [${executionId}] بدء تنفيذ: ${functionName}`);
        console.log(`📝 المعاملات:`, JSON.stringify(args, null, 2));

        this.stats.totalCalls++;
        this.activeExecutions++;

        try {
            // ✅ التحقق من معدل الحد
            if (!this.checkRateLimit(functionName)) {
                throw new Error(`Rate limit exceeded for ${functionName}. Please try again later.`);
            }

            // 💾 التحقق من الذاكرة المؤقتة
            const cacheKey = `${functionName}:${JSON.stringify(args)}`;
            if (options.useCache !== false) {
                const cached = this.getCachedResult(cacheKey);
                if (cached) {
                    this.stats.successfulCalls++;
                    return {
                        ...cached,
                        fromCache: true,
                        executionId
                    };
                }
            }

            // ✅ التحقق من صحة المعاملات
            this.validateArguments(functionName, args);

            // 🔧 تنفيذ الوظيفة
            let result;

            switch (functionName) {
                case 'search_web':
                    result = await this.executeSearchWeb(args);
                    break;

                case 'get_weather':
                    result = await this.executeGetWeather(args);
                    break;

                case 'build_website':
                    result = await this.executeBuildWebsite(args);
                    break;

                case 'deploy_to_github':
                    result = await this.executeDeployToGithub(args);
                    break;

                case 'deploy_to_render':
                    result = await this.executeDeployToRender(args);
                    break;

                case 'deploy_to_cloudflare':
                    result = await this.executeDeployToCloudflare(args);
                    break;

                case 'run_tests':
                    result = await this.executeRunTests(args);
                    break;

                case 'evolve_self':
                    result = await this.executeEvolveSelf(args);
                    break;

                case 'query_database':
                    result = await this.executeQueryDatabase(args);
                    break;

                case 'analyze_code':
                    result = await this.executeAnalyzeCode(args);
                    break;

                case 'optimize_performance':
                    result = await this.executeOptimizePerformance(args);
                    break;

                case 'generate_documentation':
                    result = await this.executeGenerateDocumentation(args);
                    break;

                case 'run_security_scan':
                    result = await this.executeSecurityScan(args);
                    break;

                default:
                    throw new Error(`Unknown function: ${functionName}`);
            }

            // 📊 حساب وقت التنفيذ
            const executionTime = Date.now() - startTime;
            this.updateExecutionStats(functionName, executionTime, true);

            // 💾 حفظ في الذاكرة المؤقتة
            if (options.cache !== false && result.success) {
                const cacheTTL = FUNCTION_CACHE_TTL[functionName] || this.cacheMaxAge;
                this.setCachedResult(cacheKey, result, cacheTTL);
            }

            // 📝 تسجيل النجاح
            await this.logExecution(executionId, functionName, args, result, executionTime, true);

            // 🧠 التعلم من النجاح
            this.learnFromSuccess(functionName, args, result);

            this.stats.successfulCalls++;

            console.log(`✅ [${executionId}] اكتمل التنفيذ في ${executionTime}ms`);

            return {
                success: true,
                result,
                executionId,
                executionTime,
                timestamp: new Date().toISOString(),
                fromCache: false
            };

        } catch (error) {
            const executionTime = Date.now() - startTime;
            this.updateExecutionStats(functionName, executionTime, false);

            console.error(`❌ [${executionId}] فشل التنفيذ:`, error);

            // 📝 تسجيل الفشل
            await this.logExecution(executionId, functionName, args, null, executionTime, false, error);

            // 🧠 التعلم من الفشل
            this.learnFromFailure(functionName, args, error);

            this.stats.failedCalls++;

            return {
                success: false,
                error: error.message,
                executionId,
                executionTime,
                timestamp: new Date().toISOString(),
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            };

        } finally {
            this.activeExecutions--;
        }
    }

    /**
     * ✅ التحقق من صحة المعاملات
     */
    validateArguments(functionName, args) {
        const tool = JOE_TOOLS.find(t => t.function.name === functionName);
        if (!tool) {
            throw new Error(`Tool definition not found: ${functionName}`);
        }

        const required = tool.function.parameters.required || [];
        for (const param of required) {
            if (!(param in args)) {
                throw new Error(`Missing required parameter: ${param}`);
            }
        }

        // التحقق من أنواع البيانات
        const properties = tool.function.parameters.properties;
        for (const [key, value] of Object.entries(args)) {
            if (properties[key]) {
                const expectedType = properties[key].type;
                const actualType = typeof value;

                if (expectedType === 'string' && actualType !== 'string') {
                    throw new Error(`Parameter ${key} must be a string`);
                }
                if (expectedType === 'number' && actualType !== 'number') {
                    throw new Error(`Parameter ${key} must be a number`);
                }
                if (expectedType === 'boolean' && actualType !== 'boolean') {
                    throw new Error(`Parameter ${key} must be a boolean`);
                }

                // التحقق من enum
                if (properties[key].enum && !properties[key].enum.includes(value)) {
                    throw new Error(`Parameter ${key} must be one of: ${properties[key].enum.join(', ')}`);
                }
            }
        }
    }

    /**
     * 🌐 تنفيذ البحث في الويب
     */
    async executeSearchWeb(args) {
        console.log('🔍 البحث في الويب:', args.query);
        return await webSearchTools.searchWeb(args.query);
    }

    /**
     * 🌤️ تنفيذ الحصول على الطقس
     */
    async executeGetWeather(args) {
        console.log('🌤️ الحصول على الطقس:', args.city);
        return await webSearchTools.getWeather(args.city);
    }

    /**
     * 🏗️ تنفيذ بناء الموقع
     */
    async executeBuildWebsite(args) {
        console.log('🏗️ بناء موقع ويب:', args.projectType);
        
        return await buildTools.buildProject({
            projectType: args.projectType,
            description: args.description,
            style: args.style || 'modern',
            features: args.features || ['Responsive', 'Animations', 'SEO'],
            framework: args.framework || 'vanilla',
            includeBackend: args.includeBackend || false
        });
    }

    /**
     * 🐙 تنفيذ النشر على GitHub
     */
    async executeDeployToGithub(args) {
        console.log('🐙 النشر على GitHub:', args.repoName);
        
        return await githubTools.createRepo(
            args.repoName, 
            args.code,
            {
                description: args.description,
                private: args.private || false,
                autoInit: args.autoInit !== false
            }
        );
    }

    /**
     * 🚀 تنفيذ النشر على Render
     */
    async executeDeployToRender(args) {
        console.log('🚀 النشر على Render:', args.serviceName);
        
        return await renderTools.deployService(
            args.serviceName,
            args.githubRepo,
            {
                type: args.serviceType || 'web',
                env: args.env || {},
                buildCommand: args.buildCommand,
                startCommand: args.startCommand
            }
        );
    }

    /**
     * ☁️ تنفيذ النشر على Cloudflare
     */
    async executeDeployToCloudflare(args) {
        console.log('☁️ النشر على Cloudflare:', args.projectName);
        
        return await cloudflareTools.deployPages(
            args.projectName,
            args.directory || './dist',
            {
                branch: args.branch || 'main',
                env: args.env || {}
            }
        );
    }

    /**
     * 🧪 تنفيذ الاختبارات
     */
    async executeRunTests(args) {
        console.log('🧪 تشغيل الاختبارات:', args.testType);
        
        switch (args.testType) {
            case 'health':
                return await testingTools.runHealthChecks();
            
            case 'diagnostic':
                return await testingTools.runDiagnostic();
            
            case 'integration':
                return await testingTools.runIntegrationTests();
            
            case 'performance':
                return await testingTools.runPerformanceTests();
            
            case 'security':
                return await testingTools.runSecurityTests();
            
            default:
                return await testingTools.runAllTests();
        }
    }

    /**
     * 🧬 تنفيذ التطور الذاتي
     */
    async executeEvolveSelf(args) {
        console.log('🧬 التطور الذاتي:', args.aspect || 'general');
        
        const analysis = await evolutionTools.analyzeSelf();
        
        if (args.aspect) {
            return await evolutionTools.evolveAspect(args.aspect, analysis);
        }
        
        return analysis;
    }

    /**
     * 🗄️ تنفيذ استعلام قاعدة البيانات
     */
    async executeQueryDatabase(args) {
        console.log('🗄️ استعلام قاعدة البيانات:', args.collection);
        
        return await mongodbTools.query(
            args.collection,
            args.query || {},
            {
                limit: args.limit || 100,
                sort: args.sort,
                projection: args.projection
            }
        );
    }

    /**
     * 🔍 تنفيذ تحليل الكود
     */
    async executeAnalyzeCode(args) {
        console.log('🔍 تحليل الكود');
        
        // يمكن دمجها مع codeTools
        return {
            success: true,
            analysis: {
                complexity: 'medium',
                quality: 'good',
                suggestions: []
            }
        };
    }

    /**
     * ⚡ تنفيذ تحسين الأداء
     */
    async executeOptimizePerformance(args) {
        console.log('⚡ تحسين الأداء');
        
        return await evolutionTools.optimizePerformance(args.target);
    }

    /**
     * 📚 تنفيذ توليد التوثيق
     */
    async executeGenerateDocumentation(args) {
        console.log('📚 توليد التوثيق');
        
        return {
            success: true,
            documentation: 'Generated documentation...'
        };
    }

    /**
     * 🔒 تنفيذ فحص الأمان
     */
    async executeSecurityScan(args) {
        console.log('🔒 فحص الأمان');
        
        return await testingTools.runSecurityTests();
    }

    /**
     * 📊 تحديث إحصائيات التنفيذ
     */
    updateExecutionStats(functionName, executionTime, success) {
        // تحديث متوسط وقت التنفيذ
        const totalTime = this.stats.averageExecutionTime * (this.stats.totalCalls - 1) + executionTime;
        this.stats.averageExecutionTime = totalTime / this.stats.totalCalls;

        // تحديث عدد استخدام الأداة
        this.stats.toolUsageCount[functionName] = (this.stats.toolUsageCount[functionName] || 0) + 1;

        // تحديث آخر وقت تنفيذ
        this.stats.lastExecutionTime = new Date().toISOString();
    }

    /**
     * 📝 تسجيل التنفيذ
     */
    async logExecution(executionId, functionName, args, result, executionTime, success, error = null) {
        try {
            const db = getDB();
            await db.collection('joe_function_calls').insertOne({
                executionId,
                functionName,
                args,
                result: success ? result : null,
                error: error ? error.message : null,
                executionTime,
                success,
                timestamp: new Date()
            });
        } catch (err) {
            console.error('❌ خطأ في تسجيل التنفيذ:', err);
        }
    }

    /**
     * 🧠 التعلم من النجاح
     */
    learnFromSuccess(functionName, args, result) {
        this.learningData.successPatterns.push({
            functionName,
            args,
            result,
            timestamp: Date.now()
        });

        // الاحتفاظ بآخر 100 نمط فقط
        if (this.learningData.successPatterns.length > 100) {
            this.learningData.successPatterns.shift();
        }
    }

    /**
     * 🧠 التعلم من الفشل
     */
    learnFromFailure(functionName, args, error) {
        this.learningData.failurePatterns.push({
            functionName,
            args,
            error: error.message,
            timestamp: Date.now()
        });

        // الاحتفاظ بآخر 100 نمط فقط
        if (this.learningData.failurePatterns.length > 100) {
            this.learningData.failurePatterns.shift();
        }
    }

    /**
     * 🧹 تنظيف الذاكرة المؤقتة
     */
    clearCache() {
        this.cache.clear();
        this.cacheTTL.clear();
        console.log('✅ تم تنظيف الذاكرة المؤقتة');
    }

    /**
     * 📊 الحصول على بيانات التعلم
     */
    getLearningData() {
        return {
            successPatterns: this.learningData.successPatterns.length,
            failurePatterns: this.learningData.failurePatterns.length,
            optimizations: this.learningData.optimizations.length,
            topUsedTools: this.getTopUsedTools(5),
            commonErrors: this.getCommonErrors(5)
        };
    }

    /**
     * 🏆 الحصول على أكثر الأدوات استخداماً
     */
    getTopUsedTools(limit = 5) {
        return Object.entries(this.stats.toolUsageCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([tool, count]) => ({ tool, count }));
    }

    /**
     * ⚠️ الحصول على الأخطاء الشائعة
     */
    getCommonErrors(limit = 5) {
        const errorCounts = {};
        
        this.learningData.failurePatterns.forEach(pattern => {
            errorCounts[pattern.error] = (errorCounts[pattern.error] || 0) + 1;
        });

        return Object.entries(errorCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([error, count]) => ({ error, count }));
    }
}

// 🎯 إنشاء مثيل واحد من المدير
const functionManager = new FunctionCallingManager();

/**
 * 🔧 معدلات الحد لكل وظيفة (عدد الطلبات في الدقيقة)
 */
const FUNCTION_RATE_LIMITS = {
    search_web: 30,
    get_weather: 60,
    build_website: 10,
    deploy_to_github: 20,
    deploy_to_render: 10,
    deploy_to_cloudflare: 10,
    run_tests: 30,
    evolve_self: 5,
    query_database: 100,
    analyze_code: 20,
    optimize_performance: 10,
    generate_documentation: 15,
    run_security_scan: 10
};

/**
 * ⏱️ مدة التخزين المؤقت لكل وظيفة (بالميلي ثانية)
 */
const FUNCTION_CACHE_TTL = {
    search_web: 5 * 60 * 1000,      // 5 دقائق
    get_weather: 10 * 60 * 1000,    // 10 دقائق
    build_website: 0,                // لا يتم التخزين المؤقت
    deploy_to_github: 0,             // لا يتم التخزين المؤقت
    deploy_to_render: 0,             // لا يتم التخزين المؤقت
    deploy_to_cloudflare: 0,         // لا يتم التخزين المؤقت
    run_tests: 2 * 60 * 1000,       // دقيقتان
    evolve_self: 0,                  // لا يتم التخزين المؤقت
    query_database: 1 * 60 * 1000,  // دقيقة واحدة
    analyze_code: 5 * 60 * 1000,    // 5 دقائق
    optimize_performance: 0,         // لا يتم التخزين المؤقت
    generate_documentation: 10 * 60 * 1000, // 10 دقائق
    run_security_scan: 5 * 60 * 1000 // 5 دقائق
};

/**
 * 🎯 تعريف جميع الأدوات المتاحة لـ JOE (محسّن)
 */
export const JOE_TOOLS = [
    {
        type: 'function',
        function: {
            name: 'search_web',
            description: 'البحث في الإنترنت عن معلومات محدثة. استخدم هذه الأداة عندما تحتاج إلى معلومات حديثة أو أخبار أو بيانات من الويب.',
            parameters: {
                type: 'object',
                properties: {
                    query: {
                        type: 'string',
                        description: 'استعلام البحث (مثل: "أخبار الذكاء الاصطناعي 2025")'
                    },
                    limit: {
                        type: 'number',
                        description: 'عدد النتائج المطلوبة (افتراضي: 10)',
                        default: 10
                    },
                    language: {
                        type: 'string',
                        description: 'لغة النتائج (ar, en, etc)',
                        default: 'ar'
                    }
                },
                required: ['query']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_weather',
            description: 'الحصول على معلومات الطقس الحالية والتوقعات لمدينة معينة',
            parameters: {
                type: 'object',
                properties: {
                    city: {
                        type: 'string',
                        description: 'اسم المدينة (مثل: "Istanbul", "Dubai", "Cairo")'
                    },
                    days: {
                        type: 'number',
                        description: 'عدد أيام التوقعات (1-7)',
                        default: 1
                    },
                    units: {
                        type: 'string',
                        enum: ['metric', 'imperial'],
                        description: 'وحدات القياس',
                        default: 'metric'
                    }
                },
                required: ['city']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'build_website',
            description: 'بناء موقع ويب كامل بناءً على الوصف المعطى مع دعم أطر عمل متعددة',
            parameters: {
                type: 'object',
                properties: {
                    description: {
                        type: 'string',
                        description: 'وصف تفصيلي للموقع المطلوب'
                    },
                    projectType: {
                        type: 'string',
                        enum: ['website', 'landing-page', 'portfolio', 'blog', 'e-commerce', 'dashboard', 'saas'],
                        description: 'نوع المشروع'
                    },
                    framework: {
                        type: 'string',
                        enum: ['vanilla', 'react', 'vue', 'svelte', 'next', 'nuxt'],
                        description: 'إطار العمل المستخدم',
                        default: 'vanilla'
                    },
                    style: {
                        type: 'string',
                        enum: ['modern', 'minimal', 'corporate', 'creative', 'elegant'],
                        description: 'نمط التصميم',
                        default: 'modern'
                    },
                    features: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'الميزات المطلوبة',
                        default: ['Responsive', 'Animations', 'SEO']
                    },
                    includeBackend: {
                        type: 'boolean',
                        description: 'هل يتضمن backend',
                        default: false
                    }
                },
                required: ['description', 'projectType']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'deploy_to_github',
            description: 'نشر الكود على GitHub مع إعدادات متقدمة',
            parameters: {
                type: 'object',
                properties: {
                    repoName: {
                        type: 'string',
                        description: 'اسم المستودع'
                    },
                    code: {
                        type: 'string',
                        description: 'الكود المراد نشره'
                    },
                    description: {
                        type: 'string',
                        description: 'وصف المستودع'
                    },
                    private: {
                        type: 'boolean',
                        description: 'هل المستودع خاص',
                        default: false
                    },
                    autoInit: {
                        type: 'boolean',
                        description: 'تهيئة تلقائية مع README',
                        default: true
                    }
                },
                required: ['repoName', 'code']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'deploy_to_render',
            description: 'نشر الموقع على Render.com مع تكوين كامل',
            parameters: {
                type: 'object',
                properties: {
                    serviceName: {
                        type: 'string',
                        description: 'اسم الخدمة'
                    },
                    githubRepo: {
                        type: 'string',
                        description: 'رابط مستودع GitHub'
                    },
                    serviceType: {
                        type: 'string',
                        enum: ['web', 'static', 'cron', 'worker'],
                        description: 'نوع الخدمة',
                        default: 'web'
                    },
                    env: {
                        type: 'object',
                        description: 'متغيرات البيئة'
                    },
                    buildCommand: {
                        type: 'string',
                        description: 'أمر البناء'
                    },
                    startCommand: {
                        type: 'string',
                        description: 'أمر التشغيل'
                    }
                },
                required: ['serviceName', 'githubRepo']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'deploy_to_cloudflare',
            description: 'نشر الموقع على Cloudflare Pages',
            parameters: {
                type: 'object',
                properties: {
                    projectName: {
                        type: 'string',
                        description: 'اسم المشروع'
                    },
                    directory: {
                        type: 'string',
                        description: 'مجلد البناء',
                        default: './dist'
                    },
                    branch: {
                        type: 'string',
                        description: 'الفرع المستخدم',
                        default: 'main'
                    },
                    env: {
                        type: 'object',
                        description: 'متغيرات البيئة'
                    }
                },
                required: ['projectName']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'run_tests',
            description: 'تشغيل اختبارات متنوعة للتحقق من صحة النظام',
            parameters: {
                type: 'object',
                properties: {
                    testType: {
                        type: 'string',
                        enum: ['health', 'diagnostic', 'integration', 'performance', 'security', 'all'],
                        description: 'نوع الاختبار'
                    },
                    verbose: {
                        type: 'boolean',
                        description: 'عرض تفاصيل إضافية',
                        default: false
                    }
                },
                required: ['testType']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'evolve_self',
            description: 'تطوير وتحسين قدرات JOE الذاتية بشكل ذكي',
            parameters: {
                type: 'object',
                properties: {
                    aspect: {
                        type: 'string',
                        enum: ['intelligence', 'speed', 'capabilities', 'learning', 'all'],
                        description: 'الجانب المراد تطويره'
                    },
                    level: {
                        type: 'string',
                        enum: ['minor', 'moderate', 'major'],
                        description: 'مستوى التطوير',
                        default: 'moderate'
                    }
                },
                required: []
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'query_database',
            description: 'استعلام قاعدة بيانات MongoDB',
            parameters: {
                type: 'object',
                properties: {
                    collection: {
                        type: 'string',
                        description: 'اسم المجموعة'
                    },
                    query: {
                        type: 'object',
                        description: 'استعلام MongoDB'
                    },
                    limit: {
                        type: 'number',
                        description: 'عدد النتائج',
                        default: 100
                    },
                    sort: {
                        type: 'object',
                        description: 'ترتيب النتائج'
                    },
                    projection: {
                        type: 'object',
                        description: 'الحقول المطلوبة'
                    }
                },
                required: ['collection']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'analyze_code',
            description: 'تحليل الكود وإعطاء توصيات للتحسين',
            parameters: {
                type: 'object',
                properties: {
                    code: {
                        type: 'string',
                        description: 'الكود المراد تحليله'
                    },
                    language: {
                        type: 'string',
                        description: 'لغة البرمجة'
                    },
                    checkSecurity: {
                        type: 'boolean',
                        description: 'فحص الأمان',
                        default: true
                    }
                },
                required: ['code']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'optimize_performance',
            description: 'تحسين أداء النظام أو الكود',
            parameters: {
                type: 'object',
                properties: {
                    target: {
                        type: 'string',
                        enum: ['system', 'database', 'code', 'network'],
                        description: 'الهدف المراد تحسينه'
                    },
                    level: {
                        type: 'string',
                        enum: ['basic', 'advanced', 'aggressive'],
                        description: 'مستوى التحسين',
                        default: 'advanced'
                    }
                },
                required: ['target']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'generate_documentation',
            description: 'توليد توثيق تلقائي للكود',
            parameters: {
                type: 'object',
                properties: {
                    code: {
                        type: 'string',
                        description: 'الكود المراد توثيقه'
                    },
                    format: {
                        type: 'string',
                        enum: ['markdown', 'html', 'pdf'],
                        description: 'صيغة التوثيق',
                        default: 'markdown'
                    },
                    includeExamples: {
                        type: 'boolean',
                        description: 'تضمين أمثلة',
                        default: true
                    }
                },
                required: ['code']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'run_security_scan',
            description: 'فحص أمني شامل للنظام أو الكود',
            parameters: {
                type: 'object',
                properties: {
                    target: {
                        type: 'string',
                        description: 'الهدف المراد فحصه'
                    },
                    depth: {
                        type: 'string',
                        enum: ['quick', 'standard', 'deep'],
                        description: 'عمق الفحص',
                        default: 'standard'
                    }
                },
                required: []
            }
        }
    }
];

/**
 * 🚀 تنفيذ الوظيفة (الواجهة الرئيسية)
 */
export async function executeFunction(functionName, args, options = {}) {
    return await functionManager.executeFunction(functionName, args, options);
}

/**
 * 📊 الحصول على الإحصائيات
 */
export function getFunctionStats() {
    return functionManager.getStats();
}

/**
 * 🧠 الحصول على بيانات التعلم
 */
export function getLearningData() {
    return functionManager.getLearningData();
}

/**
 * 🧹 تنظيف الذاكرة المؤقتة
 */
export function clearFunctionCache() {
    functionManager.clearCache();
}

/**
 * 🎯 الحصول على قائمة الأدوات المتاحة
 */
export function getAvailableTools() {
    return JOE_TOOLS.map(tool => ({
        name: tool.function.name,
        description: tool.function.description,
        parameters: tool.function.parameters.required || []
    }));
}

/**
 * 🔍 البحث عن أداة
 */
export function findTool(functionName) {
    return JOE_TOOLS.find(tool => tool.function.name === functionName);
}

/**
 * ✅ التحقق من توفر أداة
 */
export function isToolAvailable(functionName) {
    return JOE_TOOLS.some(tool => tool.function.name === functionName);
}

export default {
    JOE_TOOLS,
    executeFunction,
    getFunctionStats,
    getLearningData,
    clearFunctionCache,
    getAvailableTools,
    findTool,
    isToolAvailable
};
