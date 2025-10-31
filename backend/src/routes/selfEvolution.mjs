import express from 'express';
import { Octokit } from '@octokit/rest';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = express.Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Self-analyze: Analyze own codebase
router.post('/analyze-self', async (req, res) => {
  try {
    const { githubToken, owner, repo } = req.body;

    if (!githubToken || !owner || !repo) {
      return res.json({ ok: false, error: 'GitHub credentials required' });
    }

    const octokit = new Octokit({ auth: githubToken });

    // Get repository tree
    const { data: repoData } = await octokit.repos.get({ owner, repo });
    const { data: tree } = await octokit.git.getTree({
      owner,
      repo,
      tree_sha: repoData.default_branch,
      recursive: true
    });

    // Analyze structure
    const files = tree.tree.filter(item => item.type === 'blob');
    const codeFiles = files.filter(f => /\.(js|jsx|mjs|ts|tsx|py)$/i.test(f.path));
    const configFiles = files.filter(f => /\.(json|yaml|yml|env|config)$/i.test(f.path));

    const analysis = {
      totalFiles: files.length,
      codeFiles: codeFiles.length,
      configFiles: configFiles.length,
      structure: {
        frontend: files.filter(f => f.path.includes('dashboard-x')).length,
        backend: files.filter(f => f.path.includes('backend')).length,
        shared: files.filter(f => f.path.includes('shared')).length
      }
    };

    res.json({ ok: true, analysis });

  } catch (error) {
    console.error('Self-analyze error:', error);
    res.json({ ok: false, error: error.message });
  }
});

// Self-improve: Suggest improvements
router.post('/suggest-improvements', async (req, res) => {
  try {
    const { codebase, currentFeatures } = req.body;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const prompt = `You are analyzing a full-stack AI platform called "JOE - Just One Engine".

**Current Features:**
${currentFeatures || 'AI-powered code generation, GitHub integration, deployment automation'}

**Codebase Summary:**
${JSON.stringify(codebase, null, 2)}

**Task:** Suggest 5 high-impact improvements that would make JOE more powerful.

**Respond in JSON format:**
{
  "improvements": [
    {
      "title": "Feature name",
      "description": "What it does",
      "impact": "high/medium/low",
      "implementation": "Brief how-to"
    }
  ]
}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const suggestions = jsonMatch ? JSON.parse(jsonMatch[0]) : { improvements: [] };

    res.json({ ok: true, suggestions });

  } catch (error) {
    console.error('Suggest improvements error:', error);
    res.json({ ok: false, error: error.message });
  }
});

// Self-update: Update own code
router.post('/update-self', async (req, res) => {
  try {
    const { githubToken, owner, repo, improvement } = req.body;

    if (!githubToken || !owner || !repo || !improvement) {
      return res.json({ ok: false, error: 'All fields required' });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    // Generate code for improvement
    const prompt = `Generate code to implement this improvement in JOE platform:

**Improvement:** ${improvement.title}
**Description:** ${improvement.description}
**Implementation:** ${improvement.implementation}

**Generate:**
1. File path (where to add/update)
2. Complete code
3. Commit message

**Respond in JSON:**
{
  "filePath": "path/to/file.js",
  "code": "complete code here",
  "commitMessage": "feat: add feature"
}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.json({ ok: false, error: 'Failed to generate code' });
    }

    const generated = JSON.parse(jsonMatch[0]);

    // Push to GitHub
    const octokit = new Octokit({ auth: githubToken });
    const { data: repoData } = await octokit.repos.get({ owner, repo });

    // Check if file exists
    let sha = null;
    try {
      const { data: existing } = await octokit.repos.getContent({
        owner,
        repo,
        path: generated.filePath
      });
      sha = existing.sha;
    } catch (err) {
      // File doesn't exist, will create
    }

    // Create or update file
    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: generated.filePath,
      message: generated.commitMessage || 'Self-improvement update',
      content: Buffer.from(generated.code).toString('base64'),
      branch: repoData.default_branch,
      sha
    });

    res.json({
      ok: true,
      message: 'Self-update successful',
      filePath: generated.filePath,
      commitMessage: generated.commitMessage
    });

  } catch (error) {
    console.error('Self-update error:', error);
    res.json({ ok: false, error: error.message });
  }
});

// Full self-evolution cycle
router.post('/evolve', async (req, res) => {
  try {
    const { githubToken, owner, repo } = req.body;

    if (!githubToken || !owner || !repo) {
      return res.json({ ok: false, error: 'GitHub credentials required' });
    }

    // Step 1: Analyze self
    const analyzeRes = await fetch(`${req.protocol}://${req.get('host')}/api/self-evolution/analyze-self`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ githubToken, owner, repo })
    });
    const analyzeData = await analyzeRes.json();

    if (!analyzeData.ok) {
      return res.json({ ok: false, error: 'Self-analysis failed' });
    }

    // Step 2: Suggest improvements
    const suggestRes = await fetch(`${req.protocol}://${req.get('host')}/api/self-evolution/suggest-improvements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codebase: analyzeData.analysis })
    });
    const suggestData = await suggestRes.json();

    if (!suggestData.ok) {
      return res.json({ ok: false, error: 'Suggestion failed' });
    }

    res.json({
      ok: true,
      analysis: analyzeData.analysis,
      suggestions: suggestData.suggestions,
      message: 'Self-evolution analysis complete. Ready to implement improvements.'
    });

  } catch (error) {
    console.error('Evolve error:', error);
    res.json({ ok: false, error: error.message });
  }
});

export default router;
