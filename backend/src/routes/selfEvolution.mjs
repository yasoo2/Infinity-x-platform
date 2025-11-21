import express from 'express';
import { Octokit } from '@octokit/rest';
import { GoogleGenerativeAI } from '@google/generative-ai';
// import { CodeModificationEngine } from '../../../joengine-agi/engines/CodeModificationEngine.mjs'; // استيراد المحرك الجديد
// import { ReasoningEngine } from '../../../joengine-agi/engines/ReasoningEngine.mjs'; // استيراد محرك الاستدلال

const router = express.Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// تهيئة محرك الاستدلال ومحرك تعديل الكود
// const reasoningEngine = new ReasoningEngine({ openaiApiKey: process.env.OPENAI_API_KEY });
// const codeModEngine = reasoningEngine.codeModEngine;

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

// Self-update: Update own code using the smart modification engine
router.post('/update-self', async (req, res) => {
  try {
    const { githubToken, owner, repo, improvement, filePath, fileContent } = req.body;

    if (!githubToken || !owner || !repo || !improvement || !filePath || !fileContent) {
      return res.json({ ok: false, error: 'GitHub credentials, improvement details, file path, and content are required' });
    }

    // 1. تحليل الهدف وتوليد خطة التعديل الآمنة
    const modificationGoal = `Implement the following self-improvement: ${improvement.title} - ${improvement.description}. Implementation details: ${improvement.implementation}`;
    
    // const planResult = await codeModEngine.executeSmartModification(filePath, fileContent, modificationGoal);

    // if (!planResult.success) {
    //   return res.json({ ok: false, error: `Failed to generate modification plan: ${planResult.message}` });
    // }

    // const plan = planResult.plan;
    
    // 2. تطبيق التعديلات محليًا (للتأكد من عدم وجود أخطاء في التعديل)
    // ملاحظة: في بيئة الإنتاج، يجب أن يتم هذا في بيئة معزولة أو فرع جديد
    // بما أننا لا نستطيع تطبيق التعديلات محليًا على ملفات GitHub، سنقوم بتوليد الكود النهائي من التعديلات
    
    // **هنا يجب أن يتم دمج التعديلات في الكود الأصلي**
    // بما أننا لا نملك أداة لتطبيق الـ edits على النص وإعادة إرساله، سنقوم بتوليد الكود النهائي مباشرة من LLM
    // هذا الجزء يتطلب تعديل منطق CodeModificationEngine ليكون أكثر تكاملاً مع بيئة التنفيذ.
    // سنعود إلى الطريقة القديمة مع إضافة تعليمات الأمان إلى LLM.

    // **إعادة محاولة مع تعليمات أمان محسّنة**
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const prompt = `You are an expert in self-modifying code. Your task is to implement the following improvement in the provided file content.

    **Improvement Goal:** ${modificationGoal}
    **File Path:** ${filePath}
    **Current File Content:**
    \`\`\`
    ${fileContent}
    \`\`\`

    **CRITICAL SAFETY RULE:** You MUST return the *complete, updated* file content. DO NOT omit any part of the original code unless it is being replaced or deleted as part of the improvement. The resulting code MUST be syntactically correct and functional.

    **Generate:**
    1. The complete, updated file content.
    2. A commit message.

    **Respond in JSON:**
    {
      "updatedCode": "complete updated code here",
      "commitMessage": "feat: implement self-improvement: ${improvement.title}"
    }`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.json({ ok: false, error: 'Failed to generate updated code' });
    }

    const generated = JSON.parse(jsonMatch[0]);
    const updatedCode = generated.updatedCode;
    const commitMessage = generated.commitMessage;

    // 3. Push to GitHub
    const octokit = new Octokit({ auth: githubToken });
    const { data: repoData } = await octokit.repos.get({ owner, repo });

    // Check if file exists
    let sha = null;
    try {
      const { data: existing } = await octokit.repos.getContent({
        owner,
        repo,
        path: filePath
      });
      sha = existing.sha;
    } catch (err) {
      // File doesn't exist, will create
    }

    // Create or update file
    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: filePath,
      message: commitMessage || 'Self-improvement update',
      content: Buffer.from(updatedCode).toString('base64'),
      branch: repoData.default_branch,
      sha
    });

    res.json({
      ok: true,
      message: 'Self-update successful',
      filePath: filePath,
      commitMessage: commitMessage
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
