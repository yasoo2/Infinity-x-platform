import express from 'express';

// REFACTORED: Import the refactored tools and services
import { githubTools } from '../tools_refactored/githubTools.mjs';
import { getOpenAI } from '../services/ai/ai-engine.service.mjs';

const githubRouterFactory = ({ requireRole }) => {
    const router = express.Router();

    // Middleware to extract common GitHub parameters
    const githubParams = (req, res, next) => {
        req.owner = req.body.owner || req.query.owner;
        req.repo = req.body.repo || req.query.repo;
        // The GitHub token should be handled securely by the tool, not passed in the request body.
        next();
    };

    /**
     * @route GET /api/v1/github/repos
     * @description Lists repositories for the authenticated user.
     * @access USER
     */
    router.get('/repos', requireRole('USER'), async (req, res) => {
        try {
            // The githubTools.listRepos function should securely get the token itself
            const result = await githubTools.listRepos(); 
            res.json(result);
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * @route GET /api/v1/github/tree
     * @description Gets the file tree of a repository.
     * @access USER
     * @query owner, repo, branch (optional)
     */
    router.get('/tree', requireRole('USER'), githubParams, async (req, res) => {
        try {
            const { owner, repo } = req;
            const branch = req.query.branch; // Optional branch
            if (!owner || !repo) return res.status(400).json({ success: false, error: 'Owner and repo are required.' });
            
            const result = await githubTools.getRepoTree({ owner, repo, branch });
            res.json(result);
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });
    
    /**
     * @route POST /api/v1/github/files/read
     * @description Reads the content of a specific file.
     * @access USER
     * @body { owner, repo, path }
     */
    router.post('/files/read', requireRole('USER'), githubParams, async (req, res) => {
        try {
            const { owner, repo } = req;
            const { path } = req.body;
            if (!owner || !repo || !path) return res.status(400).json({ success: false, error: 'Owner, repo, and path are required.' });

            const result = await githubTools.readFileContent({ owner, repo, path });
            res.json(result);
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * @route POST /api/v1/github/files/commit
     * @description Commits changes to one or more files.
     * @access USER
     * @body { owner, repo, branch, commitMessage, files: [{path, content}] }
     */
    router.post('/files/commit', requireRole('USER'), githubParams, async (req, res) => {
        try {
            const { owner, repo } = req;
            const { branch, commitMessage, files } = req.body;
            if (!owner || !repo || !branch || !commitMessage || !files) {
                return res.status(400).json({ success: false, error: 'Owner, repo, branch, commitMessage, and files are required.' });
            }

            const result = await githubTools.commitFiles({ owner, repo, branch, commitMessage, files });
            res.json(result);
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * @route POST /api/v1/github/ai/analyze-code
     * @description Analyzes a codebase using AI.
     * @access USER
     * @body { code } // code is a string of the code to analyze
     */
    router.post('/ai/analyze-code', requireRole('USER'), async (req, res) => {
        try {
            const { code } = req.body;
            if (!code) return res.status(400).json({ success: false, error: 'Code is required for analysis.' });
            
            const ai = getOpenAI(); // Or any other AI engine
            const prompt = `Please analyze the following code snippet for quality, potential bugs, and suggest improvements:\n\n${code}`;
            const analysis = await ai.generateResponse(prompt, []);

            res.json({ success: true, analysis });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    return router;
};

export default githubRouterFactory;
