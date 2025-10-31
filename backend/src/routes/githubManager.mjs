import express from 'express';
import { Octokit } from '@octokit/rest';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = express.Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// === 1. جلب كل الريبوهات في الحساب ===
router.get('/list-repos', async (req, res) => {
  try {
    const { githubToken } = req.query;
    if (!githubToken) return res.json({ ok: false, error: 'Token required' });

    const octokit = new Octokit({ auth: githubToken });
    const { data: repos } = await octokit.repos.listForAuthenticatedUser({
      per_page: 100,
      sort: 'updated'
    });

    const repoList = repos.map((r, i) => ({
      id: i + 1,
      name: r.name,
      fullName: r.full_name,
      url: r.html_url,
      private: r.private,
      language: r.language || 'غير معروف',
      updatedAt: new Date(r.updated_at).toLocaleString('ar-EG')
    }));

    res.json({
      ok: true,
      total: repoList.length,
      repositories: repoList
    });

  } catch (error) {
    console.error('List repos error:', error);
    res.json({ ok: false, error: error.message });
  }
});

// === 2. فحص ريبو واحد ===
router.post('/scan', async (req, res) => {
  try {
    const { githubToken, owner, repo } = req.body;
    if (!githubToken || !owner || !repo) return res.json({ ok: false, error: 'Missing fields' });

    const octokit = new Octokit({ auth: githubToken });
    const { data: repoData } = await octokit.repos.get({ owner, repo });
    const defaultBranch = repoData.default_branch;

    const { data: tree } = await octokit.git.getTree({
      owner, repo, tree_sha: defaultBranch, recursive: true
    });

    const codeFiles = tree.tree.filter(item => 
      item.type === 'blob' && /\.(js|jsx|ts|tsx|py|java|html|css|json|md)$/i.test(item.path)
    );

    const files = [];
    for (const file of codeFiles.slice(0, 50)) {
      try {
        const { data: content } = await octokit.repos.getContent({ owner, repo, path: file.path });
        if (content.content) {
          const decoded = Buffer.from(content.content, 'base64').toString('utf-8');
          files.push({ path: file.path, content: decoded, size: file.size, sha: file.sha });
        }
      } catch (err) { console.error(`Error reading ${file.path}`); }
    }

    res.json({
      ok: true,
      repository: { name: repo, owner, branch: defaultBranch, totalFiles: tree.tree.length, codeFiles: codeFiles.length },
      files
    });

  } catch (error) {
    res.json({ ok: false, error: error.message });
  }
});

// === 3. تحليل الكود ===
router.post('/analyze', async (req, res) => {
  try {
    const { files, projectType = 'web' } = req.body;
    if (!files || !Array.isArray(files)) return res.json({ ok: false, error: 'Files required' });

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    const filesList = files.map(f => `${f.path} (${f.size} bytes)`).join('\n');
    const sampleCode = files.slice(0, 5).map(f => `File: ${f.path}\n\`\`\`\n${f.content.substring(0, 500)}\n\`\`\``).join('\n\n');

    const prompt = `You are a senior engineer. Analyze this ${projectType} project.

Files:
${filesList}

Sample:
${sampleCode}

Respond in JSON:
{
  "missingFiles": [],
  "codeIssues": [],
  "improvements": [],
  "security": [],
  "bestPractices": [],
  "recommendations": [],
  "overallScore": 75
}`;

    const result = await model.generateContent(prompt);
    const jsonMatch = result.response.text().match(/\{[\s\S]*\}/);
    const analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : { overallScore: 0 };

    res.json({ ok: true, analysis });

  } catch (error) {
    res.json({ ok: false, error: error.message });
  }
});

// === 4. تحسين ملف واحد ===
router.post('/improve', async (req, res) => {
  try {
    const { file, issue, projectType = 'web' } = req.body;
    if (!file || !file.content) return res.json({ ok: false, error: 'File content required' });

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    const prompt = `Fix this code in a ${projectType} project.

File: ${file.path}
Issue: ${issue || 'General improvement'}

Code:
\`\`\`
${file.content}
\`\`\`

Return ONLY the improved code.`;

    const result = await model.generateContent(prompt);
    const improvedCode = result.response.text().replace(/```[a-z]*\n?/g, '').trim();

    res.json({
      ok: true,
      improved: improvedCode,
      changes: improvedCode !== file.content
    });

  } catch (error) {
    res.json({ ok: false, error: error.message });
  }
});

// === 5. رفع التعديلات ===
router.post('/auto-update', async (req, res) => {
  try {
    const { githubToken, owner, repo, updates } = req.body;
    if (!githubToken || !owner || !repo || !updates) return res.json({ ok: false, error: 'Missing fields' });

    const octokit = new Octokit({ auth: githubToken });
    const { data: repoData } = await octokit.repos.get({ owner, repo });
    const branch = repoData.default_branch;

    const results = [];
    for (const update of updates) {
      try {
        let sha = null;
        if (update.action === 'update') {
          try {
            const { data: existing } = await octokit.repos.getContent({ owner, repo, path: update.path });
            sha = existing.sha;
          } catch (err) {}
        }

        await octokit.repos.createOrUpdateFileContents({
          owner, repo, path: update.path, message: update.message || `جو: تحديث ${update.path}`,
          content: Buffer.from(update.content).toString('base64'), branch, sha
        });

        results.push({ path: update.path, success: true });
      } catch (err) {
        results.push({ path: update.path, success: false, error: err.message });
      }
    }

    res.json({ ok: true, successful: results.filter(r => r.success).length });

  } catch (error) {
    res.json({ ok: false, error: error.message });
  }
});

export default router;