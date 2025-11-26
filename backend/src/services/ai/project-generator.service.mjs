/**
 * 🚀 JOE Advanced Worker Manager - المنفذ الذكي
 * نظام متطور لإدارة المهام مع توليد + حفظ + رفع + نشر تلقائي
 * 
 * @module WorkerManager
 * @version 3.0.0
 * @description نظام قوي لإدارة المهام مع دعم AI وتكامل كامل
 */

import { EventEmitter } from 'events';
import { MongoClient, ObjectId } from 'mongodb';
import { Octokit } from '@octokit/rest';
import { improveCode, generateWebsite, generateWebApp, generateEcommerce } from '../lib/geminiEngine.mjs';
import { deployToCloudflare } from '../lib/cloudflareDeployer.mjs';
import { deployToRender } from '../lib/renderDeployer.mjs';
import { deployToVercel } from '../lib/vercelDeployer.mjs';
import fs from 'fs/promises';
import path from 'path';
import archiver from 'archiver';
import { createWriteStream } from 'fs';

// 🔧 الإعدادات
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OWNER = process.env.GITHUB_OWNER || process.env.OWNER;
const REPO = process.env.GITHUB_REPO || process.env.REPO;
const PROJECTS_DIR = process.env.PROJECTS_DIR || '/tmp/joe-projects';
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
const DB_NAME = process.env.DB_NAME || 'joe_db';

// 🐙 GitHub Client
const octokit = GITHUB_TOKEN ? new Octokit({ auth: GITHUB_TOKEN }) : null;

/**
 * 🎯 مدير المهام المتقدم
 */
export class AdvancedWorkerManager extends EventEmitter {
    constructor(options = {}) {
        super();
        
        // ⚙️ الإعدادات
        this.config = {
            maxConcurrent: options.maxConcurrent || 5,
            maxRetries: options.maxRetries || 3,
            retryDelay: options.retryDelay || 5000,
            watchInterval: options.watchInterval || 3000,
            jobTimeout: options.jobTimeout || 10 * 60 * 1000, // 10 دقائق
            cleanupInterval: options.cleanupInterval || 60 * 60 * 1000, // ساعة
            enableAutoCleanup: options.enableAutoCleanup !== false,
            enableMetrics: options.enableMetrics !== false,
            projectsDir: options.projectsDir || PROJECTS_DIR
        };

        // 📊 حالة النظام
        this.activeJobs = new Map();
        this.jobQueue = [];
        this.isRunning = false;
        this.db = null;
        this.mongoClient = null;

        // 📈 الإحصائيات
        this.stats = {
            processed: 0,
            failed: 0,
            retried: 0,
            avgProcessingTime: 0,
            totalProcessingTime: 0,
            successRate: 0,
            jobsByType: {},
            jobsByStatus: {
                QUEUED: 0,
                WORKING: 0,
                DONE: 0,
                FAILED: 0
            },
            deployments: {
                github: 0,
                cloudflare: 0,
                render: 0,
                vercel: 0
            }
        };

        // 🔄 المؤقتات
        this.watchTimer = null;
        this.cleanupTimer = null;
        this.metricsTimer = null;

        console.log('✅ Advanced Worker Manager initialized');
    }

    /**
     * 🚀 بدء النظام
     */
    async start() {
        if (this.isRunning) {
            console.log('⚠️ Worker Manager already running');
            return;
        }

        try {
            console.log('🚀 Starting Advanced Worker Manager...');
            
            // 🔌 الاتصال بقاعدة البيانات
            await this.initialize();
            
            // ✅ تشغيل النظام
            this.isRunning = true;
            
            // 🔄 بدء المراقبة
            this.startWatching();
            
            // 🧹 بدء التنظيف التلقائي
            if (this.config.enableAutoCleanup) {
                this.startAutoCleanup();
            }
            
            // 📊 بدء جمع المقاييس
            if (this.config.enableMetrics) {
                this.startMetricsCollection();
            }
            
            console.log('✅ Worker Manager started successfully');
            console.log(`📊 Max concurrent jobs: ${this.config.maxConcurrent}`);
            console.log(`🔄 Watch interval: ${this.config.watchInterval}ms`);
            
            this.emit('started', { timestamp: new Date() });
            
        } catch (error) {
            console.error('❌ Failed to start Worker Manager:', error);
            this.emit('error', { type: 'start_failed', error });
            throw error;
        }
    }

    /**
     * 🔌 تهيئة الاتصال بقاعدة البيانات
     */
    async initialize() {
        try {
            console.log('🔌 Connecting to MongoDB...');
            
            if (!MONGO_URI) {
                throw new Error('MONGO_URI not configured');
            }
            
            this.mongoClient = await MongoClient.connect(MONGO_URI, {
                maxPoolSize: 10,
                minPoolSize: 2,
                serverSelectionTimeoutMS: 5000
            });
            
            this.db = this.mongoClient.db(DB_NAME);
            
            // 🔍 إنشاء الفهارس
            await this.createIndexes();
            
            // 📊 تحميل الإحصائيات
            await this.loadStats();
            
            console.log('✅ MongoDB connected successfully');
            
        } catch (error) {
            console.error('❌ MongoDB connection failed:', error);
            throw error;
        }
    }

    /**
     * 🔍 إنشاء الفهارس
     */
    async createIndexes() {
        try {
            await this.db.collection('jobs').createIndexes([
                { key: { status: 1, createdAt: 1 } },
                { key: { userId: 1, createdAt: -1 } },
                { key: { type: 1 } },
                { key: { completedAt: 1 }, expireAfterSeconds: 30 * 24 * 60 * 60 } // 30 يوم
            ]);
            
            console.log('✅ Database indexes created');
        } catch (error) {
            console.warn('⚠️ Failed to create indexes:', error.message);
        }
    }

    /**
     * 📊 تحميل الإحصائيات
     */
    async loadStats() {
        try {
            const pipeline = [
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 }
                    }
                }
            ];
            
            const results = await this.db.collection('jobs').aggregate(pipeline).toArray();
            
            results.forEach(result => {
                this.stats.jobsByStatus[result._id] = result.count;
            });
            
            // حساب معدل النجاح
            const total = this.stats.jobsByStatus.DONE + this.stats.jobsByStatus.FAILED;
            if (total > 0) {
                this.stats.successRate = (this.stats.jobsByStatus.DONE / total) * 100;
            }
            
            console.log('📊 Stats loaded:', this.stats.jobsByStatus);
            
        } catch (error) {
            console.warn('⚠️ Failed to load stats:', error.message);
        }
    }

    /**
     * 🔄 بدء المراقبة
     */
    startWatching() {
        this.watchTimer = setInterval(() => {
            this.watchJobs();
        }, this.config.watchInterval);
        
        // تشغيل فوري
        this.watchJobs();
        
        console.log('👀 Job watching started');
    }

    /**
     * 👀 مراقبة المهام
     */
    async watchJobs() {
        if (!this.isRunning) return;

        try {
            // 🔍 التحقق من المهام منتهية الصلاحية
            await this.checkTimeoutJobs();
            
            // 📊 عدد المهام النشطة
            const activeCount = this.activeJobs.size;
            
            // 🎯 عدد المهام المتاحة
            const availableSlots = this.config.maxConcurrent - activeCount;
            
            if (availableSlots <= 0) {
                return; // لا توجد فتحات متاحة
            }

            // 🔍 جلب المهام من قاعدة البيانات
            const jobs = await this.db.collection('jobs')
                .find({ status: 'QUEUED' })
                .sort({ priority: -1, createdAt: 1 })
                .limit(availableSlots)
                .toArray();

            // 🚀 معالجة المهام
            for (const job of jobs) {
                this.processJob(job);
            }

        } catch (error) {
            console.error('❌ Watch jobs error:', error);
            this.emit('error', { type: 'watch_jobs', error });
        }
    }

    /**
     * ⏰ التحقق من المهام منتهية الصلاحية
     */
    async checkTimeoutJobs() {
        try {
            const timeoutThreshold = new Date(Date.now() - this.config.jobTimeout);
            
            const result = await this.db.collection('jobs').updateMany(
                {
                    status: 'WORKING',
                    startedAt: { $lt: timeoutThreshold }
                },
                {
                    $set: {
                        status: 'FAILED',
                        error: 'Job timeout exceeded',
                        failedAt: new Date()
                    }
                }
            );
            
            if (result.modifiedCount > 0) {
                console.log(`⏰ Marked ${result.modifiedCount} jobs as timed out`);
                this.stats.failed += result.modifiedCount;
            }
            
        } catch (error) {
            console.error('❌ Check timeout jobs error:', error);
        }
    }

    /**
     * 🔧 معالجة مهمة
     */
    async processJob(job) {
        const jobId = job._id.toString();
        const startTime = Date.now();
        
        // ✅ إضافة للمهام النشطة
        this.activeJobs.set(jobId, {
            job,
            startTime,
            attempts: (job.attempts || 0) + 1
        });

        try {
            console.log(`🔧 [${jobId}] Processing job: ${job.type || 'unknown'}`);
            
            // 📝 تحديث الحالة
            await this.db.collection('jobs').updateOne(
                { _id: job._id },
                {
                    $set: {
                        status: 'WORKING',
                        startedAt: new Date(),
                        workerId: process.pid
                    },
                    $inc: { attempts: 1 }
                }
            );

            this.emit('job:started', { jobId, job });

            // 🎯 تحديد نوع المهمة
            let result;
            
            switch (job.type) {
                case 'create_website':
                    result = await this.handleCreateWebsite(job);
                    break;
                    
                case 'create_webapp':
                    result = await this.handleCreateWebApp(job);
                    break;
                    
                case 'create_ecommerce':
                    result = await this.handleCreateEcommerce(job);
                    break;
                    
                case 'improve_code':
                    result = await this.handleImproveCode(job);
                    break;
                    
                case 'deploy_project':
                    result = await this.handleDeployProject(job);
                    break;
                    
                default:
                    // محاولة تحديد النوع من الأمر
                    result = await this.handleAutoDetect(job);
            }

            // ✅ حفظ النتيجة
            const processingTime = Date.now() - startTime;
            
            await this.db.collection('jobs').updateOne(
                { _id: job._id },
                {
                    $set: {
                        status: 'DONE',
                        completedAt: new Date(),
                        processingTime,
                        result
                    }
                }
            );

            // 📊 تحديث الإحصائيات
            this.updateStats(job.type, processingTime, true);

            console.log(`✅ [${jobId}] Job completed in ${processingTime}ms`);
            this.emit('job:completed', { jobId, result, processingTime });

        } catch (error) {
            console.error(`❌ [${jobId}] Job failed:`, error);
            
            // 🔄 محاولة إعادة المحاولة
            const shouldRetry = this.shouldRetry(job);
            
            if (shouldRetry) {
                await this.retryJob(job, error);
            } else {
                await this.failJob(job, error);
            }
            
            this.emit('job:failed', { jobId, error: error.message });

        } finally {
            // 🗑️ إزالة من المهام النشطة
            this.activeJobs.delete(jobId);
        }
    }

    /**
     * 🌐 معالجة إنشاء موقع ويب
     */
    async handleCreateWebsite(job) {
        console.log(`🌐 Creating website: ${job.title || 'Untitled'}`);
        
        const projectId = job._id.toString();
        const projectPath = await this.ensureProjectDir(projectId);
        
        // 🎨 توليد الموقع
        const htmlCode = await generateWebsite(
            job.description || job.command,
            job.style || 'modern'
        );
        
        // 💾 حفظ الملفات
        await this.saveFile(projectPath, 'index.html', htmlCode);
        await this.saveFile(projectPath, 'README.md', this.generateReadme(job));
        
        // 📦 إنشاء أرشيف
        const zipPath = await this.createArchive(projectPath, projectId);
        
        // 🚀 النشر
        const deployments = await this.deployProject(projectId, projectPath, job);
        
        return {
            success: true,
            projectId,
            projectPath,
            zipPath,
            files: ['index.html', 'README.md'],
            deployments
        };
    }

    /**
     * 📱 معالجة إنشاء تطبيق ويب
     */
    async handleCreateWebApp(job) {
        console.log(`📱 Creating web app: ${job.title || 'Untitled'}`);
        
        const projectId = job._id.toString();
        const projectPath = await this.ensureProjectDir(projectId);
        
        // 🎨 توليد التطبيق
        const result = await generateWebApp(
            job.description || job.command,
            job.features || []
        );
        
        // 💾 حفظ الملفات
        const files = [];
        for (const [filePath, content] of Object.entries(result.files)) {
            await this.saveFile(projectPath, filePath, content);
            files.push(filePath);
        }
        
        await this.saveFile(projectPath, 'README.md', this.generateReadme(job));
        files.push('README.md');
        
        // 📦 إنشاء أرشيف
        const zipPath = await this.createArchive(projectPath, projectId);
        
        // 🚀 النشر
        const deployments = await this.deployProject(projectId, projectPath, job);
        
        return {
            success: true,
            projectId,
            projectPath,
            zipPath,
            files,
            deployments
        };
    }

    /**
     * 🛒 معالجة إنشاء متجر إلكتروني
     */
    async handleCreateEcommerce(job) {
        console.log(`🛒 Creating e-commerce store: ${job.title || 'Untitled'}`);
        
        const projectId = job._id.toString();
        const projectPath = await this.ensureProjectDir(projectId);
        
        // 🎨 توليد المتجر
        const result = await generateEcommerce(
            job.description || job.command,
            job.products || []
        );
        
        // 💾 حفظ الملفات
        const files = [];
        for (const [filePath, content] of Object.entries(result.files)) {
            await this.saveFile(projectPath, filePath, content);
            files.push(filePath);
        }
        
        await this.saveFile(projectPath, 'README.md', this.generateReadme(job));
        files.push('README.md');
        
        // 📦 إنشاء أرشيف
        const zipPath = await this.createArchive(projectPath, projectId);
        
        // 🚀 النشر
        const deployments = await this.deployProject(projectId, projectPath, job);
        
        return {
            success: true,
            projectId,
            projectPath,
            zipPath,
            files,
            deployments
        };
    }

    /**
     * 🔧 معالجة تحسين الكود
     */
    async handleImproveCode(job) {
        console.log(`🔧 Improving code for repo: ${job.repo || 'default'}`);
        
        // 🔍 فحص المستودع
        const files = await this.scanRepo(job.owner || OWNER, job.repo || REPO);
        
        const updates = [];
        
        for (const file of files) {
            if (/\.(html|js|css|jsx|tsx|vue|svelte)$/.test(file.path)) {
                try {
                    const result = await improveCode(
                        file.content,
                        job.command || 'حسّن الكود وأضف تعليقات'
                    );
                    
                    if (result && result.content && result.content.length > 100) {
                        updates.push({
                            path: file.path,
                            content: result.content,
                            message: result.message || `JOE: تحسين ${file.path}`,
                            sha: file.sha
                        });
                    }
                } catch (error) {
                    console.warn(`⚠️ Failed to improve ${file.path}:`, error.message);
                }
            }
        }
        
        if (updates.length === 0) {
            throw new Error('No improvements found');
        }
        
        // 🚀 رفع التحديثات
        await this.applyUpdates(updates, job.owner || OWNER, job.repo || REPO);
        
        return {
            success: true,
            updates: updates.map(u => u.path),
            count: updates.length,
            repo: `https://github.com/${job.owner || OWNER}/${job.repo || REPO}`
        };
    }

    /**
     * 🚀 معالجة نشر المشروع
     */
    async handleDeployProject(job) {
        console.log(`🚀 Deploying project: ${job.projectId}`);
        
        const projectPath = path.join(this.config.projectsDir, job.projectId);
        
        // التحقق من وجود المشروع
        try {
            await fs.access(projectPath);
        } catch (error) {
            throw new Error(`Project not found: ${job.projectId}`);
        }
        
        // 🚀 النشر
        const deployments = await this.deployProject(job.projectId, projectPath, job);
        
        return {
            success: true,
            projectId: job.projectId,
            deployments
        };
    }

    /**
     * 🤖 اكتشاف تلقائي لنوع المهمة
     */
    async handleAutoDetect(job) {
        const command = (job.command || '').toLowerCase();
        
        // تحديد النوع من الأمر
        if (command.includes('أنشئ') || command.includes('create') || command.includes('build')) {
            if (command.includes('متجر') || command.includes('shop') || command.includes('ecommerce')) {
                return await this.handleCreateEcommerce(job);
            } else if (command.includes('تطبيق') || command.includes('app')) {
                return await this.handleCreateWebApp(job);
            } else {
                return await this.handleCreateWebsite(job);
            }
        } else if (command.includes('حسّن') || command.includes('improve') || command.includes('enhance')) {
            return await this.handleImproveCode(job);
        } else if (command.includes('انشر') || command.includes('deploy')) {
            return await this.handleDeployProject(job);
        }
        
        // افتراضي: إنشاء موقع
        return await this.handleCreateWebsite(job);
    }

    /**
     * 🚀 نشر المشروع
     */
    async deployProject(projectId, projectPath, job) {
        const deployments = {
            github: null,
            cloudflare: null,
            render: null,
            vercel: null
        };
        
        try {
            // 🐙 GitHub
            if (job.deployToGithub !== false && GITHUB_TOKEN) {
                try {
                    const githubUrl = await this.deployToGithub(projectPath, job);
                    deployments.github = githubUrl;
                    this.stats.deployments.github++;
                } catch (error) {
                    console.warn('⚠️ GitHub deployment failed:', error.message);
                }
            }
            
            // ☁️ Cloudflare
            if (job.deployToCloudflare !== false) {
                try {
                    const cfResult = await deployToCloudflare(
                        projectId,
                        projectPath,
                        job.title || 'joe-project'
                    );
                    if (cfResult.success) {
                        deployments.cloudflare = cfResult.url;
                        this.stats.deployments.cloudflare++;
                    }
                } catch (error) {
                    console.warn('⚠️ Cloudflare deployment failed:', error.message);
                }
            }
            
            // 🎨 Render
            if (job.deployToRender) {
                try {
                    const renderResult = await deployToRender(projectId, projectPath, job);
                    if (renderResult.success) {
                        deployments.render = renderResult.url;
                        this.stats.deployments.render++;
                    }
                } catch (error) {
                    console.warn('⚠️ Render deployment failed:', error.message);
                }
            }
            
            // ▲ Vercel
            if (job.deployToVercel) {
                try {
                    const vercelResult = await deployToVercel(projectId, projectPath, job);
                    if (vercelResult.success) {
                        deployments.vercel = vercelResult.url;
                        this.stats.deployments.vercel++;
                    }
                } catch (error) {
                    console.warn('⚠️ Vercel deployment failed:', error.message);
                }
            }
            
        } catch (error) {
            console.error('❌ Deployment error:', error);
        }
        
        return deployments;
    }

    /**
     * 🐙 النشر على GitHub
     */
    async deployToGithub(projectPath, job) {
        if (!octokit) {
            throw new Error('GitHub token not configured');
        }
        
        const owner = job.owner || OWNER;
        const repo = job.repo || REPO || `joe-project-${Date.now()}`;
        
        // قراءة الملفات
        const files = await this.readProjectFiles(projectPath);
        
        // رفع الملفات
        for (const file of files) {
            await octokit.repos.createOrUpdateFileContents({
                owner,
                repo,
                path: file.path,
                message: `JOE: ${file.path}`,
                content: Buffer.from(file.content).toString('base64')
            });
        }
        
        return `https://github.com/${owner}/${repo}`;
    }

    /**
     * 🔍 فحص المستودع
     */
    async scanRepo(owner = OWNER, repo = REPO) {
        if (!octokit) {
            throw new Error('GitHub token not configured');
        }
        
        try {
            const { data: ref } = await octokit.git.getRef({
                owner,
                repo,
                ref: 'heads/main'
            });
            
            const { data: commit } = await octokit.git.getCommit({
                owner,
                repo,
                commit_sha: ref.object.sha
            });
            
            const { data: tree } = await octokit.git.getTree({
                owner,
                repo,
                tree_sha: commit.tree.sha,
                recursive: true
            });

            const codeFiles = tree.tree
                .filter(f => f.type === 'blob' && /\.(js|html|css|json|md|jsx|tsx|vue|svelte)$/.test(f.path))
                .slice(0, 50); // أول 50 ملف

            const files = [];
            for (const f of codeFiles) {
                try {
                    const { data } = await octokit.repos.getContent({
                        owner,
                        repo,
                        path: f.path
                    });
                    
                    const content = Buffer.from(data.content, 'base64').toString('utf-8');
                    files.push({
                        path: f.path,
                        content,
                        sha: data.sha
                    });
                } catch (error) {
                    console.warn(`⚠️ Failed to read ${f.path}:`, error.message);
                }
            }
            
            return files;
            
        } catch (error) {
            throw new Error(`Failed to scan repo: ${error.message}`);
        }
    }

    /**
     * 🚀 تطبيق التحديثات
     */
    async applyUpdates(updates, owner = OWNER, repo = REPO) {
        if (!octokit) {
            throw new Error('GitHub token not configured');
        }
        
        for (const update of updates) {
            try {
                await octokit.repos.createOrUpdateFileContents({
                    owner,
                    repo,
                    path: update.path,
                    message: update.message,
                    content: Buffer.from(update.content).toString('base64'),
                    sha: update.sha || undefined
                });
                
                console.log(`✅ Updated: ${update.path}`);
            } catch (error) {
                console.error(`❌ Failed to update ${update.path}:`, error.message);
            }
        }
    }

    /**
     * 📁 التأكد من وجود مجلد المشروع
     */
    async ensureProjectDir(projectId) {
        const projectPath = path.join(this.config.projectsDir, projectId);
        await fs.mkdir(projectPath, { recursive: true });
        return projectPath;
    }

    /**
     * 💾 حفظ ملف
     */
    async saveFile(projectPath, filePath, content) {
        const fullPath = path.join(projectPath, filePath);
        const dir = path.dirname(fullPath);
        
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(fullPath, content, 'utf-8');
    }

    /**
     * 📖 قراءة ملفات المشروع
     */
    async readProjectFiles(projectPath) {
        const files = [];
        
        const readDir = async (dir, basePath = '') => {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                const relativePath = path.join(basePath, entry.name);
                
                if (entry.isDirectory()) {
                    await readDir(fullPath, relativePath);
                } else {
                    const content = await fs.readFile(fullPath, 'utf-8');
                    files.push({
                        path: relativePath,
                        content
                    });
                }
            }
        };
        
        await readDir(projectPath);
        return files;
    }

    /**
     * 📦 إنشاء أرشيف
     */
    async createArchive(projectPath, projectId) {
        const zipPath = path.join(this.config.projectsDir, `${projectId}.zip`);
        
        return new Promise((resolve, reject) => {
            const output = createWriteStream(zipPath);
            const archive = archiver('zip', { zlib: { level: 9 } });
            
            output.on('close', () => resolve(zipPath));
            archive.on('error', reject);
            
            archive.pipe(output);
            archive.directory(projectPath, false);
            archive.finalize();
        });
    }

    /**
     * 📝 توليد README
     */
    generateReadme(job) {
        return `# ${job.title || 'Project'}

Generated by JOE - Advanced AI Worker

## Description
${job.description || job.command || 'No description provided'}

## Features
${(job.features || []).map(f => `- ${f}`).join('\n') || '- Modern design\n- Responsive layout\n- SEO optimized'}

## How to use
Simply open \`index.html\` in your browser or deploy to any static hosting service.

---
Generated on: ${new Date().toISOString()}
Project ID: ${job._id}
`;
    }

    /**
     * 🔄 هل يجب إعادة المحاولة
     */
    shouldRetry(job) {
        const attempts = job.attempts || 0;
        return attempts < this.config.maxRetries;
    }

    /**
     * 🔄 إعادة محاولة المهمة
     */
    async retryJob(job, error) {
        try {
            const retryAt = new Date(Date.now() + this.config.retryDelay);
            
            await this.db.collection('jobs').updateOne(
                { _id: job._id },
                {
                    $set: {
                        status: 'QUEUED',
                        lastError: error.message,
                        retryAt
                    }
                }
            );
            
            this.stats.retried++;
            
            console.log(`🔄 Job ${job._id} will be retried at ${retryAt}`);
            this.emit('job:retried', { jobId: job._id.toString(), retryAt });
            
        } catch (err) {
            console.error('❌ Failed to retry job:', err);
        }
    }

    /**
     * ❌ فشل المهمة
     */
    async failJob(job, error) {
        try {
            await this.db.collection('jobs').updateOne(
                { _id: job._id },
                {
                    $set: {
                        status: 'FAILED',
                        error: error.message,
                        failedAt: new Date()
                    }
                }
            );
            
            this.stats.failed++;
            
            console.log(`❌ Job ${job._id} failed permanently`);
            
        } catch (err) {
            console.error('❌ Failed to mark job as failed:', err);
        }
    }

    /**
     * 📊 تحديث الإحصائيات
     */
    updateStats(jobType, processingTime, success) {
        if (success) {
            this.stats.processed++;
            this.stats.totalProcessingTime += processingTime;
            this.stats.avgProcessingTime = this.stats.totalProcessingTime / this.stats.processed;
        }
        
        // تحديث حسب النوع
        if (jobType) {
            this.stats.jobsByType[jobType] = (this.stats.jobsByType[jobType] || 0) + 1;
        }
        
        // حساب معدل النجاح
        const total = this.stats.processed + this.stats.failed;
        if (total > 0) {
            this.stats.successRate = (this.stats.processed / total) * 100;
        }
    }

    /**
     * 🧹 بدء التنظيف التلقائي
     */
    startAutoCleanup() {
        this.cleanupTimer = setInterval(() => {
            this.cleanup();
        }, this.config.cleanupInterval);
        
        console.log('🧹 Auto cleanup started');
    }

    /**
     * 🧹 تنظيف المشاريع القديمة
     */
    async cleanup() {
        try {
            console.log('🧹 Running cleanup...');
            
            // حذف المشاريع القديمة (أكثر من 7 أيام)
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            
            const oldJobs = await this.db.collection('jobs')
                .find({
                    status: { $in: ['DONE', 'FAILED'] },
                    completedAt: { $lt: sevenDaysAgo }
                })
                .toArray();
            
            for (const job of oldJobs) {
                const projectPath = path.join(this.config.projectsDir, job._id.toString());
                const zipPath = path.join(this.config.projectsDir, `${job._id}.zip`);
                
                // حذف المجلد
                await fs.rm(projectPath, { recursive: true, force: true }).catch(() => {});
                
                // حذف الأرشيف
                await fs.rm(zipPath, { force: true }).catch(() => {});
            }
            
            console.log(`🧹 Cleaned up ${oldJobs.length} old projects`);
            this.emit('cleanup:completed', { count: oldJobs.length });
            
        } catch (error) {
            console.error('❌ Cleanup error:', error);
            this.emit('error', { type: 'cleanup', error });
        }
    }

    /**
     * 📊 بدء جمع المقاييس
     */
    startMetricsCollection() {
        this.metricsTimer = setInterval(() => {
            this.collectMetrics();
        }, 60 * 1000); // كل دقيقة
        
        console.log('📊 Metrics collection started');
    }

    /**
     * 📊 جمع المقاييس
     */
    async collectMetrics() {
        try {
            const metrics = {
                timestamp: new Date(),
                activeJobs: this.activeJobs.size,
                stats: { ...this.stats },
                memory: process.memoryUsage(),
                uptime: process.uptime()
            };
            
            await this.db.collection('worker_metrics').insertOne(metrics);
            
            this.emit('metrics:collected', metrics);
            
        } catch (error) {
            console.error('❌ Metrics collection error:', error);
        }
    }

    /**
     * 📊 الحصول على الإحصائيات
     */
    getStats() {
        return {
            ...this.stats,
            activeJobs: this.activeJobs.size,
            isRunning: this.isRunning,
            uptime: process.uptime(),
            memory: process.memoryUsage()
        };
    }

    /**
     * ⏹️ إيقاف النظام
     */
    async stop() {
        console.log('⏹️ Stopping Worker Manager...');
        
        this.isRunning = false;
        
        // إيقاف المؤقتات
        if (this.watchTimer) clearInterval(this.watchTimer);
        if (this.cleanupTimer) clearInterval(this.cleanupTimer);
        if (this.metricsTimer) clearInterval(this.metricsTimer);
        
        // انتظار المهام النشطة
        if (this.activeJobs.size > 0) {
            console.log(`⏳ Waiting for ${this.activeJobs.size} active jobs...`);
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
        
        // إغلاق الاتصال
        if (this.mongoClient) {
            await this.mongoClient.close();
        }
        
        this.emit('stopped');
        console.log('✅ Worker Manager stopped');
    }
}

// 🎯 تصدير مثيل واحد
export const workerManager = new AdvancedWorkerManager();

export default AdvancedWorkerManager;
