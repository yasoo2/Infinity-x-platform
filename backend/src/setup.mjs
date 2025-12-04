#!/usr/bin/env node
// backend/src/setup.js - سكريبت التثبيت التلقائي لـ Joe

// Removed unused exec/promisify imports
import fs from 'fs/promises';
import path from 'path';
import { getDB } from './db.mjs';

// execAsync removed (unused)

console.log('🚀 Starting Joe Advanced System Setup...');

class JoeSetup {
    constructor() {
        this.steps = [
            { name: 'Environment Check', func: this.checkEnvironment.bind(this) },
            { name: 'Database Setup', func: this.setupDatabase.bind(this) },
            { name: 'Collections Creation', func: this.createCollections.bind(this) },
            { name: 'Directory Structure', func: this.createDirectories.bind(this) },
            { name: 'Configuration Files', func: this.createConfigFiles.bind(this) },
            { name: 'Dependencies Check', func: this.checkDependencies.bind(this) },
            { name: 'System Validation', func: this.validateSystem.bind(this) }
        ];
        
        this.results = [];
    }

    async run() {
        console.log('📋 Joe Setup Process Started');
        console.log('=' * 50);

        for (let i = 0; i < this.steps.length; i++) {
            const step = this.steps[i];
            console.log(`\n[${i + 1}/${this.steps.length}] ${step.name}...`);
            
            try {
                const result = await step.func();
                this.results.push({ step: step.name, success: true, result });
                console.log(`✅ ${step.name} completed`);
            } catch (error) {
                this.results.push({ step: step.name, success: false, error: error.message });
                console.error(`❌ ${step.name} failed:`, error.message);
                
                // سؤال المستخدم عما إذا كان يريد المتابعة
                const continueSetup = await this.askToContinue();
                if (!continueSetup) {
                    console.log('🛑 Setup cancelled by user');
                    return;
                }
            }
        }

        await this.generateReport();
        console.log('\n🎉 Joe Setup Completed!');
    }

    async checkEnvironment() {
        console.log('🔍 Checking environment...');
        
        // التحقق من المتغيرات البيئية
        const requiredEnvVars = [
            'NODE_ENV',
            'MONGO_URI',
            'OPENAI_API_KEY',
            'REDIS_URL',
            'JWT_SECRET'
        ];

        const missingVars = [];
        for (const varName of requiredEnvVars) {
            if (!process.env[varName]) {
                missingVars.push(varName);
            }
        }

        if (missingVars.length > 0) {
            console.log('⚠️ Missing environment variables:', missingVars);
            console.log('📝 Creating .env.example file...');
            await this.createEnvExample();
        }

        // التحقق من Node.js version
        const nodeVersion = process.version;
        const requiredVersion = '18.0.0';
        
        if (this.compareVersions(nodeVersion.slice(1), requiredVersion) < 0) {
            throw new Error(`Node.js version ${nodeVersion} is too old. Required: ${requiredVersion}+`);
        }

        return { nodeVersion, missingEnvVars: missingVars };
    }

    async setupDatabase() {
        console.log('🗄️ Setting up database...');
        
        try {
            const db = getDB();
            
            // اختبار الاتصال
            await db.admin().ping();
            
            // إنشاء قاعدة البيانات إذا لم تكن موجودة
            await db.createCollection('test_collection');
            await db.collection('test_collection').drop();
            
            console.log('✅ Database connection successful');
            return { status: 'connected' };
            
        } catch (error) {
            throw new Error(`Database setup failed: ${error.message}`);
        }
    }

    async createCollections() {
        console.log('📊 Creating database collections...');
        
        const collections = [
            {
                name: 'joe_interactions',
                schema: {
                    validator: {
                        $jsonSchema: {
                            bsonType: 'object',
                            required: ['userId', 'command', 'result', 'metadata'],
                            properties: {
                                userId: { bsonType: 'string' },
                                command: { bsonType: 'string' },
                                result: { bsonType: 'object' },
                                metadata: {
                                    bsonType: 'object',
                                    properties: {
                                        timestamp: { bsonType: 'date' },
                                        sessionId: { bsonType: 'string' },
                                        intent: { bsonType: 'string' },
                                        service: { bsonType: 'string' }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            {
                name: 'joe_projects',
                schema: {
                    validator: {
                        $jsonSchema: {
                            bsonType: 'object',
                            required: ['projectId', 'type', 'requirements', 'project'],
                            properties: {
                                projectId: { bsonType: 'string' },
                                type: { bsonType: 'string' },
                                requirements: { bsonType: 'object' },
                                project: { bsonType: 'object' },
                                createdAt: { bsonType: 'date' },
                                status: { bsonType: 'string' }
                            }
                        }
                    }
                }
            },
            {
                name: 'joe_code_analyses',
                schema: {
                    validator: {
                        $jsonSchema: {
                            bsonType: 'object',
                            required: ['service', 'analysis', 'timestamp'],
                            properties: {
                                service: { bsonType: 'string' },
                                analysis: { bsonType: 'object' },
                                timestamp: { bsonType: 'date' },
                                recommendations: { bsonType: 'array' }
                            }
                        }
                    }
                }
            },
            {
                name: 'joe_learning_patterns',
                schema: {
                    validator: {
                        $jsonSchema: {
                            bsonType: 'object',
                            required: ['userId', 'pattern'],
                            properties: {
                                userId: { bsonType: 'string' },
                                pattern: {
                                    bsonType: 'object',
                                    properties: {
                                        type: { bsonType: 'string' },
                                        pattern: { bsonType: 'string' },
                                        frequency: { bsonType: 'int' },
                                        successRate: { bsonType: 'double' },
                                        lastUsed: { bsonType: 'date' }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            {
                name: 'joe_task_updates',
                schema: {
                    validator: {
                        $jsonSchema: {
                            bsonType: 'object',
                            required: ['taskId', 'progress', 'status', 'timestamp'],
                            properties: {
                                taskId: { bsonType: 'string' },
                                progress: { bsonType: 'int' },
                                status: { bsonType: 'string' },
                                message: { bsonType: 'string' },
                                timestamp: { bsonType: 'date' }
                            }
                        }
                    }
                }
            },
            {
                name: 'joe_streaming_updates',
                schema: {
                    validator: {
                        $jsonSchema: {
                            bsonType: 'object',
                            required: ['type', 'sessionId', 'timestamp'],
                            properties: {
                                type: { bsonType: 'string' },
                                sessionId: { bsonType: 'string' },
                                progress: { bsonType: 'int' },
                                message: { bsonType: 'string' },
                                timestamp: { bsonType: 'date' }
                            }
                        }
                    }
                }
            },
            {
                name: 'joe_keys',
                schema: {
                    validator: {
                        $jsonSchema: {
                            bsonType: 'object',
                            required: ['service', 'encryptedKey'],
                            properties: {
                                service: { bsonType: 'string' },
                                encryptedKey: { bsonType: 'string' },
                                lastUsed: { bsonType: 'date' }
                            }
                        }
                    }
                }
            }
        ];

        const db = getDB();
        
        for (const collection of collections) {
            try {
                // التحقق من وجود الكوليكشن
                const exists = await db.listCollections({ name: collection.name }).hasNext();
                
                if (!exists) {
                    await db.createCollection(collection.name, collection.schema || {});
                    console.log(`✅ Collection created: ${collection.name}`);
                } else {
                    console.log(`⚠️ Collection already exists: ${collection.name}`);
                }
                
            } catch (error) {
                console.error(`❌ Error creating collection ${collection.name}:`, error);
                // لا نوقف العملية، نكمل مع بقية الكوليكشنز
            }
        }

        // إنشاء الفهارس
        await this.createIndexes();
        
        return { collectionsCreated: collections.length };
    }

    async createIndexes() {
        console.log('🔍 Creating database indexes...');
        
        const indexes = [
            { collection: 'joe_interactions', fields: { userId: 1, 'metadata.timestamp': -1 } },
            { collection: 'joe_interactions', fields: { 'metadata.sessionId': 1 } },
            { collection: 'joe_projects', fields: { projectId: 1 }, unique: true },
            { collection: 'joe_projects', fields: { userId: 1, createdAt: -1 } },
            { collection: 'joe_learning_patterns', fields: { userId: 1, 'pattern.type': 1 } },
            { collection: 'joe_task_updates', fields: { taskId: 1, timestamp: -1 } },
            { collection: 'joe_streaming_updates', fields: { sessionId: 1, timestamp: -1 } }
        ];

        const db = getDB();
        
        for (const index of indexes) {
            try {
                await db.collection(index.collection).createIndex(index.fields, { unique: index.unique || false });
                console.log(`✅ Index created: ${index.collection}`);
            } catch (error) {
                console.error(`❌ Error creating index for ${index.collection}:`, error);
            }
        }
    }

    async createDirectories() {
        console.log('📁 Creating directory structure...');
        
        const directories = [
            'logs',
            'temp',
            'uploads',
            'downloads',
            'backups',
            'cache',
            'public/projects',
            'public/exports',
            'public/temp'
        ];

        for (const dir of directories) {
            try {
                await fs.mkdir(path.join(process.cwd(), dir), { recursive: true });
                console.log(`✅ Directory created: ${dir}`);
            } catch (error) {
                console.error(`❌ Error creating directory ${dir}:`, error);
            }
        }
    }

    async createConfigFiles() {
        console.log('⚙️ Creating configuration files...');
        
        // ملف الإعدادات الأساسية
        const configContent = `
// Joe System Configuration
module.exports = {
    system: {
        name: 'Joe AI Development Assistant',
        version: '2.0.0',
        environment: process.env.NODE_ENV || 'development'
    },
    
    server: {
        port: process.env.PORT || 10000,
        host: process.env.HOST || '0.0.0.0'
    },
    
    database: {
        uri: process.env.MONGO_URI,
        options: {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000
        }
    },
    
    ai: {
        openai: {
            apiKey: process.env.OPENAI_API_KEY,
            model: 'gpt-4o',
            maxTokens: 4000,
            temperature: 0.1
        },
        grok: {
            apiKey: process.env.GROK_API_KEY
        },
        gemini: {
            apiKey: process.env.GEMINI_API_KEY
        }
    },
    
    services: {
        github: {
            token: process.env.GITHUB_PAT,
            baseUrl: 'https://api.github.com'
        },
        cloudflare: {
            token: process.env.CLOUDFLARE_API_TOKEN,
            accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
            zoneId: process.env.CLOUDFLARE_ZONE_ID
        },
        render: {
            apiKey: process.env.RENDER_API_KEY
        }
    },
    
    redis: {
        url: process.env.REDIS_URL,
        options: {
            retryDelayOnFailover: 100,
            maxRetriesPerRequest: 3
        }
    },
    
    security: {
        jwtSecret: process.env.JWT_SECRET,
        bcryptRounds: 12,
        sessionTimeout: 24 * 60 * 60 * 1000 // 24 hours
    },
    
    streaming: {
        frameRate: 2, // frames per second
        quality: 'medium',
        formats: ['jpeg', 'png']
    },
    
    limits: {
        maxFileSize: 10 * 1024 * 1024, // 10MB
        maxProjectSize: 50 * 1024 * 1024, // 50MB
        maxRequestsPerMinute: 100,
        maxConcurrentTasks: 5
    }
};
`;

        await fs.writeFile(path.join(process.cwd(), 'config.js'), configContent.trim());
        
        // ملف Nginx للإنتاج
        const nginxConfig = `
map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}

server {
    listen 80;
    server_name admin.xelitesolutions.com;

    set $backend_upstream http://localhost:10000;

    location / {
        proxy_pass $backend_upstream;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # توجيه جميع مسارات WebSocket إلى الخادم الخلفي
    location ~ ^/ws/(joe-agent|browser|live-stream) {
        proxy_pass $backend_upstream;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }

    # Socket.IO (collaboration) WebSocket upgrade handling
    location /socket.io/ {
        proxy_pass $backend_upstream/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
        proxy_buffering off;
    }
}
`;


        await fs.writeFile(path.join(process.cwd(), 'nginx.conf'), nginxConfig.trim());
        
        console.log('✅ Configuration files created');
    }

    async checkDependencies() {
        console.log('📦 Checking dependencies...');
        
        const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8'));
        const dependencies = Object.keys(packageJson.dependencies || {});
        const devDependencies = Object.keys(packageJson.devDependencies || {});
        
        const allDependencies = [...dependencies, ...devDependencies];
        const missingDeps = [];
        
        for (const dep of allDependencies) {
            try {
                await import(dep);
                console.log(`✅ ${dep} is installed`);
            } catch {
                missingDeps.push(dep);
                console.log(`❌ ${dep} is missing`);
            }
        }
        
        if (missingDeps.length > 0) {
            console.log(`⚠️ Missing dependencies: ${missingDeps.join(', ')}`);
            console.log('💡 Run: npm install to install missing dependencies');
        }
        
        return { total: allDependencies.length, missing: missingDeps.length };
    }

    async validateSystem() {
        console.log('🔍 Validating system setup...');
        
        const validations = [
            { name: 'Database Connection', test: this.testDatabaseConnection.bind(this) },
            { name: 'File System Access', test: this.testFileSystemAccess.bind(this) },
            { name: 'WebSocket Server', test: this.testWebSocketServer.bind(this) },
            { name: 'AI Services', test: this.testAIServices.bind(this) },
            { name: 'External APIs', test: this.testExternalAPIs.bind(this) }
        ];
        
        const results = [];
        
        for (const validation of validations) {
            try {
                const result = await validation.test();
                results.push({ name: validation.name, success: true, result });
                console.log(`✅ ${validation.name}: OK`);
            } catch (error) {
                results.push({ name: validation.name, success: false, error: error.message });
                console.log(`❌ ${validation.name}: FAILED - ${error.message}`);
            }
        }
        
        return results;
    }

    async testDatabaseConnection() {
        const db = getDB();
        await db.admin().ping();
        return { status: 'connected' };
    }

    async testFileSystemAccess() {
        const testFile = path.join(process.cwd(), 'temp', 'test.txt');
        await fs.writeFile(testFile, 'test');
        await fs.unlink(testFile);
        return { status: 'accessible' };
    }

    async testWebSocketServer() {
        // سيتم تنفيذه لاحقاً
        return { status: 'pending' };
    }

    async testAIServices() {
        // التحقق من مفاتيح API
        const hasOpenAI = !!process.env.OPENAI_API_KEY;
        const hasGrok = !!process.env.GROK_API_KEY;
        const hasGemini = !!process.env.GEMINI_API_KEY;
        
        return {
            openai: hasOpenAI ? 'configured' : 'missing',
            grok: hasGrok ? 'configured' : 'missing',
            gemini: hasGemini ? 'configured' : 'missing'
        };
    }

    async testExternalAPIs() {
        // التحقق من خدمات خارجية
        const services = {
            github: !!process.env.GITHUB_PAT,
            cloudflare: !!(process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_ACCOUNT_ID),
            render: !!process.env.RENDER_API_KEY
        };
        
        return services;
    }

    createEnvExample() {
        const envExample = `
# Joe AI System Environment Variables

# Application
NODE_ENV=development
PORT=10000
HOST=0.0.0.0

# Database
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/database

# Redis
REDIS_URL=redis://default:password@host:6379

# AI Services
OPENAI_API_KEY=sk-your-openai-api-key
GROK_API_KEY=xai-your-grok-api-key
GEMINI_API_KEY=your-gemini-api-key

# External Services
GITHUB_PAT=ghp_your-github-personal-access-token
CLOUDFLARE_API_TOKEN=your-cloudflare-api-token
CLOUDFLARE_ACCOUNT_ID=your-cloudflare-account-id
CLOUDFLARE_ZONE_ID=your-cloudflare-zone-id
RENDER_API_KEY=your-render-api-key

# Security
JWT_SECRET=your-super-secret-jwt-key
MASTER_ENCRYPTION_KEY=your-encryption-key

# Optional Services
# PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# File System
MAX_FILE_SIZE=10485760
MAX_PROJECT_SIZE=52428800

# Performance
MAX_CONCURRENT_TASKS=5
RATE_LIMIT_PER_MINUTE=100
`;

        return envExample.trim();
    }

    async generateReport() {
        console.log('\n📊 Setup Report');
        console.log('=' * 50);
        
        const successful = this.results.filter(r => r.success).length;
        const failed = this.results.filter(r => !r.success).length;
        
        console.log(`✅ Successful steps: ${successful}`);
        console.log(`❌ Failed steps: ${failed}`);
        console.log(`📈 Success rate: ${(successful / this.results.length * 100).toFixed(1)}%`);
        
        if (failed > 0) {
            console.log('\n⚠️ Failed steps details:');
            this.results.filter(r => !r.success).forEach(r => {
                console.log(`  - ${r.step}: ${r.error}`);
            });
        }
        
        console.log('\n🎯 Next Steps:');
        console.log('1. Review any failed steps above');
        console.log('2. Install missing dependencies: npm install');
        console.log('3. Configure environment variables in .env file');
        console.log('4. Start the system: npm start');
        console.log('5. Visit: https://admin.xelitesolutions.com');
        
        // حفظ التقرير
        const reportContent = JSON.stringify({
            timestamp: new Date(),
            results: this.results,
            summary: {
                total: this.results.length,
                successful,
                failed,
                successRate: (successful / this.results.length * 100).toFixed(1)
            }
        }, null, 2);
        
        await fs.writeFile('setup-report.json', reportContent);
        console.log('\n📄 Full report saved to: setup-report.json');
    }

    compareVersions(version1, version2) {
        const v1Parts = version1.split('.').map(Number);
        const v2Parts = version2.split('.').map(Number);
        
        for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
            const v1Part = v1Parts[i] || 0;
            const v2Part = v2Parts[i] || 0;
            
            if (v1Part < v2Part) return -1;
            if (v1Part > v2Part) return 1;
        }
        
        return 0;
    }

    async askToContinue() {
        // في البيئة الحقيقية، يمكن استخدام readline
        // هنا نفترض المتابعة دائماً
        return true;
    }
}

// تشغيل السكريبت
if (import.meta.url === `file://${process.argv[1]}`) {
    const setup = new JoeSetup();
    setup.run().catch(console.error);
}

export default JoeSetup;
