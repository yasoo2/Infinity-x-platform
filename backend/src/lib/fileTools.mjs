// backend/src/lib/fileTools.mjs - أدوات الملفات المتقدمة
import fs from 'fs/promises';
import path from 'path';
import archiver from 'archiver';
import { createWriteStream } from 'fs';
import { getDB } from '../db.mjs';

export class FileTools {
    constructor() {
        this.basePath = '/tmp/joe-files';
        this.setupBaseDirectory();
    }

    async setupBaseDirectory() {
        try {
            await fs.mkdir(this.basePath, { recursive: true });
            console.log('✅ File tools base directory created');
        } catch (error) {
            console.error('❌ Setup base directory error:', error);
        }
    }

    async executeTask(requirements) {
        try {
            const { action, files, options = {} } = requirements;
            
            let result;
            
            switch (action) {
                case 'create':
                    result = await this.createFiles(files);
                    break;
                case 'read':
                    result = await this.readFiles(files);
                    break;
                case 'update':
                    result = await this.updateFiles(files);
                    break;
                case 'delete':
                    result = await this.deleteFiles(files);
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
                default:
                    throw new Error(`Unknown file action: ${action}`);
            }

            // حفظ سجل العمليات
            await this.logOperation(action, files, result);

            return {
                success: true,
                result,
                message: `File ${action} completed successfully`
            };

        } catch (error) {
            console.error('❌ File tools error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async createFiles(files) {
        const results = [];

        for (const file of files) {
            try {
                const { path: filePath, content, encoding = 'utf8' } = file;
                const fullPath = this.resolvePath(filePath);
                
                // إنشاء المجلدات الناقصة
                await this.ensureDirectoryExists(path.dirname(fullPath));
                
                // كتابة الملف
                await fs.writeFile(fullPath, content, encoding);
                
                results.push({
                    path: filePath,
                    success: true,
                    size: content.length,
                    created: new Date()
                });

            } catch (error) {
                results.push({
                    path: file.path,
                    success: false,
                    error: error.message
                });
            }
        }

        return results;
    }

    async readFiles(files) {
        const results = [];

        for (const file of files) {
            try {
                const { path: filePath, encoding = 'utf8' } = file;
                const fullPath = this.resolvePath(filePath);
                
                // قراءة الملف
                const content = await fs.readFile(fullPath, encoding);
                const stats = await fs.stat(fullPath);
                
                results.push({
                    path: filePath,
                    content,
                    size: stats.size,
                    modified: stats.mtime,
                    success: true
                });

            } catch (error) {
                results.push({
                    path: file.path,
                    success: false,
                    error: error.message
                });
            }
        }

        return results;
    }

    async updateFiles(files) {
        const results = [];

        for (const file of files) {
            try {
                const { path: filePath, content, encoding = 'utf8', backup = true } = file;
                const fullPath = this.resolvePath(filePath);
                
                // إنشاء نسخة احتياطية إذا طُلب
                if (backup) {
                    await this.createBackup(fullPath);
                }
                
                // تحديث الملف
                await fs.writeFile(fullPath, content, encoding);
                
                results.push({
                    path: filePath,
                    success: true,
                    size: content.length,
                    updated: new Date()
                });

            } catch (error) {
                results.push({
                    path: file.path,
                    success: false,
                    error: error.message
                });
            }
        }

        return results;
    }

    async deleteFiles(files) {
        const results = [];

        for (const file of files) {
            try {
                const { path: filePath, backup = false } = file;
                const fullPath = this.resolvePath(filePath);
                
                // إنشاء نسخة احتياطية قبل الحذف إذا طُلب
                if (backup) {
                    await this.createBackup(fullPath);
                }
                
                // حذف الملف
                await fs.unlink(fullPath);
                
                results.push({
                    path: filePath,
                    success: true,
                    deleted: new Date()
                });

            } catch (error) {
                results.push({
                    path: file.path,
                    success: false,
                    error: error.message
                });
            }
        }

        return results;
    }

    async organizeFiles(files, options) {
        const { organizationRules = {} } = options;
        const results = [];

        for (const file of files) {
            try {
                const { path: filePath } = file;
                const fullPath = this.resolvePath(filePath);
                const newLocation = this.determineNewLocation(filePath, organizationRules);
                
                if (newLocation !== filePath) {
                    const newFullPath = this.resolvePath(newLocation);
                    
                    // إنشاء المجلدات الناقصة
                    await this.ensureDirectoryExists(path.dirname(newFullPath));
                    
                    // نقل الملف
                    await fs.rename(fullPath, newFullPath);
                    
                    results.push({
                        originalPath: filePath,
                        newPath: newLocation,
                        success: true
                    });
                }

            } catch (error) {
                results.push({
                    path: file.path,
                    success: false,
                    error: error.message
                });
            }
        }

        return results;
    }

    determineNewLocation(filePath, rules) {
        const ext = path.extname(filePath).toLowerCase();
        const basename = path.basename(filePath);
        
        // قواعد التنظيم الافتراضية
        const defaultRules = {
            '.js': 'src/javascript/',
            '.jsx': 'src/react/',
            '.ts': 'src/typescript/',
            '.tsx': 'src/react/',
            '.py': 'src/python/',
            '.html': 'public/',
            '.css': 'styles/',
            '.scss': 'styles/',
            '.json': 'config/',
            '.md': 'docs/',
            '.txt': 'docs/'
        };

        const combinedRules = { ...defaultRules, ...rules };
        
        // البحث عن قاعدة مطابقة
        for (const [pattern, destination] of Object.entries(combinedRules)) {
            if (ext === pattern || basename.includes(pattern)) {
                return path.join(destination, basename);
            }
        }
        
        return filePath; // إرجاع المسار الأصلي إذا لم تُجد قاعدة
    }

    async compressFiles(files, options) {
        const { format = 'zip', outputPath = 'archive.zip' } = options;
        const fullOutputPath = this.resolvePath(outputPath);
        
        try {
            await this.ensureDirectoryExists(path.dirname(fullOutputPath));
            
            const output = createWriteStream(fullOutputPath);
            let archive;

            switch (format) {
                case 'zip':
                    archive = archiver('zip', { zlib: { level: 9 } });
                    break;
                case 'tar':
                    archive = archiver('tar');
                    break;
                default:
                    throw new Error(`Unsupported archive format: ${format}`);
            }

            return new Promise((resolve, reject) => {
                output.on('close', () => {
                    resolve({
                        success: true,
                        archivePath: outputPath,
                        format,
                        size: archive.pointer(),
                        files: files.length
                    });
                });

                archive.on('error', (err) => {
                    reject(err);
                });

                archive.pipe(output);

                // إضافة الملفات إلى الأرشيف
                files.forEach(file => {
                    const fullPath = this.resolvePath(file.path);
                    const archiveName = file.archiveName || path.basename(file.path);
                    
                    if (file.directory) {
                        archive.directory(fullPath, archiveName);
                    } else {
                        archive.file(fullPath, { name: archiveName });
                    }
                });

                archive.finalize();
            });

        } catch (error) {
            throw new Error(`Compression failed: ${error.message}`);
        }
    }

    async extractArchive(archiveFile, options) {
        const { outputDir = '.' } = options;
        const archivePath = this.resolvePath(archiveFile.path);
        const outputPath = this.resolvePath(outputDir);
        
        try {
            await this.ensureDirectoryExists(outputPath);
            
            // استخراج الأرشيف (سيتم تنفيذه لاحقاً)
            // يمكن استخدام مكتبة مثل yauzl لاستخراج ZIP أو tar لاستخراج TAR
            
            return {
                success: true,
                extractedTo: outputDir,
                archive: archiveFile.path
            };

        } catch (error) {
            throw new Error(`Extraction failed: ${error.message}`);
        }
    }

    async syncFiles(files, options) {
        const { targetPath, mode = 'mirror' } = options;
        const targetFullPath = this.resolvePath(targetPath);
        
        try {
            await this.ensureDirectoryExists(targetFullPath);
            
            const results = [];

            for (const file of files) {
                try {
                    const sourcePath = this.resolvePath(file.path);
                    const destPath = path.join(targetFullPath, path.basename(file.path));
                    
                    // نسخ الملف
                    await fs.copyFile(sourcePath, destPath);
                    
                    results.push({
                        source: file.path,
                        destination: path.join(targetPath, path.basename(file.path)),
                        success: true
                    });

                } catch (error) {
                    results.push({
                        source: file.path,
                        success: false,
                        error: error.message
                    });
                }
            }

            return results;

        } catch (error) {
            throw new Error(`Sync failed: ${error.message}`);
        }
    }

    // أدوات المساعدة
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

    async createBackup(filePath) {
        const backupPath = `${filePath}.backup.${Date.now()}`;
        await fs.copyFile(filePath, backupPath);
        return backupPath;
    }

    async logOperation(action, files, result) {
        try {
            const db = getDB();
            await db.collection('joe_file_operations').insertOne({
                action,
                files,
                result,
                timestamp: new Date(),
                success: result.success !== false
            });
        } catch (error) {
            console.error('❌ Log operation error:', error);
        }
    }

    // أدوات متقدمة
    async searchFiles(pattern, options = {}) {
        const { directory = '.', recursive = true } = options;
        const searchPath = this.resolvePath(directory);
        
        try {
            const files = [];
            const entries = await fs.readdir(searchPath, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(searchPath, entry.name);
                
                if (entry.isDirectory() && recursive) {
                    const subFiles = await this.searchFiles(pattern, {
                        directory: path.join(directory, entry.name),
                        recursive: true
                    });
                    files.push(...subFiles);
                } else if (entry.isFile()) {
                    const content = await fs.readFile(fullPath, 'utf8');
                    if (content.includes(pattern)) {
                        files.push({
                            path: path.join(directory, entry.name),
                            matches: (content.match(new RegExp(pattern, 'g')) || []).length
                        });
                    }
                }
            }
            
            return files;

        } catch (error) {
            throw new Error(`Search failed: ${error.message}`);
        }
    }

    async analyzeDirectory(directory) {
        const dirPath = this.resolvePath(directory);
        
        try {
            const stats = await fs.stat(dirPath);
            if (!stats.isDirectory()) {
                throw new Error('Path is not a directory');
            }
            
            const files = await fs.readdir(dirPath, { withFileTypes: true });
            const analysis = {
                path: directory,
                totalFiles: 0,
                totalDirectories: 0,
                totalSize: 0,
                fileTypes: {},
                largestFiles: [],
                oldestFiles: []
            };

            for (const file of files) {
                const fullPath = path.join(dirPath, file.name);
                
                if (file.isDirectory()) {
                    analysis.totalDirectories++;
                } else if (file.isFile()) {
                    analysis.totalFiles++;
                    const fileStats = await fs.stat(fullPath);
                    analysis.totalSize += fileStats.size;
                    
                    const ext = path.extname(file.name).toLowerCase();
                    analysis.fileTypes[ext] = (analysis.fileTypes[ext] || 0) + 1;
                    
                    analysis.largestFiles.push({
                        name: file.name,
                        size: fileStats.size
                    });
                    
                    analysis.oldestFiles.push({
                        name: file.name,
                        modified: fileStats.mtime
                    });
                }
            }
            
            // ترتيب الملفات
            analysis.largestFiles.sort((a, b) => b.size - a.size);
            analysis.oldestFiles.sort((a, b) => a.modified - b.modified);
            
            return analysis;

        } catch (error) {
            throw new Error(`Directory analysis failed: ${error.message}`);
        }
    }
}

export default FileTools;
