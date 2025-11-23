
/**
 * 🔬 Code Tools V5 - المحرك التطوري لتحليل الأكواد
 * @version 5.0.0 - Now with Export Mapping for orphan detection!
 */
import { parse } from 'acorn';
import { simple as simpleWalk } from 'acorn-walk';

// =================================================================
// ⚙️ 1. المعالج المركزي للكود (The Code Walker) - No changes
// =================================================================
class CodeWalker {
    static *walk(code) {
        let inString = false, stringChar = '', inComment = false, inLineComment = false, backslash = false;
        for (let i = 0; i < code.length; i++) {
            const char = code[i], nextChar = code[i + 1] || '';
            let type = 'CODE';
            if (inLineComment) {
                if (char === '\n') inLineComment = false;
                type = 'COMMENT';
            } else if (inComment) {
                if (char === '*' && nextChar === '/') { inComment = false; yield { type: 'COMMENT', value: '*/' }; i++; continue; }
                type = 'COMMENT';
            } else if (inString) {
                if (char === '\\') { backslash = !backslash; } else { if (char === stringChar && !backslash) inString = false; backslash = false; }
                type = 'STRING';
            } else {
                if (char === '/' && nextChar === '/') { inLineComment = true; type = 'COMMENT'; }
                else if (char === '/' && nextChar === '*') { inComment = true; type = 'COMMENT'; }
                else if (char === '\"' || char === "'" || char === '`') { inString = true; stringChar = char; type = 'STRING'; }
            }
            yield { type, value: char };
        }
    }
}

// =================================================================
// 🏛️ 2. الفئة الأساسية لجميع الأدوات (The Base Tool) - No changes
// =================================================================
class CodeToolBase {
    constructor() { if (this.constructor === CodeToolBase) throw new Error("Cannot instantiate base class."); }
    supportedLanguages = [];
    action = 'base';
    async execute(code, options = {}) { throw new Error("Execute method must be implemented."); }
}

// =================================================================
// 🧩 3. [UPGRADED] أداة تحليل AST لـ JavaScript
// =================================================================
class JavaScriptAstAnalyzer extends CodeToolBase {
    supportedLanguages = ['javascript', 'jsx', 'mjs', 'typescript', 'tsx'];
    action = 'analyze';

    async execute(code, options = {}) {
        try {
            const ast = parse(code, { ecmaVersion: 'latest', sourceType: 'module', locations: true, allowHashBang: true });

            let complexity = 0;
            const imports = [];
            const functions = [];
            const exports = []; // ✨ Added export tracking!

            simpleWalk(ast, {
                'IfStatement, ForStatement, WhileStatement, DoWhileStatement, SwitchCase, CatchClause': (node) => complexity++,
                'ImportDeclaration': (node) => imports.push({ source: node.source.value, specifiers: node.specifiers.map(s => s.local.name) }),
                'FunctionDeclaration, FunctionExpression, ArrowFunctionExpression': (node) => functions.push({ name: node.id ? node.id.name : 'anonymous', loc: node.loc.start.line }),
                
                // ✨ Logic to map all exported identifiers
                'ExportNamedDeclaration': (node) => {
                    if (node.declaration) {
                        if (node.declaration.declarations) { // const, let, var
                            node.declaration.declarations.forEach(d => exports.push({ type: 'named', name: d.id.name }));
                        } else if (node.declaration.id) { // function, class
                            exports.push({ type: 'named', name: node.declaration.id.name });
                        }
                    } else if (node.specifiers) {
                        node.specifiers.forEach(s => exports.push({ type: 'named', name: s.exported.name }));
                    }
                },
                'ExportDefaultDeclaration': (node) => {
                    const name = node.declaration.id ? node.declaration.id.name : (node.declaration.name || 'default');
                    exports.push({ type: 'default', name });
                },
                'ExportAllDeclaration': (node) => {
                    exports.push({ type: 'all', source: node.source.value });
                }
            });

            return {
                success: true,
                metrics: { lineCount: code.split('\n').length, complexity, functionCount: functions.length },
                dependencies: imports,
                exports, // ✨ Return exports in the result!
            };

        } catch (error) {
            return { success: false, error: 'SYNTAX_ERROR', message: `AST Parse Failure: ${error.message}`, line: error.loc?.line };
        }
    }
}

// ... (rest of the classes: BracketValidator, SecretsScanner, CodeTools engine) ...
// The other classes remain unchanged, so they are truncated for brevity but are still in the file.

// =================================================================
// 🧩 4. أداة تحقق (مدقق الأقواس)
// =================================================================
class BracketValidator extends CodeToolBase {
    supportedLanguages = ['*'];
    action = 'validate-brackets';
    async execute(code, options = {}) {
        const errors = [], brackets = { '(': ')', '[': ']', '{': '}' }, stack = [];
        for (const token of CodeWalker.walk(code)) {
            if (token.type !== 'CODE') continue;
            const char = token.value;
            if (brackets[char]) {
                stack.push({ char });
            } else if (Object.values(brackets).includes(char)) {
                const last = stack.pop();
                if (!last || brackets[last.char] !== char) errors.push(`Mismatched bracket '${char}'`);
            }
        }
        stack.forEach(unclosed => errors.push(`Unclosed bracket '${unclosed.char}'`));
        return { success: errors.length === 0, errors };
    }
}

// =================================================================
// ✨🛡️ 5. أداة الفحص الأمني (Hardcoded Secrets Scanner)
// =================================================================
class SecretsScanner extends CodeToolBase {
    supportedLanguages = ['*'];
    action = 'security-scan';
    SECRET_PATTERNS = ['secret', 'token', 'password', 'key', 'auth', 'credential', 'sk_', 'pk_', 'bearer', 'jwt'];
    VARIABLE_REGEX = new RegExp(`(?:let|const|var|\s)([_a-zA-Z0-9]*(${this.SECRET_PATTERNS.join('|')})[_a-zA-Z0-9]*)`, 'i');
    async execute(code, options = {}) {
        const findings = [];
        let currentLine = 1, lineBuffer = '';
        for (const token of CodeWalker.walk(code)) {
            if (token.value === '\n') {
                const match = lineBuffer.match(this.VARIABLE_REGEX);
                if (match) findings.push({ line: currentLine, finding: `Potential hardcoded secret in variable: '${match[1]}'`, severity: 'High' });
                lineBuffer = '';
                currentLine++;
            } else if (token.type === 'CODE') {
                lineBuffer += token.value;
            }
        }
        const lastMatch = lineBuffer.match(this.VARIABLE_REGEX);
        if (lastMatch) findings.push({ line: currentLine, finding: `Potential hardcoded secret in variable: '${lastMatch[1]}'`, severity: 'High' });
        return { success: true, findings, summary: `Scan complete. Found ${findings.length} potential secrets.` };
    }
}


// =================================================================
// 🚀 6. المحرك الرئيسي (The Main Engine)
// =================================================================
class CodeTools {
    constructor() {
        this.registry = new Map();
        console.log('🔬 Code Tools V5 Engine Initialized.');
    }
    register(toolInstance) {
        if (!(toolInstance instanceof CodeToolBase)) throw new Error("Invalid tool: Must extend CodeToolBase.");
        toolInstance.supportedLanguages.forEach(lang => {
            const key = `${toolInstance.action}:${lang}`;
            this.registry.set(key, toolInstance);
            console.log(`✅ Tool registered: [${key}]`);
        });
    }
    async executeTask({ action, language, code, options = {} }) {
        const key = `${action}:${language}`, universalKey = `${action}:*`;
        const tool = this.registry.get(key) || this.registry.get(universalKey);
        if (!tool) throw new Error(`No tool available for action '${action}' on language '${language}'.`);
        console.log(`🚀 Executing task [${key}]...`);
        return tool.execute(code, options);
    }
}

// =================================================================
// 🛠️ 7. إنشاء وتصدير نسخة جاهزة
// =================================================================
function createDefaultCodeTools() {
    const engine = new CodeTools();
    engine.register(new JavaScriptAstAnalyzer());
    engine.register(new BracketValidator());
    engine.register(new SecretsScanner());
    return engine;
}

export default createDefaultCodeTools();
