import express from 'express';
import { Octokit } from '@octokit/rest';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = express.Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Scan repository and analyze all files
router.post('/scan', async (req, res) => {
  try {
    const { githubToken, owner, repo } = req.body;

    if (!githubToken || !owner || !repo) {
      return res.json({ ok: false, error: 'Missing required fields' });
    }

    const octokit = new Octokit({ auth: githubToken });

    // Get repository tree
    const { data: repoData } = await octokit.repos.get({ owner, repo });
    const defaultBranch = repoData.default_branch;

    const { data: tree } = await octokit.git.getTree({
      owner,
      repo,
      tree_sha: defaultBranch,
      recursive: true
    });

    // Filter code files
    const codeFiles = tree.tree.filter(item => 
      item.type === 'blob' && 
      /\.(js|jsx|ts|tsx|py|java|html|css|json|md)$/i.test(item.path)
    );

    // Read file contents
    const files = [];
    for (const file of codeFiles.slice(0, 50)) { // Limit to 50 files
      try {
        const { data: content } = await octokit.repos.getContent({
          owner,
          repo,
          path: file.path
        });

        if (content.content) {
          const decoded = Buffer.from(content.content, 'base64').toString('utf-8');
          files.push({
            path: file.path,
            content: decoded,
            size: file.size,
            sha: file.sha
          });
        }
      } catch (err) {
        console.error(`Error reading ${file.path}:`, err.message);
      }
    }

    res.json({
      ok: true,
      repository: {
        name: repo,
        owner,
        branch: defaultBranch,
        totalFiles: tree.tree.length,
        codeFiles: codeFiles.length
      },
      files
    });

  } catch (error) {
    console.error('Scan error:', error);
    res.json({ ok: false, error: error.message });
  }
});

// Analyze repository with AI
router.post('/analyze', async (req, res) => {
  try {
    const { files, projectType = 'web' } = req.body;

    if (!files || !Array.isArray(files)) {
      return res.json({ ok: false, error: 'Files array required' });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const filesList = files.map(f => `${f.path} (${f.size} bytes)`).join('\n');
    const sampleCode = files.slice(0, 5).map(f => 
      `File: ${f.path}\n\`\`\`\n${f.content.substring(0, 500)}\n\`\`\``
    ).join('\n\n');

    const prompt = `You are a senior software engineer reviewing a ${projectType} project.

**Repository Files:**
${filesList}

**Sample Code:**
${sampleCode}

**Analyze this repository and provide:**

1. **Missing Files**: What essential files are missing?
2. **Code Issues**: What bugs or problems exist in the code?
3. **Improvements**: What can be improved?
4. **Security**: Any security vulnerabilities?
5. **Best Practices**: What best practices are violated?
6. **Recommendations**: Specific actionable recommendations

Respond in JSON format:
{
  "missingFiles": ["file1.js", "file2.css"],
  "codeIssues": ["Issue 1", "Issue 2"],
  "improvements": ["Improvement 1"],
  "security": ["Security issue 1"],
  "bestPractices": ["Practice 1"],
  "recommendations": ["Recommendation 1"],
  "overallScore": 75
}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : {
      missingFiles: [],
      codeIssues: [],
      improvements: [],
      security: [],
      bestPractices: [],
      recommendations: [],
      overallScore: 0
    };

    res.json({ ok: true, analysis });

  } catch (error) {
    console.error('Analysis error:', error);
    res.json({ ok: false, error: error.message });
  }
});

// Improve/fix code with AI
router.post('/improve', async (req, res) => {
  try {
    const { file, issue, projectType = 'web' } = req.body;

    if (!file || !file.content) {
      return res.json({ ok: false, error: 'File content required' });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const prompt = `You are a senior software engineer fixing code in a ${projectType} project.

**File:** ${file.path}
**Issue:** ${issue || 'General improvement'}

**Current Code:**
\`\`\`
${file.content}
\`\`\`

**Task:** Fix the issue and improve the code. Follow best practices.

**Respond with ONLY the improved code, no explanations.**`;

    const result = await model.generateContent(prompt);
    const improvedCode = result.response.text()
      .replace(/```[a-z]*\n?/g, '')
      .trim();

    res.json({
      ok: true,
      original: file.content,
      improved: improvedCode,
      changes: improvedCode !== file.content
    });

  } catch (error) {
    console.error('Improve error:', error);
    res.json({ ok: false, error: error.message });
  }
});

// Auto-update repository
router.post('/auto-update', async (req, res) => {
  try {
    const { githubToken, owner, repo, updates } = req.body;

    if (!githubToken || !owner || !repo || !updates) {
      return res.json({ ok: false, error: 'Missing required fields' });
    }

    const octokit = new Octokit({ auth: githubToken });

    // Get default branch
    const { data: repoData } = await octokit.repos.get({ owner, repo });
    const branch = repoData.default_branch;

    const results = [];

    for (const update of updates) {
      try {
        if (update.action === 'create' || update.action === 'update') {
          // Create or update file
          let sha = null;
          
          if (update.action === 'update') {
            try {
              const { data: existing } = await octokit.repos.getContent({
                owner,
                repo,
                path: update.path
              });
              sha = existing.sha;
            } catch (err) {
              // File doesn't exist, will create
            }
          }

          await octokit.repos.createOrUpdateFileContents({
            owner,
            repo,
            path: update.path,
            message: update.message || `Auto-update: ${update.path}`,
            content: Buffer.from(update.content).toString('base64'),
            branch,
            sha
          });

          results.push({ path: update.path, action: update.action, success: true });

        } else if (update.action === 'delete') {
          // Delete file
          const { data: existing } = await octokit.repos.getContent({
            owner,
            repo,
            path: update.path
          });

          await octokit.repos.deleteFile({
            owner,
            repo,
            path: update.path,
            message: update.message || `Auto-delete: ${update.path}`,
            sha: existing.sha,
            branch
          });

          results.push({ path: update.path, action: 'delete', success: true });
        }

      } catch (err) {
        results.push({ 
          path: update.path, 
          action: update.action, 
          success: false, 
          error: err.message 
        });
      }
    }

    res.json({
      ok: true,
      results,
      totalUpdates: updates.length,
      successful: results.filter(r => r.success).length
    });

  } catch (error) {
    console.error('Auto-update error:', error);
    res.json({ ok: false, error: error.message });
  }
});

// Full auto-improve workflow
router.post('/auto-improve', async (req, res) => {
  try {
    const { githubToken, owner, repo, projectType = 'web' } = req.body;

    if (!githubToken || !owner || !repo) {
      return res.json({ ok: false, error: 'Missing required fields' });
    }

    // Step 1: Scan
    const scanRes = await fetch(`${req.protocol}://${req.get('host')}/api/github-manager/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ githubToken, owner, repo })
    });
    const scanData = await scanRes.json();

    if (!scanData.ok) {
      return res.json({ ok: false, error: 'Scan failed', details: scanData.error });
    }

    // Step 2: Analyze
    const analyzeRes = await fetch(`${req.protocol}://${req.get('host')}/api/github-manager/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files: scanData.files, projectType })
    });
    const analyzeData = await analyzeRes.json();

    if (!analyzeData.ok) {
      return res.json({ ok: false, error: 'Analysis failed', details: analyzeData.error });
    }

    res.json({
      ok: true,
      scan: scanData.repository,
      analysis: analyzeData.analysis,
      message: 'Repository scanned and analyzed successfully'
    });

  } catch (error) {
    console.error('Auto-improve error:', error);
    res.json({ ok: false, error: error.message });
  }
});

export default router;
