// backend/src/lib/codeTools.mjs - أدوات الأكواد الذكية المتقدمة
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { getDB } from '../db.mjs';

const execAsync = promisify(exec);

export class CodeTools {
    constructor() {
        this.analyzers = new Map();
        this.formatters = new Map();
        this.optimizers = new Map();
        this.setupTools();
    }

    setupTools() {
        // إعداد أدوات التحليل
        this.analyzers.set('javascript', this.analyzeJavaScript.bind(this));
        this.analyzers.set('typescript', this.analyzeTypeScript.bind(this));
        this.analyzers.set('python', this.analyzePython.bind(this));
        this.analyzers.set('html', this.analyzeHTML.bind(this));
        this.analyzers.set('css', this.analyzeCSS.bind(this));

        // إعداد أدوات التنسيق
        this.formatters.set('javascript', this.formatJavaScript.bind(this));
        this.formatters.set('typescript', this.formatTypeScript.bind(this));
        this.formatters.set('python', this.formatPython.bind(this));
        this.formatters.set('html', this.formatHTML.bind(this));
        this.formatters.set('css', this.formatCSS.bind(this));

        // إعداد أدوات التحسين
        this.optimizers.set('javascript', this.optimizeJavaScript.bind(this));
        this.optimizers.set('typescript', this.optimizeTypeScript.bind(this));
        this.optimizers.set('python', this.optimizePython.bind(this));
    }

    async executeTask(requirements) {
        try {
            const { action, language, code, options = {} } = requirements;
            
            let result;
            
            switch (action) {
                case 'analyze':
                    result = await this.analyzeCode(language, code, options);
                    break;
                case 'format':
                    result = await this.formatCode(language, code, options);
                    break;
                case 'optimize':
                    result = await this.optimizeCode(language, code, options);
                    break;
                case 'debug':
                    result = await this.debugCode(language, code, options);
                    break;
                case 'generate':
                    result = await this.generateCode(requirements);
                    break;
                case 'refactor':
                    result = await this.refactorCode(language, code, options);
                    break;
                case 'test':
                    result = await this.testCode(language, code, options);
                    break;
                default:
                    throw new Error(`Unknown action: ${action}`);
            }

            // حفظ النتائج
            await this.saveCodeAnalysis(result, requirements);

            return {
                success: true,
                result,
                message: `Code ${action} completed successfully`
            };

        } catch (error) {
            console.error('❌ Code tools error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async analyzeCode(language, code, options) {
        const analyzer = this.analyzers.get(language);
        if (!analyzer) {
            throw new Error(`No analyzer available for ${language}`);
        }

        const analysis = await analyzer(code, options);
        
        return {
            language,
            analysis,
            metrics: this.calculateMetrics(code, language),
            suggestions: this.generateSuggestions(analysis, language),
            timestamp: new Date()
        };
    }

    async analyzeJavaScript(code, options) {
        const analysis = {
            syntax: { valid: true, errors: [] },
            complexity: { score: 0, functions: 0, classes: 0 },
            dependencies: [],
            vulnerabilities: [],
            bestPractices: [],
            performance: { issues: [], score: 100 }
        };

        // تحليل الجملة
        try {
            // يمكن استخدام ESLint هنا
            const syntaxErrors = this.checkJavaScriptSyntax(code);
            analysis.syntax.errors = syntaxErrors;
        } catch (error) {
            analysis.syntax.valid = false;
            analysis.syntax.errors.push(error.message);
        }

        // تحليل التعقيد
        analysis.complexity = this.calculateJavaScriptComplexity(code);
        
        // تحليل الاعتماديات
        analysis.dependencies = this.extractJavaScriptDependencies(code);
        
        // تحليل الثغرات الأمنية
        analysis.vulnerabilities = this.findJavaScriptVulnerabilities(code);
        
        // أفضل الممارسات
        analysis.bestPractices = this.checkJavaScriptBestPractices(code);
        
        // تحليل الأداء
        analysis.performance = this.analyzeJavaScriptPerformance(code);

        return analysis;
    }

    async analyzePython(code, options) {
        const analysis = {
            syntax: { valid: true, errors: [] },
            complexity: { score: 0, functions: 0, classes: 0 },
            imports: [],
            vulnerabilities: [],
            bestPractices: [],
            style: { issues: [], score: 100 }
        };

        // تحليل الجملة
        try {
            // استخدام ast أو أداة مشابهة
            const syntaxErrors = this.checkPythonSyntax(code);
            analysis.syntax.errors = syntaxErrors;
        } catch (error) {
            analysis.syntax.valid = false;
            analysis.syntax.errors.push(error.message);
        }

        // تحليل التعقيد
        analysis.complexity = this.calculatePythonComplexity(code);
        
        // تحليل الاستيرادات
        analysis.imports = this.extractPythonImports(code);
        
        // تحليل الثغرات
        analysis.vulnerabilities = this.findPythonVulnerabilities(code);
        
        // أفضل الممارسات
        analysis.bestPractices = this.checkPythonBestPractices(code);
        
        // أسلوب الكود
        analysis.style = this.analyzePythonStyle(code);

        return analysis;
    }

    checkJavaScriptSyntax(code) {
        const errors = [];
        
        // فحص الأقواس المتطابقة
        const brackets = { '(': ')', '[': ']', '{': '}' };
        const stack = [];
        
        for (let i = 0; i < code.length; i++) {
            const char = code[i];
            if (brackets[char]) {
                stack.push(char);
            } else if (Object.values(brackets).includes(char)) {
                const last = stack.pop();
                if (brackets[last] !== char) {
                    errors.push(`Mismatched brackets at position ${i}`);
                }
            }
        }
        
        if (stack.length > 0) {
            errors.push(`Unclosed brackets: ${stack.join(', ')}`);
        }

        // فحص نقاط التوقف المنفصلة
        const lines = code.split('\n');
        lines.forEach((line, index) => {
            if (line.trim() && !line.trim().endsWith(';') && 
                !line.trim().endsWith('{') && !line.trim().endsWith('}') &&
                !line.trim().startsWith('//') && !line.includes('if') && 
                !line.includes('for') && !line.includes('while')) {
                errors.push(`Missing semicolon at line ${index + 1}`);
            }
        });

        return errors;
    }

    calculateJavaScriptComplexity(code) {
        let complexity = 0;
        let functions = 0;
        let classes = 0;

        // عدد الدوال
        const functionMatches = code.match(/function\s+\w+|const\s+\w+\s*=\s*(?:async\s+)?(?:\([^)]*\)\s*=>|function)/g);
        if (functionMatches) functions = functionMatches.length;

        // عدد الكلاسات
        const classMatches = code.match(/class\s+\w+/g);
        if (classMatches) classes = classMatches.length;

        // تعقيد الحلقات والشروط
        const complexityPatterns = /(for|while|do|if|else|switch|case|catch)\s*\(/g;
        const complexityMatches = code.match(complexityPatterns);
        if (complexityMatches) complexity = complexityMatches.length;

        // تعقيد التداخل
        const nestingLevel = this.calculateNestingLevel(code);

        return {
            score: complexity + nestingLevel,
            functions,
            classes,
            loops: (code.match(/for|while|do/g) || []).length,
            conditions: (code.match(/if|else|switch/g) || []).length,
            nestingLevel
        };
    }

    findJavaScriptVulnerabilities(code) {
        const vulnerabilities = [];
        
        const patterns = {
            xss: {
                pattern: /innerHTML\s*=|document\.write\(|eval\(/g,
                severity: 'high',
                message: 'Potential XSS vulnerability'
            },
            sql_injection: {
                pattern: /SELECT.*FROM.*WHERE.*\+|INSERT.*INTO.*VALUES.*\+/gi,
                severity: 'high',
                message: 'Potential SQL injection'
            },
            hardcoded_secrets: {
                pattern: /password\s*=.*['"][^'"]+['"]|api_key\s*=.*['"][^'"]+['"]/gi,
                severity: 'high',
                message: 'Hardcoded secrets detected'
            },
            insecure_random: {
                pattern: /Math\.random\(/g,
                severity: 'medium',
                message: 'Insecure random number generation'
            }
        };

        Object.entries(patterns).forEach(([type, config]) => {
            const matches = code.match(config.pattern);
            if (matches) {
                vulnerabilities.push({
                    type,
                    severity: config.severity,
                    message: config.message,
                    occurrences: matches.length
                });
            }
        });

        return vulnerabilities;
    }

    checkJavaScriptBestPractices(code) {
        const practices = [];

        // استخدام === بدلاً من ==
        if (code.match(/[^=!]==[^=]/g)) {
            practices.push({
                type: 'equality',
                severity: 'medium',
                message: 'Use === instead of == for strict equality'
            });
        }

        // استخدام var بدلاً من let/const
        if (code.match(/\bvar\s+/g)) {
            practices.push({
                type: 'variable_declaration',
                severity: 'low',
                message: 'Consider using let or const instead of var'
            });
        }

        // عدم وجود try-catch
        if (!code.includes('try') && code.includes('throw')) {
            practices.push({
                type: 'error_handling',
                severity: 'medium',
                message: 'Add try-catch blocks for error handling'
            });
        }

        // استخدام console.log في كود الإنتاج
        if (code.match(/console\.(log|warn|error)/g)) {
            practices.push({
                type: 'debugging',
                severity: 'low',
                message: 'Remove console statements from production code'
            });
        }

        return practices;
    }

    async formatCode(language, code, options) {
        const formatter = this.formatters.get(language);
        if (!formatter) {
            return { formatted: code, message: 'No formatter available' };
        }

        return await formatter(code, options);
    }

    async formatJavaScript(code, options) {
        // تنسيق بسيط - يمكن استخدام Prettier في الإنتاج
        const formatted = code
            .replace(/\s+/g, ' ')
            .replace(/\s*{\s*/g, ' { ')
            .replace(/\s*}\s*/g, ' } ')
            .replace(/\s*\(\s*/g, ' ( ')
            .replace(/\s*\)\s*/g, ' ) ')
            .replace(/\s*;\s*/g, '; ')
            .replace(/\s*,\s*/g, ', ')
            .trim();

        return {
            formatted,
            original: code,
            changes: formatted !== code
        };
    }

    async optimizeCode(language, code, options) {
        const optimizer = this.optimizers.get(language);
        if (!optimizer) {
            return { optimized: code, message: 'No optimizer available' };
        }

        return await optimizer(code, options);
    }

    async optimizeJavaScript(code, options) {
        // تحسينات بسيطة
        let optimized = code;

        // إزالة المسافات الزائدة
        optimized = optimized.replace(/\s+/g, ' ');
        
        // إزالة التعليقات إذا طُلب
        if (options.removeComments) {
            optimized = optimized.replace(/\/\/.*$/gm, '') // تعليقات سطرية
                               .replace(/\/\*[\s\S]*?\*\//g, ''); // تعليقات متعددة الأسطر
        }

        // تقليل أسماء المتغيرات إذا طُلب
        if (options.minify) {
            optimized = this.minifyJavaScript(optimized);
        }

        return {
            optimized,
            original: code,
            sizeReduction: ((code.length - optimized.length) / code.length * 100).toFixed(2) + '%'
        };
    }

    minifyJavaScript(code) {
        // تقليل بسيط - يمكن استخدام Terser في الإنتاج
        return code.replace(/\s+/g, ' ')
                   .replace(/\s*{\s*/g, '{')
                   .replace(/\s*}\s*/g, '}')
                   .replace(/\s*\(\s*/g, '(')
                   .replace(/\s*\)\s*/g, ')')
                   .replace(/\s*;\s*/g, ';')
                   .replace(/\s*,\s*/g, ',')
                   .trim();
    }

    async generateCode(requirements) {
        const { language, purpose, specifications } = requirements;
        
        const templates = {
            javascript: {
                api: this.generateJavaScriptAPI(specifications),
                component: this.generateReactComponent(specifications),
                utility: this.generateJavaScriptUtility(specifications)
            },
            python: {
                api: this.generatePythonAPI(specifications),
                script: this.generatePythonScript(specifications),
                class: this.generatePythonClass(specifications)
            }
        };

        const code = templates[language]?.[purpose] || this.generateGenericCode(language, specifications);

        return {
            generated: code,
            language,
            purpose,
            specifications
        };
    }

    generateJavaScriptAPI(specs) {
        return `
// API Module Generated by Joe
class ${specs.name || 'APIClient'} {
    constructor(baseURL = '${specs.baseURL || 'https://api.example.com'}') {
        this.baseURL = baseURL;
        this.headers = {
            'Content-Type': 'application/json',
            ${specs.apiKey ? `'Authorization': 'Bearer \${process.env.API_KEY}'` : ''}
        };
    }

    async ${specs.method || 'get'}Data(endpoint, params = {}) {
        try {
            const url = new URL(\`\${this.baseURL}/\${endpoint}\`);
            Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
            
            const response = await fetch(url, {
                method: '${specs.method || 'GET'}',
                headers: this.headers
            });

            if (!response.ok) {
                throw new Error(\`HTTP error! status: \${response.status}\`);
            }

            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    async postData(endpoint, data) {
        try {
            const response = await fetch(\`\${this.baseURL}/\${endpoint}\`, {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error(\`HTTP error! status: \${response.status}\`);
            }

            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }
}

export default ${specs.name || 'APIClient'};
`;
    }

    generateReactComponent(specs) {
        return `
// React Component Generated by Joe
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

const ${specs.name || 'Component'} = ({ title, data, onAction }) => {
    const [state, setState] = useState({
        loading: false,
        error: null,
        items: data || []
    });

    useEffect(() => {
        // Component did mount logic
        console.log('${specs.name || 'Component'} mounted');
        
        return () => {
            // Component will unmount logic
            console.log('${specs.name || 'Component'} unmounted');
        };
    }, []);

    const handleAction = async (item) => {
        setState(prev => ({ ...prev, loading: true }));
        
        try {
            if (onAction) {
                await onAction(item);
            }
            setState(prev => ({ ...prev, loading: false }));
        } catch (error) {
            setState(prev => ({ 
                ...prev, 
                loading: false, 
                error: error.message 
            }));
        }
    };

    return (
        <div className="${specs.name?.toLowerCase() || 'component'}-container">
            {title && <h2>{title}</h2>}
            
            {state.error && (
                <div className="error-message">
                    Error: {state.error}
                </div>
            )}
            
            <div className="content">
                {state.items.map((item, index) => (
                    <div key={index} className="item">
                        {item.name || item.title || item}
                        <button 
                            onClick={() => handleAction(item)}
                            disabled={state.loading}
                        >
                            {state.loading ? 'Loading...' : 'Action'}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

${specs.name || 'Component'}.propTypes = {
    title: PropTypes.string,
    data: PropTypes.array,
    onAction: PropTypes.func
};

export default ${specs.name || 'Component'};
`;
    }

    async saveCodeAnalysis(result, requirements) {
        try {
            const db = getDB();
            await db.collection('joe_code_analyses').insertOne({
                result,
                requirements,
                timestamp: new Date()
            });
        } catch (error) {
            console.error('❌ Save code analysis error:', error);
        }
    }

    calculateMetrics(code, language) {
        const lines = code.split('\n');
        return {
            totalLines: lines.length,
            codeLines: lines.filter(line => line.trim() && !this.isComment(line, language)).length,
            commentLines: lines.filter(line => this.isComment(line, language)).length,
            emptyLines: lines.filter(line => line.trim() === '').length,
            characters: code.length,
            words: code.split(/\s+/).filter(word => word.length > 0).length
        };
    }

    isComment(line, language) {
        const commentPatterns = {
            javascript: /^\s*\/\/|^\s*\/\*|\*\/\s*$/,
            python: /^\s*#/,
            html: /^\s*<!--/,
            css: /^\s*\/\*/
        };
        
        const pattern = commentPatterns[language];
        return pattern ? pattern.test(line.trim()) : false;
    }
}

export default CodeTools;
