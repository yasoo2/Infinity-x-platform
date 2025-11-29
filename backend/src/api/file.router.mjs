
import express from 'express';
import multer from 'multer';
import path from 'path';
import os from 'os';
import axios from 'axios';
import { promises as fs } from 'fs';
import cheerio from 'cheerio';
import GitHubTools from '../tools_refactored/githubTools.mjs';

// This factory function receives the instantiated file service.
const fileRouterFactory = ({ requireRole, fileProcessingService }) => {
    const router = express.Router();

    // Check if the service is available
    const isServiceAvailable = (req, res, next) => {
        if (!fileProcessingService) {
            return res.status(503).json({ success: false, error: 'SERVICE_UNAVAILABLE', message: 'File Processing service is not configured.' });
        }
        next();
    };

    // Configure Multer for temporary disk storage
    const upload = multer({
        dest: path.join(os.tmpdir(), 'infinity-uploads'),
    });

    router.use(isServiceAvailable);

    /**
     * @route POST /api/v1/file/upload
     * @description Uploads a file for processing and knowledge extraction.
     * @access USER
     */
    router.post('/upload', requireRole('USER'), upload.array('files'), async (req, res) => {
        try {
            const files = req.files;
            if (!files || files.length === 0) {
                return res.status(400).json({ success: false, error: 'No files were uploaded.' });
            }

            const userId = req.user._id;
            const results = [];
            for (const f of files) {
                try {
                    const r = await fileProcessingService.processUploadedFile({ file: f, userId });
                    results.push({ success: true, ...r });
                } catch (e) {
                    results.push({ success: false, error: e.message, fileName: f?.originalname });
                }
            }

            res.json({ success: true, count: results.length, results });

        } catch (error) {
            console.error('❌ File upload router error:', error);
            res.status(500).json({ success: false, error: 'File upload failed', details: error.message });
        }
    });

    /**
     * @route POST /api/v1/file/fetch-url
     * @description Downloads content from a URL. If HTML and deep=true, crawls linked resources up to maxDepth.
     *              If GitHub repo URL, clones the repo to workspace. Saves files to tmp and delegates processing.
     * @access USER
     */
    router.post('/fetch-url', requireRole('USER'), async (req, res) => {
        const { url, deep = true, maxDepth = 4, maxItems = 20000, token, branch = 'main' } = req.body || {};
        if (!url || typeof url !== 'string') {
            return res.status(400).json({ success: false, error: 'INVALID_URL' });
        }
        try {
            const userId = req.user?._id;
            const tmpBase = path.join(os.tmpdir(), 'infinity-uploads');
            await fs.mkdir(tmpBase, { recursive: true });

            const saved = [];
            const visited = new Set();
            let count = 0;

            const saveStream = async (link, depth = 0) => {
                if (visited.has(link) || count >= maxItems) return;
                visited.add(link);
                const resp = await axios.get(link, { responseType: 'arraybuffer' });
                const ct = resp.headers['content-type'] || '';
                const ext = ct.includes('text/html') ? '.html' : (ct.includes('application/json') ? '.json' : '');
                const nameSafe = Buffer.from(link).toString('base64').slice(0, 40);
                const fileName = `${nameSafe}${ext}`;
                const filePath = path.join(tmpBase, fileName);
                await fs.writeFile(filePath, Buffer.from(resp.data));
                saved.push({ url: link, filePath, contentType: ct });
                count++;
                if (deep && ct.includes('text/html') && depth < maxDepth) {
                    const $ = cheerio.load(resp.data.toString());
                    const links = [];
                    $('a[href]').each((_, el) => links.push($(el).attr('href')));
                    $('img[src],script[src],link[href]').each((_, el) => {
                        const h = $(el).attr('src') || $(el).attr('href');
                        if (h) links.push(h);
                    });
                    const absLinks = links
                        .map(h => new URL(h, link).href)
                        .filter(h => h.startsWith('http://') || h.startsWith('https://'));
                    for (const l of absLinks) {
                        try { await saveStream(l, depth + 1); } catch (e) { /* skip */ }
                    }
                }
            };

            const isGitHub = /https?:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+/.test(url);
            if (isGitHub) {
                const m = url.match(/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)/);
                const owner = m?.[1];
                const repo = m?.[2];
                const gh = new GitHubTools({ github: { token: token || process.env.GITHUB_TOKEN, username: owner } });
                const clone = await gh.cloneRepo(repo, branch);
                if (!clone.success) {
                    return res.status(500).json({ success: false, error: clone.error });
                }
                // Walk repo and process files
                const walk = async (dir, acc = []) => {
                    const entries = await fs.readdir(dir, { withFileTypes: true });
                    for (const e of entries) {
                        const p = path.join(dir, e.name);
                        if (e.isDirectory()) {
                            await walk(p, acc);
                        } else {
                            acc.push(p);
                            if (acc.length >= maxItems) break;
                        }
                    }
                    return acc;
                };
                const repoPath = path.join('/tmp/joe-workspace', repo);
                const files = await walk(repoPath, []);
                const results = [];
                for (const fp of files) {
                    try {
                        const r = await fileProcessingService.processUploadedFile({ file: { path: fp, originalname: fp.replace(repoPath + '/', ''), mimetype: 'application/octet-stream' }, userId });
                        results.push({ success: true, file: fp, analysis: r });
                    } catch (e) {
                        results.push({ success: false, file: fp, error: e.message });
                    }
                    if (results.length >= maxItems) break;
                }
                return res.json({ success: true, mode: 'github', repo, owner, count: results.length, results });
            }

            await saveStream(url, 0);
            const results = [];
            for (const s of saved) {
                try {
                    const r = await fileProcessingService.processUploadedFile({ file: { path: s.filePath, originalname: s.url, mimetype: s.contentType }, userId });
                    results.push({ success: true, source: s.url, analysis: r });
                } catch (e) {
                    results.push({ success: false, source: s.url, error: e.message });
                }
            }
            res.json({ success: true, count: results.length, results });
        } catch (error) {
            console.error('❌ Fetch URL router error:', error);
            res.status(500).json({ success: false, error: 'FETCH_URL_FAILED', details: error.message });
        }
    });

    router.post('/deploy/vercel', requireRole('USER'), async (req, res) => {
        try {
            const token = process.env.VERCEL_TOKEN;
            const { projectId, target = 'production' } = req.body || {};
            if (!token) return res.status(400).json({ success: false, error: 'VERCEL_TOKEN_MISSING' });
            if (!projectId) return res.status(400).json({ success: false, error: 'PROJECT_ID_REQUIRED' });
            const { data } = await axios.post('https://api.vercel.com/v13/deployments', { projectId, target }, { headers: { Authorization: `Bearer ${token}` } });
            res.json({ success: true, deployment: data });
        } catch (error) {
            res.status(500).json({ success: false, error: 'VERCEL_DEPLOY_FAILED', details: error.message });
        }
    });

    router.post('/deploy/render', requireRole('USER'), async (req, res) => {
        try {
            const token = process.env.RENDER_TOKEN;
            const { serviceId } = req.body || {};
            if (!token) return res.status(400).json({ success: false, error: 'RENDER_TOKEN_MISSING' });
            if (!serviceId) return res.status(400).json({ success: false, error: 'SERVICE_ID_REQUIRED' });
            const { data } = await axios.post(`https://api.render.com/v1/services/${serviceId}/deploys`, {}, { headers: { Authorization: `Bearer ${token}` } });
            res.json({ success: true, deploy: data });
        } catch (error) {
            res.status(500).json({ success: false, error: 'RENDER_DEPLOY_FAILED', details: error.message });
        }
    });

    router.post('/github/commit', requireRole('USER'), async (req, res) => {
        try {
            const { url, message = 'Update by JOE AI', branch = 'main', token } = req.body || {};
            if (!url) return res.status(400).json({ success: false, error: 'URL_REQUIRED' });
            const m = url.match(/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)/);
            const owner = m?.[1];
            const repo = m?.[2];
            if (!owner || !repo) return res.status(400).json({ success: false, error: 'INVALID_GITHUB_URL' });
            const gh = new GitHubTools({ github: { token: token || process.env.GITHUB_TOKEN, username: owner } });
            await gh.cloneRepo(repo, branch);
            const result = await gh.commit(repo, message);
            res.json(result);
        } catch (error) {
            res.status(500).json({ success: false, error: 'GITHUB_COMMIT_FAILED', details: error.message });
        }
    });

    router.post('/github/push', requireRole('USER'), async (req, res) => {
        try {
            const { url, branch = 'main', token } = req.body || {};
            if (!url) return res.status(400).json({ success: false, error: 'URL_REQUIRED' });
            const m = url.match(/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)/);
            const owner = m?.[1];
            const repo = m?.[2];
            if (!owner || !repo) return res.status(400).json({ success: false, error: 'INVALID_GITHUB_URL' });
            const gh = new GitHubTools({ github: { token: token || process.env.GITHUB_TOKEN, username: owner } });
            await gh.cloneRepo(repo, branch);
            const result = await gh.push(repo, branch);
            res.json(result);
        } catch (error) {
            res.status(500).json({ success: false, error: 'GITHUB_PUSH_FAILED', details: error.message });
        }
    });

    router.post('/github/list', requireRole('USER'), async (req, res) => {
        try {
            const { url, branch = 'main', token, directory = '.' } = req.body || {};
            if (!url) return res.status(400).json({ success: false, error: 'URL_REQUIRED' });
            const m = url.match(/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)/);
            const owner = m?.[1];
            const repo = m?.[2];
            if (!owner || !repo) return res.status(400).json({ success: false, error: 'INVALID_GITHUB_URL' });
            const gh = new GitHubTools({ github: { token: token || process.env.GITHUB_TOKEN, username: owner } });
            const clone = await gh.cloneRepo(repo, branch);
            if (!clone.success) return res.status(500).json(clone);
            const listing = await gh.listFiles(repo, directory);
            res.json(listing);
        } catch (error) {
            res.status(500).json({ success: false, error: 'GITHUB_LIST_FAILED', details: error.message });
        }
    });

    router.post('/github/read-file', requireRole('USER'), async (req, res) => {
        try {
            const { url, branch = 'main', token, filePath } = req.body || {};
            if (!url || !filePath) return res.status(400).json({ success: false, error: 'URL_AND_FILEPATH_REQUIRED' });
            const m = url.match(/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)/);
            const owner = m?.[1];
            const repo = m?.[2];
            const gh = new GitHubTools({ github: { token: token || process.env.GITHUB_TOKEN, username: owner } });
            const clone = await gh.cloneRepo(repo, branch);
            if (!clone.success) return res.status(500).json(clone);
            const read = await gh.readFile(repo, filePath);
            res.json(read);
        } catch (error) {
            res.status(500).json({ success: false, error: 'GITHUB_READ_FAILED', details: error.message });
        }
    });

    router.post('/github/write-file', requireRole('USER'), async (req, res) => {
        try {
            const { url, branch = 'main', token, filePath, content, commitMessage } = req.body || {};
            if (!url || !filePath || typeof content === 'undefined') return res.status(400).json({ success: false, error: 'INVALID_PARAMETERS' });
            const m = url.match(/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)/);
            const owner = m?.[1];
            const repo = m?.[2];
            const gh = new GitHubTools({ github: { token: token || process.env.GITHUB_TOKEN, username: owner } });
            const clone = await gh.cloneRepo(repo, branch);
            if (!clone.success) return res.status(500).json(clone);
            const write = await gh.writeFile(repo, filePath, content);
            if (commitMessage) {
                await gh.commit(repo, commitMessage);
            }
            res.json(write);
        } catch (error) {
            res.status(500).json({ success: false, error: 'GITHUB_WRITE_FAILED', details: error.message });
        }
    });

    return router;
};

export default fileRouterFactory;
