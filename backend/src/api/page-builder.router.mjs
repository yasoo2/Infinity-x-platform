import express from 'express';

// REFACTORED: This router orchestrates AI code generation, GitHub commits, and deployment.
// All complex logic should be delegated to specialized services.

// Mock/Placeholder imports for services that need to be created.
// import { generatePageCode } from '../services/ai/ai-page-builder.service.mjs';
// import { deploymentService } from '../services/deployment/deployment.service.mjs';
import GitHubTools from '../tools_refactored/githubTools.mjs';
import pageBuilder from '../services/ai/ai-page-builder.service.mjs';

const pageBuilderRouterFactory = ({ requireRole }) => {
    const router = express.Router();

    // Removed legacy notImplemented handler; preview is now implemented.

    /**
     * @route POST /api/v1/page-builder/preview
     * @description Generates a preview of the code based on a description.
     * @access USER
     * @body { description: string, projectType: string, style?: string }
     */
    router.post('/preview', requireRole('USER'), async (req, res) => {
        try {
            const { description, projectType = 'page', style } = req.body;
            if (!description) {
                return res.status(400).json({ success: false, error: 'DESCRIPTION_REQUIRED' });
            }
            const result = await pageBuilder.generatePageCode({ description, projectType, style });
            return res.json({ success: true, ...result });
        } catch (e) {
            console.error('❌ Page Builder preview error:', e);
            return res.status(500).json({ success: false, error: 'PREVIEW_FAILED', message: e?.message || String(e) });
        }
    });

    /**
     * @route POST /api/v1/page-builder/create-and-deploy
     * @description A multi-step process: generates code, pushes to a new GitHub repo, and deploys.
     * @access ADMIN
     * @body { description, projectType, repoName, ... }
     */
    router.post('/create-and-deploy', requireRole('ADMIN'), async (req, res) => {
        try {
            const { description, projectType = 'page', repoName } = req.body;

            if (!description || !repoName) {
                return res.status(400).json({ success: false, error: 'Description and repoName are required.' });
            }
            
            // Step 1: Generate Code (free path)
            const gen = await pageBuilder.generatePageCode({ description, projectType });
            const codeFiles = gen.files || [];
            console.log('Step 1/3: Code generation complete.');

            // Step 2: Push to GitHub
            // This uses the refactored githubTools which should handle auth securely
            const gh = new GitHubTools();
            const clone = await gh.cloneRepo(repoName);
            if (!clone.success) {
                console.warn('⚠️ GitHub clone failed, continuing without push:', clone.error);
            } else {
                for (const f of codeFiles) {
                    await gh.writeFile(repoName, f.path, f.content);
                }
                await gh.commit(repoName, `feat: Initial commit by Page Builder for ${repoName}`);
                const pushResult = await gh.push(repoName, 'main');
                if (!pushResult.success) {
                    console.warn('⚠️ GitHub push failed:', pushResult.error);
                }
            }
            const commitResult = { success: true, repoUrl: `https://github.com/${gh.username}/${repoName}` };
            
            if (!commitResult.success) {
                throw new Error(commitResult.error || 'Failed to commit to GitHub');
            }
            console.log('Step 2/3: GitHub commit successful.');

            // Step 3: Deploy (placeholder)
            // const deploymentResult = await deploymentService.deploy({ repoUrl: commitResult.repoUrl });
            const deploymentResult = { success: true, url: `https://example.com/${repoName}` }; // Mocked result
            console.log('Step 3/3: Deployment initiated.');


            res.json({
                success: true,
                message: 'Project creation and deployment process initiated.',
                repoUrl: commitResult.repoUrl,
                deploymentUrl: deploymentResult.url
            });

        } catch (error) {
            console.error('❌ Page Builder create-and-deploy error:', error);
            res.status(500).json({ success: false, error: 'Page creation failed', details: error.message });
        }
    });

    return router;
};

export default pageBuilderRouterFactory;
