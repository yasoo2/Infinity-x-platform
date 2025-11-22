/**
 * 🔧 Code Tools - أدوات الأكواد الذكية المتقدمة
 * نظام متطور لتحليل وتنسيق وتحسين الأكواد البرمجية
 * متوافق مع Joe Advanced Engine و Gemini Engine
 * 
 * @module CodeTools
 * @version 2.0.1
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { getDB } from '../db.mjs';
import { createHash } from 'crypto';

const execAsync = promisify(exec);

/**
 * 🎯 فئة أدوات الأكواد المتقدمة
 */
export class CodeTools {
    constructor(options = {}) {
        this.analyzers = new Map();
        this.formatters = new Map();
        this.optimizers = new Map();
        this.validators = new Map();
        this.generators = new Map();
        
        this.config = {
            maxCodeSize: options.maxCodeSize || 5 * 1024 * 1024, // 5MB
            timeout: options.timeout || 30000,
            cacheResults: options.cacheResults !== false,
            ...options
        };

        this.stats = {
            totalAnalyses: 0,
            totalFormats: 0,
            totalOptimizations: 0,
            totalGenerations: 0,
            cacheHits: 0,
            cacheMisses: 0
        };

        this.cache = new Map();
        this.setupTools();
        console.log('✅ Code Tools initialized');
    }

    setupTools() {
        this.analyzers.set('javascript', this.analyzeJavaScript.bind(this));
        this.analyzers.set('typescript', this.analyzeTypeScript.bind(this));
        this.analyzers.set('python', this.analyzePython.bind(this));
        this.analyzers.set('html', this.analyzeHTML.bind(this));
        this.analyzers.set('css', this.analyzeCSS.bind(this));
        this.analyzers.set('json', this.analyzeJSON.bind(this));
        this.analyzers.set('jsx', this.analyzeJavaScript.bind(this));
        this.analyzers.set('tsx', this.analyzeTypeScript.bind(this));

        this.formatters.set('javascript', this.formatJavaScript.bind(this));
        this.formatters.set('typescript', this.formatTypeScript.bind(this));
        this.formatters.set('python', this.formatPython.bind(this));
        this.formatters.set('html', this.formatHTML.bind(this));
        this.formatters.set('css', this.formatCSS.bind(this));
        this.formatters.set('json', this.formatJSON.bind(this));

        this.optimizers.set('javascript', this.optimizeJavaScript.bind(this));
        this.optimizers.set('typescript', this.optimizeTypeScript.bind(this));
        this.optimizers.set('python', this.optimizePython.bind(this));
        this.optimizers.set('css', this.optimizeCSS.bind(this));

        this.validators.set('javascript', this.validateJavaScript.bind(this));
        this.validators.set('python', this.validatePython.bind(this));
        this.validators.set('json', this.validateJSON.bind(this));
        this.validators.set('html', this.validateHTML.bind(this));

        this.generators.set('api', this.generateAPI.bind(this));
        this.generators.set('component', this.generateComponent.bind(this));
        this.generators.set('utility', this.generateUtility.bind(this));
        this.generators.set('test', this.generateTest.bind(this));
        this.generators.set('documentation', this.generateDocumentation.bind(this));
    }

    async executeTask(requirements) {
        const startTime = Date.now();
        try {
            console.log('🔧 [CodeTools] بدء المهمة:', requirements.action);
            const { action, language, code, options = {} } = requirements;
            this.validateInput(requirements);

            const cacheKey = this.generateCacheKey(requirements);
            if (this.config.cacheResults && this.cache.has(cacheKey)) {
                this.stats.cacheHits++;
                console.log('💾 استخدام النتيجة من الذاكرة المؤقتة');
                return this.cache.get(cacheKey);
            }
            this.stats.cacheMisses++;

            let result;
            switch (action) {
                case 'analyze': result = await this.analyzeCode(language, code, options); this.stats.totalAnalyses++; break;
                case 'format': result = await this.formatCode(language, code, options); this.stats.totalFormats++; break;
                case 'optimize': result = await this.optimizeCode(language, code, options); this.stats.totalOptimizations++; break;
                case 'validate': result = await this.validateCode(language, code, options); break;
                case 'debug': result = await this.debugCode(language, code, options); break;
                case 'generate': result = await this.generateCode(requirements); this.stats.totalGenerations++; break;
                case 'refactor': result = await this.refactorCode(language, code, options); break;
                case 'test': result = await this.testCode(language, code, options); break;
                case 'document': result = await this.documentCode(language, code, options); break;
                case 'convert': result = await this.convertCode(language, code, options); break;
                case 'compare': result = await this.compareCode(code, options.compareWith, language); break;
                default: throw new Error(`Unknown action: ${action}`);
            }

            const duration = Date.now() - startTime;
            const response = {
                success: true,
                result,
                action,
                language,
                duration,
                timestamp: new Date().toISOString(),
                message: `Code ${action} completed successfully`
            };

            if (this.config.cacheResults) {
                this.cache.set(cacheKey, response);
            }
            await this.saveCodeAnalysis(result, requirements);
            console.log(`✅ المهمة اكتملت في ${duration}ms`);
            return response;

        } catch (error) {
            console.error('❌ Code tools error:', error);
            return {
                success: false,
                error: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
                timestamp: new Date().toISOString()
            };
        }
    }

    async analyzeCode(language, code, options = {}) {
        console.log(`🔍 تحليل كود ${language}...`);
        const analyzer = this.analyzers.get(language);
        if (!analyzer) throw new Error(`No analyzer available for ${language}`);
        const analysis = await analyzer(code, options);
        const metrics = this.calculateMetrics(code, language);
        const suggestions = this.generateSuggestions(analysis, language);
        const quality = this.calculateQualityScore(analysis, metrics);
        return { language, analysis, metrics, suggestions, quality, timestamp: new Date().toISOString() };
    }

    async analyzeJavaScript(code, options = {}) {
        console.log('🔍 تحليل JavaScript...');
        const analysis = {
            syntax: { valid: true, errors: [] },
            complexity: { score: 0, functions: 0, classes: 0 },
            dependencies: [], imports: [], exports: [],
            vulnerabilities: [], bestPractices: [],
            performance: { issues: [], score: 100 },
            maintainability: { score: 100, issues: [] },
            security: { score: 100, issues: [] }
        };

        try {
            analysis.syntax.errors = this.checkJavaScriptSyntax(code);
            analysis.syntax.valid = analysis.syntax.errors.length === 0;
            analysis.complexity = this.calculateJavaScriptComplexity(code);
            analysis.dependencies = this.extractJavaScriptDependencies(code);
            analysis.imports = this.extractImports(code);
            analysis.exports = this.extractExports(code);
            analysis.vulnerabilities = this.findJavaScriptVulnerabilities(code);
            analysis.bestPractices = this.checkJavaScriptBestPractices(code);
            analysis.performance = this.analyzeJavaScriptPerformance(code);
            analysis.maintainability = this.analyzeMaintainability(code, analysis.complexity);
            analysis.security = this.analyzeSecurityScore(analysis.vulnerabilities);
        } catch (error) {
            console.error('❌ JavaScript analysis error:', error);
            analysis.syntax.valid = false;
            analysis.syntax.errors.push(error.message);
        }
        return analysis;
    }

    // ... (Implementations for TypeScript, Python, HTML, CSS, JSON analyzers would go here similarly)
    // For brevity, assuming they exist or use similar patterns.
    async analyzeTypeScript(code, opts) { return this.analyzeJavaScript(code, opts); }
    async analyzePython(code, opts) { return { /* simplified for example */ }; }
    async analyzeHTML(code, opts) { return { /* simplified */ }; }
    async analyzeCSS(code, opts) { return { /* simplified */ }; }
    async analyzeJSON(code, opts) { return { /* simplified */ }; }

    checkJavaScriptSyntax(code) {
        const errors = [];
        errors.push(...this.checkMatchingBrackets(code));
        // Add other checks like semicolons, keywords, etc.
        return errors;
    }

    /**
     * 🔍 فحص الأقواس المتطابقة (مصححة)
     */
    checkMatchingBrackets(code) {
        const errors = [];
        const brackets = { '(': ')', '[': ']', '{': '}' };
        const stack = [];
        const lines = code.split('\n');

        let inString = false;
        let inComment = false;
        let stringChar = '';

        for (let lineNum = 0; lineNum < lines.length; lineNum++) {
            const line = lines[lineNum];
            
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                const nextChar = line[i + 1] || '';

                // 1. تجاوز التعليقات السطرية (مصحح: لا نستخدم break بل ننتقل للسطر التالي)
                if (!inString && !inComment && char === '/' && nextChar === '/') {
                    break; // الخروج من الحلقة الداخلية (السطر الحالي فقط) صحيح هنا
                }

                // 2. تجاوز التعليقات متعددة الأسطر
                if (!inString && char === '/' && nextChar === '*') {
                    inComment = true;
                    i++;
                    continue;
                }
                if (inComment) {
                    if (char === '*' && nextChar === '/') {
                        inComment = false;
                        i++;
                    }
                    continue;
                }

                // 3. التعامل مع النصوص والهروب
                if ((char === '"' || char === "'" || char === '`') && !inString) {
                    inString = true;
                    stringChar = char;
                    continue;
                }
                if (inString) {
                    if (char === stringChar) {
                        // التأكد من الهروب (Backslash counting)
                        let backslashCount = 0;
                        let j = i - 1;
                        while (j >= 0 && line[j] === '\\') {
                            backslashCount++;
                            j--;
                        }
                        if (backslashCount % 2 === 0) {
                            inString = false;
                        }
                    }
                    continue;
                }

                // 4. فحص الأقواس
                if (brackets[char]) {
                    stack.push({ char, line: lineNum + 1, col: i + 1 });
                } else if (Object.values(brackets).includes(char)) {
                    const last = stack.pop();
                    if (!last || brackets[last.char] !== char) {
                        errors.push({
                            type: 'bracket_mismatch',
                            message: `Mismatched bracket '${char}' at line ${lineNum + 1}, column ${i + 1}`,
                            line: lineNum + 1,
                            column: i + 1,
                            severity: 'error'
                        });
                    }
                }
            }
        }

        for (const bracket of stack) {
            errors.push({
                type: 'unclosed_bracket',
                message: `Unclosed bracket '${bracket.char}' at line ${bracket.line}, column ${bracket.col}`,
                line: bracket.line,
                column: bracket.col,
                severity: 'error'
            });
        }

        return errors;
    }

    calculateJavaScriptComplexity(code) {
        let complexity = 1;
        // ... (other complexity calculations) ...
        const nestingLevel = this.calculateNestingLevel(code);
        complexity += nestingLevel * 2;
        // ...
        return { score: complexity, nestingLevel }; // Simplified return
    }

    /**
     * 📏 حساب مستوى التداخل (مصححة بالكامل)
     * تتجاهل التعليقات والنصوص بشكل دقيق
     */
    calculateNestingLevel(code) {
        let maxLevel = 0;
        let currentLevel = 0;
        let inString = false;
        let stringChar = '';
        let inComment = false;     // /* ... */
        let inLineComment = false; // // ...

        for (let i = 0; i < code.length; i++) {
            const char = code[i];
            const nextChar = code[i + 1] || '';

            // 1. تجاوز التعليقات السطرية
            if (inLineComment) {
                if (char === '\n') inLineComment = false;
                continue;
            }

            // 2. تجاوز التعليقات متعددة الأسطر
            if (inComment) {
                if (char === '*' && nextChar === '/') {
                    inComment = false;
                    i++;
                }
                continue;
            }

            // 3. التعامل مع النصوص
            if (inString) {
                if (char === stringChar) {
                    let backslashCount = 0;
                    let j = i - 1;
                    while (j >= 0 && code[j] === '\\') {
                        backslashCount++;
                        j--;
                    }
                    if (backslashCount % 2 === 0) {
                        inString = false;
                    }
                }
                continue;
            }

            // 4. بدايات (نصوص، تعليقات)
            if (char === '"' || char === "'" || char === '`') {
                inString = true;
                stringChar = char;
                continue;
            }
            if (char === '/' && nextChar === '/') {
                inLineComment = true;
                i++;
                continue;
            }
            if (char === '/' && nextChar === '*') {
                inComment = true;
                i++;
                continue;
            }

            // 5. حساب التداخل
            if (char === '{') {
                currentLevel++;
                maxLevel = Math.max(maxLevel, currentLevel);
            } else if (char === '}') {
                if (currentLevel > 0) currentLevel--;
            }
        }

        return maxLevel;
    }

    // ... (باقي الدوال المساعدة: extractJavaScriptDependencies, extractImports, etc.)
    extractJavaScriptDependencies(code) { return []; } // Placeholder
    extractImports(code) { return []; } // Placeholder
    extractExports(code) { return []; } // Placeholder
    findJavaScriptVulnerabilities(code) { return []; } // Placeholder
    checkJavaScriptBestPractices(code) { return []; } // Placeholder
    analyzeJavaScriptPerformance(code) { return { score: 100, issues: [] }; } // Placeholder
    analyzeMaintainability(code, complexity) { return { score: 100, issues: [] }; } // Placeholder
    analyzeSecurityScore(vulnerabilities) { return { score: 100, issues: [] }; } // Placeholder

    async formatCode(language, code, options) { return { formatted: code }; } // Placeholder
    async optimizeCode(language, code, options) { return { optimized: code }; } // Placeholder
    async validateCode(language, code, options) { return { valid: true }; } // Placeholder
    async debugCode(language, code, options) { return { fixed: code }; } // Placeholder
    async generateCode(requirements) { return { code: '' }; } // Placeholder
    async refactorCode(language, code, options) { return { code }; } // Placeholder
    async testCode(language, code, options) { return { passed: true }; } // Placeholder
    async documentCode(language, code, options) { return { docs: '' }; } // Placeholder
    async convertCode(language, code, options) { return { code }; } // Placeholder
    async compareCode(code1, code2, language) { return { diff: '' }; } // Placeholder

    validateInput(requirements) {
        if (!requirements.action) throw new Error('Action is required');
    }
    generateCacheKey(req) { return createHash('md5').update(JSON.stringify(req)).digest('hex'); }
    async saveCodeAnalysis(res, req) { /* save to db */ }
    
    calculateMetrics(code, language) {
        const lines = code.split('\n');
        return { totalLines: lines.length, characters: code.length };
    }
    generateSuggestions(analysis, language) { return []; }
    calculateQualityScore(analysis, metrics) { return { score: 100, grade: 'A' }; }
}

export default CodeTools;
