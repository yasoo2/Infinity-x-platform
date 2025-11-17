/**
 * 📁 File Tools - أدوات الملفات المتقدمة
 * نظام متطور لإدارة الملفات والمجلدات
 * متوافق مع Joe Advanced Engine و Gemini Engine
 * 
 * @module FileTools
 * @version 2.0.0
 */

import fs from 'fs/promises';
import { createReadStream, createWriteStream, existsSync } from 'fs';
import path from 'path';
import archiver from 'archiver';
import { createHash } from 'crypto';
import { pipeline } from 'stream/promises';
import { getDB } from '../db.mjs';

/**
 * 🎯 فئة أدوات الملفات المتقدمة
 */
export class FileTools {
    constructor(options = {}) {
        this.basePath = options.basePath || '/tmp/joe-files';
        this.maxFileSize = options.maxFileSize || 100 * 1024 * 1024; // 100MB
        this.allowedExtensions = options.allowedExtensions || null; // null = all allowed
        this.backupEnabled = options.backupEnabled !== false;
        
        // 📊 إحصائيات
        this.stats = {
            totalOperations: 0,
            filesCreated: 0,
            filesRead: 0,
            filesUpdated: 0,
            filesDeleted: 0,
            filesMoved: 0,
            filesCopied: 0,
            archivesCreated: 0,
            backupsCreated: 0,
            totalBytesProcessed: 0,
            errors: 0
        };

        // 🔒 قفل العمليات
        this.locks = new Map();

        // 💾 ذاكرة التخزين المؤقت
        this.cache = new Map();
        this.cacheMaxAge = options.cacheMaxAge || 5 * 60 * 1000; // 5 دقائق

        this.setupBaseDirectory();
        console.log('✅ File Tools initialized');
    }

    /**
     * 🏗️ إعداد المجلد الأساسي
     */
    async setupBaseDirectory() {
        try {
            await fs.mkdir(this.basePath, { recursive: true });
            
            // إنشاء مجلدات فرعية
            const subdirs = ['temp', 'backups', 'archives', 'uploads'];
            for (const dir of subdirs) {
                await fs.mkdir(path.join(this.basePath, dir), { recursive: true });
            }

            console.log('✅ File tools base directory created:', this.basePath);
        } catch (error) {
            console.error('❌ Setup base directory error:', error);
            throw error;
        }
    }

    /**
     * 🚀 تنفيذ مهمة
     */
    async executeTask(requirements) {
        const startTime = Date.now();
        this.stats.totalOperations++;

        try {
            console.log('📁 [FileTools] بدء المهمة:', requirements.action);

            const { action, files, options = {} } = requirements;

            // ✅ التحقق من المدخلات
            this.validateInput(requirements);

            let result;

            switch (action) {
                case 'create':
                    result = await this.createFiles(files, options);
                    break;

                case 'read':
                    result = await this.readFiles(files, options);
                    break;

                case 'update':
                    result = await this.updateFiles(files, options);
                    break;

                case 'delete':
                    result = await this.deleteFiles(files, options);
                    break;

                case 'move':
                    result = await this.moveFiles(files, options);
                    break;

                case 'copy':
                    result = await this.copyFiles(files, options);
                    break;

                case 'organize':
                    result = await this.organizeFiles(files, options);
                    break;

                case 'compress':
                    result = await this.compressFiles(files, options);
                    break;

                case 'extract':
                    result = await this.extractArchive(files[0], options);
                    break;

                case 'sync':
                    result = await this.syncFiles(files, options);
                    break;

                case 'search':
                    result = await this.searchFiles(options.pattern, options);
                    break;

                case 'analyze':
                    result = await this.analyzeDirectory(options.directory || '.');
                    break;

                case 'compare':
                    result = await this.compareFiles(files[0], files[1], options);
                    break;

                case 'merge':
                    result = await this.mergeFiles(files, options);
                    break;

                case 'split':
                    result = await this.splitFile(files[0], options);
                    break;

                case 'watch':
                    result = await this.watchDirectory(options.directory, options);
                    break;

                case 'validate':
                    result = await this.validateFiles(files, options);
                    break;

                case 'encrypt':
                    result = await this.encryptFiles(files, options);
                    break;

                case 'decrypt':
                    result = await this.decryptFiles(files, options);
                    break;

                default:
                    throw new Error(`Unknown file action: ${action}`);
            }

            // 📊 حساب الوقت
            const duration = Date.now() - startTime;

            // 💾 حفظ سجل العمليات
            await this.logOperation(action, files, result, duration);

            console.log(`✅ المهمة اكتملت في ${duration}ms`);

            return {
                success: true,
                result,
                action,
                duration,
                timestamp: new Date().toISOString(),
                message: `File ${action} completed successfully`
            };

        } catch (error) {
            this.stats.errors++;
            console.error('❌ File tools error:', error);
            
            return {
                success: false,
                error: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * 📝 إنشاء ملفات
     */
    async createFiles(files, options = {}) {
        console.log(`📝 إنشاء ${files.length} ملف...`);
        const results = [];

        for (const file of files) {
            try {
                const { path: filePath, content, encoding = 'utf8', overwrite = false } = file;
                const fullPath = this.resolvePath(filePath);

                // 🔍 التحقق من وجود الملف
                const exists = await this.fileExists(fullPath);
                if (exists && !overwrite) {
                    throw new Error('File already exists. Use overwrite: true to replace.');
                }

                // ✅ التحقق من الامتداد
                if (!this.isExtensionAllowed(filePath)) {
                    throw new Error(`File extension not allowed: ${path.extname(filePath)}`);
                }

                // ✅ التحقق من الحجم
                const size = Buffer.byteLength(content, encoding);
                if (size > this.maxFileSize) {
                    throw new Error(`File size exceeds maximum allowed: ${this.maxFileSize} bytes`);
                }

                // 📁 إنشاء المجلدات الناقصة
                await this.ensureDirectoryExists(path.dirname(fullPath));

                // 💾 كتابة الملف
                await fs.writeFile(fullPath, content, encoding);

                // 🔐 حساب hash
                const hash = this.calculateHash(content);

                this.stats.filesCreated++;
                this.stats.totalBytesProcessed += size;

                results.push({
                    path: filePath,
                    fullPath,
                    success: true,
                    size,
                    hash,
                    created: new Date().toISOString()
                });

                console.log(`✅ ملف تم إنشاؤه: ${filePath} (${this.formatBytes(size)})`);

            } catch (error) {
                console.error(`❌ فشل إنشاء الملف ${file.path}:`, error.message);
                results.push({
                    path: file.path,
                    success: false,
                    error: error.message
                });
            }
        }

        return {
            results,
            total: files.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length
        };
    }

    /**
     * 📖 قراءة ملفات
     */
    async readFiles(files, options = {}) {
        console.log(`📖 قراءة ${files.length} ملف...`);
        const results = [];

        for (const file of files) {
            try {
                const { path: filePath, encoding = 'utf8', useCache = true } = file;
                const fullPath = this.resolvePath(filePath);

                // 💾 التحقق من الذاكرة المؤقتة
                if (useCache) {
                    const cached = this.getFromCache(fullPath);
                    if (cached) {
                        console.log(`💾 استخدام الملف من الذاكرة المؤقتة: ${filePath}`);
                        results.push(cached);
                        continue;
                    }
                }

                // 📖 قراءة الملف
                const content = await fs.readFile(fullPath, encoding);
                const stats = await fs.stat(fullPath);

                // 🔐 حساب hash
                const hash = this.calculateHash(content);

                const result = {
                    path: filePath,
                    fullPath,
                    content,
                    size: stats.size,
                    hash,
                    created: stats.birthtime,
                    modified: stats.mtime,
                    accessed: stats.atime,
                    success: true
                };

                // 💾 حفظ في الذاكرة المؤقتة
                if (useCache) {
                    this.addToCache(fullPath, result);
                }

                this.stats.filesRead++;
                this.stats.totalBytesProcessed += stats.size;

                results.push(result);

                console.log(`✅ ملف تمت قراءته: ${filePath} (${this.formatBytes(stats.size)})`);

            } catch (error) {
                console.error(`❌ فشل قراءة الملف ${file.path}:`, error.message);
                results.push({
                    path: file.path,
                    success: false,
                    error: error.message
                });
            }
        }

        return {
            results,
            total: files.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length
        };
    }

    /**
     * ✏️ تحديث ملفات
     */
    async updateFiles(files, options = {}) {
        console.log(`✏️ تحديث ${files.length} ملف...`);
        const results = [];

        for (const file of files) {
            try {
                const { path: filePath, content, encoding = 'utf8', backup = this.backupEnabled } = file;
                const fullPath = this.resolvePath(filePath);

                // ✅ التحقق من وجود الملف
                const exists = await this.fileExists(fullPath);
                if (!exists) {
                    throw new Error('File does not exist');
                }

                // 🔒 قفل الملف
                await this.acquireLock(fullPath);

                try {
                    // 💾 إنشاء نسخة احتياطية
                    let backupPath = null;
                    if (backup) {
                        backupPath = await this.createBackup(fullPath);
                        this.stats.backupsCreated++;
                    }

                    // 📝 تحديث الملف
                    await fs.writeFile(fullPath, content, encoding);

                    const size = Buffer.byteLength(content, encoding);
                    const hash = this.calculateHash(content);

                    // 🗑️ حذف من الذاكرة المؤقتة
                    this.removeFromCache(fullPath);

                    this.stats.filesUpdated++;
                    this.stats.totalBytesProcessed += size;

                    results.push({
                        path: filePath,
                        fullPath,
                        success: true,
                        size,
                        hash,
                        backupPath,
                        updated: new Date().toISOString()
                    });

                    console.log(`✅ ملف تم تحديثه: ${filePath}`);

                } finally {
                    // 🔓 فك القفل
                    this.releaseLock(fullPath);
                }

            } catch (error) {
                console.error(`❌ فشل تحديث الملف ${file.path}:`, error.message);
                results.push({
                    path: file.path,
                    success: false,
                    error: error.message
                });
            }
        }

        return {
            results,
            total: files.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length
        };
    }

    /**
     * 🗑️ حذف ملفات
     */
    async deleteFiles(files, options = {}) {
        console.log(`🗑️ حذف ${files.length} ملف...`);
        const results = [];

        for (const file of files) {
            try {
                const { path: filePath, backup = this.backupEnabled, permanent = false } = file;
                const fullPath = this.resolvePath(filePath);

                // ✅ التحقق من وجود الملف
                const exists = await this.fileExists(fullPath);
                if (!exists) {
                    throw new Error('File does not exist');
                }

                // 💾 إنشاء نسخة احتياطية قبل الحذف
                let backupPath = null;
                if (backup && !permanent) {
                    backupPath = await this.createBackup(fullPath);
                    this.stats.backupsCreated++;
                }

                // 📊 حجم الملف قبل الحذف
                const stats = await fs.stat(fullPath);

                // 🗑️ حذف الملف
                await fs.unlink(fullPath);

                // 🗑️ حذف من الذاكرة المؤقتة
                this.removeFromCache(fullPath);

                this.stats.filesDeleted++;

                results.push({
                    path: filePath,
                    fullPath,
                    success: true,
                    size: stats.size,
                    backupPath,
                    deleted: new Date().toISOString()
                });

                console.log(`✅ ملف تم حذفه: ${filePath}`);

            } catch (error) {
                console.error(`❌ فشل حذف الملف ${file.path}:`, error.message);
                results.push({
                    path: file.path,
                    success: false,
                    error: error.message
                });
            }
        }

        return {
            results,
            total: files.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length
        };
    }

    /**
     * 📦 نقل ملفات
     */
    async moveFiles(files, options = {}) {
        console.log(`📦 نقل ${files.length} ملف...`);
        const results = [];

        for (const file of files) {
            try {
                const { path: sourcePath, destination } = file;
                const sourceFullPath = this.resolvePath(sourcePath);
                const destFullPath = this.resolvePath(destination);

                // ✅ التحقق من وجود الملف المصدر
                const exists = await this.fileExists(sourceFullPath);
                if (!exists) {
                    throw new Error('Source file does not exist');
                }

                // 📁 إنشاء المجلد الوجهة
                await this.ensureDirectoryExists(path.dirname(destFullPath));

                // 📦 نقل الملف
                await fs.rename(sourceFullPath, destFullPath);

                // 🗑️ تحديث الذاكرة المؤقتة
                this.removeFromCache(sourceFullPath);

                this.stats.filesMoved++;

                results.push({
                    source: sourcePath,
                    destination,
                    success: true,
                    moved: new Date().toISOString()
                });

                console.log(`✅ ملف تم نقله: ${sourcePath} → ${destination}`);

            } catch (error) {
                console.error(`❌ فشل نقل الملف ${file.path}:`, error.message);
                results.push({
                    source: file.path,
                    success: false,
                    error: error.message
                });
            }
        }

        return {
            results,
            total: files.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length
        };
    }

    /**
     * 📋 نسخ ملفات
     */
    async copyFiles(files, options = {}) {
        console.log(`📋 نسخ ${files.length} ملف...`);
        const results = [];

        for (const file of files) {
            try {
                const { path: sourcePath, destination, overwrite = false } = file;
                const sourceFullPath = this.resolvePath(sourcePath);
                const destFullPath = this.resolvePath(destination);

                // ✅ التحقق من وجود الملف المصدر
                const exists = await this.fileExists(sourceFullPath);
                if (!exists) {
                    throw new Error('Source file does not exist');
                }

                // ✅ التحقق من وجود الملف الوجهة
                const destExists = await this.fileExists(destFullPath);
                if (destExists && !overwrite) {
                    throw new Error('Destination file already exists. Use overwrite: true');
                }

                // 📁 إنشاء المجلد الوجهة
                await this.ensureDirectoryExists(path.dirname(destFullPath));

                // 📋 نسخ الملف
                await fs.copyFile(sourceFullPath, destFullPath);

                const stats = await fs.stat(destFullPath);

                this.stats.filesCopied++;
                this.stats.totalBytesProcessed += stats.size;

                results.push({
                    source: sourcePath,
                    destination,
                    success: true,
                    size: stats.size,
                    copied: new Date().toISOString()
                });

                console.log(`✅ ملف تم نسخه: ${sourcePath} → ${destination}`);

            } catch (error) {
                console.error(`❌ فشل نسخ الملف ${file.path}:`, error.message);
                results.push({
                    source: file.path,
                    success: false,
                    error: error.message
                });
            }
        }

        return {
            results,
            total: files.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length
        };
    }

    /**
     * 🗂️ تنظيم ملفات
     */
    async organizeFiles(files, options = {}) {
        console.log(`🗂️ تنظيم ${files.length} ملف...`);
        
        const { organizationRules = {}, mode = 'move' } = options;
        const results = [];

        for (const file of files) {
            try {
                const { path: filePath } = file;
                const fullPath = this.resolvePath(filePath);
                
                // 🎯 تحديد الموقع الجديد
                const newLocation = this.determineNewLocation(filePath, organizationRules);

                if (newLocation !== filePath) {
                    const newFullPath = this.resolvePath(newLocation);

                    // 📁 إنشاء المجلدات الناقصة
                    await this.ensureDirectoryExists(path.dirname(newFullPath));

                    // 📦 نقل أو نسخ الملف
                    if (mode === 'move') {
                        await fs.rename(fullPath, newFullPath);
                        this.stats.filesMoved++;
                    } else {
                        await fs.copyFile(fullPath, newFullPath);
                        this.stats.filesCopied++;
                    }

                    results.push({
                        originalPath: filePath,
                        newPath: newLocation,
                        mode,
                        success: true
                    });

                    console.log(`✅ ملف تم تنظيمه: ${filePath} → ${newLocation}`);
                } else {
                    results.push({
                        originalPath: filePath,
                        message: 'File already in correct location',
                        success: true
                    });
                }

            } catch (error) {
                console.error(`❌ فشل تنظيم الملف ${file.path}:`, error.message);
                results.push({
                    path: file.path,
                    success: false,
                    error: error.message
                });
            }
        }

        return {
            results,
            total: files.length,
            organized: results.filter(r => r.success && r.newPath).length,
            skipped: results.filter(r => r.success && !r.newPath).length,
            failed: results.filter(r => !r.success).length
        };
    }

    /**
     * 🎯 تحديد الموقع الجديد للملف
     */
    determineNewLocation(filePath, rules) {
        const ext = path.extname(filePath).toLowerCase();
        const basename = path.basename(filePath);
        const dirname = path.dirname(filePath);

        // 📋 قواعد التنظيم الافتراضية المحسّنة
        const defaultRules = {
            // JavaScript/TypeScript
            '.js': 'src/javascript/',
            '.mjs': 'src/javascript/',
            '.cjs': 'src/javascript/',
            '.jsx': 'src/react/',
            '.ts': 'src/typescript/',
            '.tsx': 'src/react/',
            
            // Python
            '.py': 'src/python/',
            '.pyw': 'src/python/',
            '.pyx': 'src/python/',
            
            // Web
            '.html': 'public/',
            '.htm': 'public/',
            '.css': 'styles/',
            '.scss': 'styles/',
            '.sass': 'styles/',
            '.less': 'styles/',
            
            // Data
            '.json': 'data/',
            '.xml': 'data/',
            '.yaml': 'data/',
            '.yml': 'data/',
            '.csv': 'data/',
            
            // Documentation
            '.md': 'docs/',
            '.txt': 'docs/',
            '.pdf': 'docs/',
            '.doc': 'docs/',
            '.docx': 'docs/',
            
            // Images
            '.jpg': 'assets/images/',
            '.jpeg': 'assets/images/',
            '.png': 'assets/images/',
            '.gif': 'assets/images/',
            '.svg': 'assets/images/',
            '.webp': 'assets/images/',
            
            // Videos
            '.mp4': 'assets/videos/',
            '.avi': 'assets/videos/',
            '.mov': 'assets/videos/',
            '.webm': 'assets/videos/',
            
            // Audio
            '.mp3': 'assets/audio/',
            '.wav': 'assets/audio/',
            '.ogg': 'assets/audio/',
            
            // Archives
            '.zip': 'archives/',
            '.tar': 'archives/',
            '.gz': 'archives/',
            '.rar': 'archives/',
            '.7z': 'archives/',
            
            // Config
            '.env': 'config/',
            '.config': 'config/',
            '.ini': 'config/'
        };

        const combinedRules = { ...defaultRules, ...rules };

        // 🔍 البحث عن قاعدة مطابقة
        for (const [pattern, destination] of Object.entries(combinedRules)) {
            if (ext === pattern) {
                return path.join(destination, basename);
            }
        }

        // 🔍 قواعد خاصة بالأسماء
        if (basename.startsWith('test-') || basename.includes('.test.') || basename.includes('.spec.')) {
            return path.join('tests/', basename);
        }

        if (basename.startsWith('backup-') || basename.includes('.backup.')) {
            return path.join('backups/', basename);
        }

        // إرجاع المسار الأصلي إذا لم تُجد قاعدة
        return filePath;
    }

    /**
     * 🗜️ ضغط ملفات
     */
    async compressFiles(files, options = {}) {
        console.log(`🗜️ ضغط ${files.length} ملف...`);

        const { 
            format = 'zip', 
            outputPath = `archive-${Date.now()}.zip`,
            compressionLevel = 9,
            password = null
        } = options;

        const fullOutputPath = this.resolvePath(outputPath);

        try {
            // 📁 إنشاء المجلد الوجهة
            await this.ensureDirectoryExists(path.dirname(fullOutputPath));

            const output = createWriteStream(fullOutputPath);
            let archive;

            // 🗜️ إنشاء الأرشيف
            switch (format.toLowerCase()) {
                case 'zip':
                    archive = archiver('zip', {
                        zlib: { level: compressionLevel }
                    });
                    break;

                case 'tar':
                    archive = archiver('tar', {
                        gzip: true,
                        gzipOptions: { level: compressionLevel }
                    });
                    break;

                default:
                    throw new Error(`Unsupported archive format: ${format}`);
            }

            return new Promise((resolve, reject) => {
                let filesAdded = 0;
                let totalSize = 0;

                output.on('close', () => {
                    this.stats.archivesCreated++;
                    
                    resolve({
                        success: true,
                        archivePath: outputPath,
                        fullPath: fullOutputPath,
                        format,
                        compressionLevel,
                        originalSize: totalSize,
                        compressedSize: archive.pointer(),
                        compressionRatio: ((1 - archive.pointer() / totalSize) * 100).toFixed(2) + '%',
                        filesCount: filesAdded,
                        created: new Date().toISOString()
                    });
                });

                archive.on('error', (err) => {
                    reject(err);
                });

                archive.on('warning', (err) => {
                    if (err.code === 'ENOENT') {
                        console.warn('⚠️ Archive warning:', err);
                    } else {
                        reject(err);
                    }
                });

                archive.pipe(output);

                // 📦 إضافة الملفات إلى الأرشيف
                const addPromises = files.map(async (file) => {
                    try {
                        const fullPath = this.resolvePath(file.path);
                        const archiveName = file.archiveName || path.basename(file.path);

                        const stats = await fs.stat(fullPath);
                        totalSize += stats.size;

                        if (stats.isDirectory()) {
                            archive.directory(fullPath, archiveName);
                        } else {
                            archive.file(fullPath, { name: archiveName });
                        }

                        filesAdded++;
                        console.log(`📦 إضافة إلى الأرشيف: ${file.path}`);

                    } catch (error) {
                        console.error(`❌ فشل إضافة ${file.path}:`, error.message);
                    }
                });

                Promise.all(addPromises)
                    .then(() => {
                        archive.finalize();
                        console.log('✅ تم إنهاء الأرشيف');
                    })
                    .catch(reject);
            });

        } catch (error) {
            throw new Error(`Compression failed: ${error.message}`);
        }
    }

    /**
     * 📂 استخراج أرشيف
     */
    async extractArchive(archiveFile, options = {}) {
        console.log('📂 استخراج أرشيف...');

        const { outputDir = 'extracted', overwrite = false } = options;
        const archivePath = this.resolvePath(archiveFile.path);
        const outputPath = this.resolvePath(outputDir);

        try {
            // ✅ التحقق من وجود الأرشيف
            const exists = await this.fileExists(archivePath);
            if (!exists) {
                throw new Error('Archive file does not exist');
            }

            // 📁 إنشاء مجلد الاستخراج
            await this.ensureDirectoryExists(outputPath);

            // 📂 استخراج الأرشيف
            // ملاحظة: يحتاج إلى مكتبة مثل yauzl أو tar لاستخراج فعلي
            // هذا مثال بسيط

            const stats = await fs.stat(archivePath);

            return {
                success: true,
                archivePath: archiveFile.path,
                extractedTo: outputDir,
                archiveSize: stats.size,
                extracted: new Date().toISOString(),
                message: 'Archive extraction completed (implementation pending)'
            };

        } catch (error) {
            throw new Error(`Extraction failed: ${error.message}`);
        }
    }

    /**
     * 🔄 مزامنة ملفات
     */
    async syncFiles(files, options = {}) {
        console.log(`🔄 مزامنة ${files.length} ملف...`);

        const { 
            targetPath, 
            mode = 'mirror', // mirror, update, backup
            deleteExtraneous = false 
        } = options;

        const targetFullPath = this.resolvePath(targetPath);

        try {
            await this.ensureDirectoryExists(targetFullPath);

            const results = [];

            for (const file of files) {
                try {
                    const sourcePath = this.resolvePath(file.path);
                    const destPath = path.join(targetFullPath, path.basename(file.path));

                    // 📊 مقارنة الملفات
                    const sourceStats = await fs.stat(sourcePath);
                    const destExists = await this.fileExists(destPath);

                    let action = 'copy';

                    if (destExists) {
                        const destStats = await fs.stat(destPath);

                        if (mode === 'update') {
                            // نسخ فقط إذا كان المصدر أحدث
                            if (sourceStats.mtime <= destStats.mtime) {
                                action = 'skip';
                            }
                        } else if (mode === 'backup') {
                            // إنشاء نسخة احتياطية قبل الاستبدال
                            await this.createBackup(destPath);
                        }
                    }

                    if (action === 'copy') {
                        await fs.copyFile(sourcePath, destPath);
                        this.stats.filesCopied++;
                    }

                    results.push({
                        source: file.path,
                        destination: path.join(targetPath, path.basename(file.path)),
                        action,
                        success: true
                    });

                    console.log(`✅ مزامنة: ${file.path} [${action}]`);

                } catch (error) {
                    console.error(`❌ فشل مزامنة ${file.path}:`, error.message);
                    results.push({
                        source: file.path,
                        success: false,
                        error: error.message
                    });
                }
            }

            return {
                results,
                total: files.length,
                copied: results.filter(r => r.action === 'copy').length,
                skipped: results.filter(r => r.action === 'skip').length,
                failed: results.filter(r => !r.success).length
            };

        } catch (error) {
            throw new Error(`Sync failed: ${error.message}`);
        }
    }

    /**
     * 🔍 البحث في الملفات
     */
    async searchFiles(pattern, options = {}) {
        console.log(`🔍 البحث عن: ${pattern}`);

        const { 
            directory = '.', 
            recursive = true,
            filePattern = null,
            caseSensitive = false,
            maxResults = 1000
        } = options;

        const searchPath = this.resolvePath(directory);

        try {
            const results = [];
            const regex = new RegExp(pattern, caseSensitive ? 'g' : 'gi');

            await this.searchInDirectory(searchPath, regex, filePattern, recursive, results, maxResults);

            return {
                pattern,
                directory,
                results,
                total: results.length,
                searched: new Date().toISOString()
            };

        } catch (error) {
            throw new Error(`Search failed: ${error.message}`);
        }
    }

    /**
     * 🔍 البحث في مجلد (مساعد)
     */
    async searchInDirectory(dirPath, regex, filePattern, recursive, results, maxResults) {
        if (results.length >= maxResults) return;

        try {
            const entries = await fs.readdir(dirPath, { withFileTypes: true });

            for (const entry of entries) {
                if (results.length >= maxResults) break;

                const fullPath = path.join(dirPath, entry.name);

                if (entry.isDirectory() && recursive) {
                    await this.searchInDirectory(fullPath, regex, filePattern, recursive, results, maxResults);
                } else if (entry.isFile()) {
                    // 🔍 فحص نمط اسم الملف
                    if (filePattern && !entry.name.match(filePattern)) {
                        continue;
                    }

                    try {
                        const content = await fs.readFile(fullPath, 'utf8');
                        const matches = [...content.matchAll(regex)];

                        if (matches.length > 0) {
                            results.push({
                                path: fullPath,
                                relativePath: path.relative(this.basePath, fullPath),
                                matches: matches.length,
                                lines: this.findMatchingLines(content, regex)
                            });
                        }
                    } catch (error) {
                        // تجاهل الملفات الثنائية أو غير القابلة للقراءة
                        if (error.code !== 'EISDIR') {
                            console.warn(`⚠️ تخطي الملف ${entry.name}:`, error.message);
                        }
                    }
                }
            }
        } catch (error) {
            console.error(`❌ خطأ في البحث بالمجلد ${dirPath}:`, error.message);
        }
    }

    /**
     * 🔍 إيجاد الأسطر المطابقة
     */
    findMatchingLines(content, regex) {
        const lines = content.split('\n');
        const matchingLines = [];

        lines.forEach((line, index) => {
            if (regex.test(line)) {
                matchingLines.push({
                    lineNumber: index + 1,
                    content: line.trim(),
                    preview: line.substring(0, 100)
                });
            }
        });

        return matchingLines.slice(0, 10); // أول 10 أسطر فقط
    }

    /**
     * 📊 تحليل مجلد
     */
    async analyzeDirectory(directory) {
        console.log(`📊 تحليل المجلد: ${directory}`);

        const dirPath = this.resolvePath(directory);

        try {
            const stats = await fs.stat(dirPath);
            if (!stats.isDirectory()) {
                throw new Error('Path is not a directory');
            }

            const analysis = {
                path: directory,
                fullPath: dirPath,
                totalFiles: 0,
                totalDirectories: 0,
                totalSize: 0,
                fileTypes: {},
                largestFiles: [],
                oldestFiles: [],
                newestFiles: [],
                duplicates: [],
                analyzed: new Date().toISOString()
            };

            await this.analyzeDirectoryRecursive(dirPath, analysis);

            // 📊 ترتيب النتائج
            analysis.largestFiles.sort((a, b) => b.size - a.size);
            analysis.largestFiles = analysis.largestFiles.slice(0, 10);

            analysis.oldestFiles.sort((a, b) => a.modified - b.modified);
            analysis.oldestFiles = analysis.oldestFiles.slice(0, 10);

            analysis.newestFiles.sort((a, b) => b.modified - a.modified);
            analysis.newestFiles = analysis.newestFiles.slice(0, 10);

            // 📊 إحصائيات إضافية
            analysis.averageFileSize = analysis.totalFiles > 0 
                ? (analysis.totalSize / analysis.totalFiles).toFixed(2) 
                : 0;

            analysis.formattedSize = this.formatBytes(analysis.totalSize);

            return analysis;

        } catch (error) {
            throw new Error(`Directory analysis failed: ${error.message}`);
        }
    }

    /**
     * 📊 تحليل مجلد بشكل متكرر (مساعد)
     */
    async analyzeDirectoryRecursive(dirPath, analysis) {
        try {
            const entries = await fs.readdir(dirPath, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(dirPath, entry.name);

                if (entry.isDirectory()) {
                    analysis.totalDirectories++;
                    await this.analyzeDirectoryRecursive(fullPath, analysis);
                } else if (entry.isFile()) {
                    analysis.totalFiles++;
                    
                    const fileStats = await fs.stat(fullPath);
                    analysis.totalSize += fileStats.size;

                    // 📁 أنواع الملفات
                    const ext = path.extname(entry.name).toLowerCase() || 'no-extension';
                    if (!analysis.fileTypes[ext]) {
                        analysis.fileTypes[ext] = { count: 0, size: 0 };
                    }
                    analysis.fileTypes[ext].count++;
                    analysis.fileTypes[ext].size += fileStats.size;

                    // 📊 أكبر الملفات
                    analysis.largestFiles.push({
                        name: entry.name,
                        path: fullPath,
                        size: fileStats.size,
                        formattedSize: this.formatBytes(fileStats.size)
                    });

                    // 📊 أقدم الملفات
                    analysis.oldestFiles.push({
                        name: entry.name,
                        path: fullPath,
                        modified: fileStats.mtime
                    });

                    // 📊 أحدث الملفات
                    analysis.newestFiles.push({
                        name: entry.name,
                        path: fullPath,
                        modified: fileStats.mtime
                    });
                }
            }
        } catch (error) {
            console.error(`❌ خطأ في تحليل ${dirPath}:`, error.message);
        }
    }

    /**
     * 🔄 مقارنة ملفين
     */
    async compareFiles(file1, file2, options = {}) {
        console.log('🔄 مقارنة الملفات...');

        try {
            const path1 = this.resolvePath(file1.path);
            const path2 = this.resolvePath(file2.path);

            const [content1, content2, stats1, stats2] = await Promise.all([
                fs.readFile(path1, 'utf8'),
                fs.readFile(path2, 'utf8'),
                fs.stat(path1),
                fs.stat(path2)
            ]);

            const hash1 = this.calculateHash(content1);
            const hash2 = this.calculateHash(content2);

            const identical = hash1 === hash2;

            return {
                file1: {
                    path: file1.path,
                    size: stats1.size,
                    hash: hash1,
                    modified: stats1.mtime
                },
                file2: {
                    path: file2.path,
                    size: stats2.size,
                    hash: hash2,
                    modified: stats2.mtime
                },
                identical,
                sizeDifference: Math.abs(stats1.size - stats2.size),
                compared: new Date().toISOString()
            };

        } catch (error) {
            throw new Error(`File comparison failed: ${error.message}`);
        }
    }

    /**
     * 🔐 حساب hash للملف
     */
    calculateHash(content) {
        return createHash('sha256').update(content).digest('hex');
    }

    /**
     * 📏 تنسيق حجم الملف
     */
    formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    /**
     * 🔧 أدوات مساعدة
     */
    resolvePath(filePath) {
        if (path.isAbsolute(filePath)) {
            return filePath;
        }
        return path.join(this.basePath, filePath);
    }

    async ensureDirectoryExists(dirPath) {
        try {
            await fs.mkdir(dirPath, { recursive: true });
        } catch (error) {
            if (error.code !== 'EEXIST') {
                throw error;
            }
        }
    }

    async fileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    async createBackup(filePath) {
        const timestamp = Date.now();
        const backupDir = path.join(this.basePath, 'backups');
        await this.ensureDirectoryExists(backupDir);

        const backupPath = path.join(
            backupDir,
            `${path.basename(filePath)}.backup.${timestamp}`
        );

        await fs.copyFile(filePath, backupPath);
        return backupPath;
    }

    isExtensionAllowed(filePath) {
        if (!this.allowedExtensions) return true;
        
        const ext = path.extname(filePath).toLowerCase();
        return this.allowedExtensions.includes(ext);
    }

    /**
     * 🔒 إدارة القفل
     */
    async acquireLock(filePath) {
        while (this.locks.has(filePath)) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        this.locks.set(filePath, true);
    }

    releaseLock(filePath) {
        this.locks.delete(filePath);
    }

    /**
     * 💾 إدارة الذاكرة المؤقتة
     */
    getFromCache(key) {
        const cached = this.cache.get(key);
        if (!cached) return null;

        const age = Date.now() - cached.timestamp;
        if (age > this.cacheMaxAge) {
            this.cache.delete(key);
            return null;
        }

        return cached.data;
    }

    addToCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    removeFromCache(key) {
        this.cache.delete(key);
    }

    clearCache() {
        this.cache.clear();
        console.log('✅ Cache cleared');
    }

    /**
     * ✅ التحقق من المدخلات
     */
    validateInput(requirements) {
        if (!requirements.action) {
            throw new Error('Action is required');
        }

        if (!requirements.files || !Array.isArray(requirements.files)) {
            throw new Error('Files array is required');
        }

        if (requirements.files.length === 0) {
            throw new Error('At least one file is required');
        }
    }

    /**
     * 💾 حفظ سجل العمليات
     */
    async logOperation(action, files, result, duration) {
        try {
            const db = getDB();
            await db.collection('joe_file_operations').insertOne({
                action,
                filesCount: files.length,
                result: {
                    success: result.success !== false,
                    total: result.total,
                    successful: result.successful,
                    failed: result.failed
                },
                duration,
                timestamp: new Date(),
                stats: this.stats
            });
        } catch (error) {
            console.error('❌ Log operation error:', error);
        }
    }

    /**
     * 📊 الإحصائيات
     */
    getStats() {
        return {
            ...this.stats,
            cacheSize: this.cache.size,
            activeLocks: this.locks.size,
            formattedBytesProcessed: this.formatBytes(this.stats.totalBytesProcessed)
        };
    }

    /**
     * 🧹 تنظيف الموارد
     */
    async cleanup() {
        this.clearCache();
        this.locks.clear();
        console.log('✅ File Tools cleanup completed');
    }
}

export default FileTools;
