/**
 * Smart File Detection System
 * Uses AI to detect the exact file to modify based on user request
 * No need to scan all files!
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * File patterns database
 * Maps common modification types to likely file locations
 */
const FILE_PATTERNS = {
  // Colors & Styling
  'color': [
    'dashboard-x/src/index.css',
    'dashboard-x/tailwind.config.js',
    'dashboard-x/src/App.jsx',
    'public-site/styles.css'
  ],
  'background': [
    'dashboard-x/src/index.css',
    'dashboard-x/tailwind.config.js',
    'dashboard-x/src/App.jsx'
  ],
  'theme': [
    'dashboard-x/tailwind.config.js',
    'dashboard-x/src/index.css'
  ],
  
  // Backend
  'api': [
    'backend/src/routes/*.mjs',
    'backend/server.mjs'
  ],
  'database': [
    'backend/src/db.mjs',
    'backend/src/routes/*.mjs'
  ],
  'auth': [
    'backend/src/routes/auth.mjs',
    'backend/middleware/auth.mjs'
  ],
  
  // Frontend Components
  'component': [
    'dashboard-x/src/components/*.jsx',
    'dashboard-x/src/pages/*.jsx'
  ],
  'page': [
    'dashboard-x/src/pages/*.jsx',
    'dashboard-x/src/App.jsx'
  ],
  
  // Configuration
  'config': [
    'package.json',
    'dashboard-x/vite.config.js',
    'backend/server.mjs'
  ]
};

/**
 * Detect target files using AI
 * @param {string} userRequest - User's modification request
 * @param {string} repoStructure - Repository structure (optional)
 * @returns {Promise<{files: string[], confidence: number, reasoning: string}>}
 */
export async function detectTargetFiles(userRequest, repoStructure = null) {
  try {
    // Step 1: Quick pattern matching
    const quickMatch = quickPatternMatch(userRequest);
    if (quickMatch.confidence > 0.8) {
      return quickMatch;
    }

    // Step 2: AI-powered detection
    const aiDetection = await aiDetectFiles(userRequest, repoStructure);
    
    // Step 3: Combine results
    const combined = combineDetections(quickMatch, aiDetection);
    
    return combined;
  } catch (error) {
    console.error('Smart detection error:', error);
    // Fallback to pattern matching
    return quickPatternMatch(userRequest);
  }
}

/**
 * Quick pattern matching based on keywords
 */
function quickPatternMatch(userRequest) {
  const request = userRequest.toLowerCase();
  const matches = [];
  let confidence = 0;

  // Check for color-related requests
  if (request.includes('لون') || request.includes('color')) {
    if (request.includes('خلفية') || request.includes('background')) {
      matches.push(...FILE_PATTERNS.background);
      confidence = 0.85;
    } else if (request.includes('theme') || request.includes('ثيم')) {
      matches.push(...FILE_PATTERNS.theme);
      confidence = 0.9;
    } else {
      matches.push(...FILE_PATTERNS.color);
      confidence = 0.75;
    }
  }

  // Check for component-related requests
  if (request.includes('component') || request.includes('مكون')) {
    matches.push(...FILE_PATTERNS.component);
    confidence = 0.8;
  }

  // Check for page-related requests
  if (request.includes('page') || request.includes('صفحة')) {
    matches.push(...FILE_PATTERNS.page);
    confidence = 0.85;
  }

  // Check for API-related requests
  if (request.includes('api') || request.includes('endpoint')) {
    matches.push(...FILE_PATTERNS.api);
    confidence = 0.8;
  }

  // Check for database-related requests
  if (request.includes('database') || request.includes('قاعدة بيانات')) {
    matches.push(...FILE_PATTERNS.database);
    confidence = 0.85;
  }

  // Remove duplicates
  const uniqueMatches = [...new Set(matches)];

  return {
    files: uniqueMatches.slice(0, 3), // Top 3 matches
    confidence,
    reasoning: 'Pattern matching based on keywords',
    method: 'quick'
  };
}

/**
 * AI-powered file detection using Gemini
 */
async function aiDetectFiles(userRequest, repoStructure) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

  const prompt = `You are a smart file detector for a web application codebase.

**Repository Structure:**
- Frontend: dashboard-x/ (React + Vite + Tailwind CSS)
  - src/index.css (global styles)
  - src/App.jsx (main app)
  - src/pages/*.jsx (pages)
  - src/components/*.jsx (components)
  - tailwind.config.js (Tailwind config)
- Backend: backend/ (Node.js + Express)
  - src/routes/*.mjs (API routes)
  - src/db.mjs (database)
  - server.mjs (main server)

**User Request:**
"${userRequest}"

**Task:**
Identify the EXACT file(s) that need to be modified to fulfill this request.

**Response Format (JSON only):**
{
  "files": ["path/to/file1", "path/to/file2"],
  "confidence": 0.95,
  "reasoning": "Brief explanation"
}

**Rules:**
1. Return maximum 3 files
2. Be specific (exact file paths)
3. Confidence: 0-1 (how sure you are)
4. If color/style change → likely index.css or tailwind.config.js
5. If component change → specific .jsx file
6. If API change → specific route file

Return ONLY valid JSON, no markdown.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  
  // Extract JSON from response
  let jsonText = text;
  if (text.includes('```json')) {
    jsonText = text.split('```json')[1].split('```')[0].trim();
  } else if (text.includes('```')) {
    jsonText = text.split('```')[1].split('```')[0].trim();
  }

  const detection = JSON.parse(jsonText);
  detection.method = 'ai';
  
  return detection;
}

/**
 * Combine quick match and AI detection
 */
function combineDetections(quick, ai) {
  // If AI is very confident, use it
  if (ai.confidence > 0.9) {
    return ai;
  }

  // If quick match is very confident, use it
  if (quick.confidence > 0.85) {
    return quick;
  }

  // Combine both
  const combinedFiles = [...new Set([...quick.files, ...ai.files])].slice(0, 3);
  const avgConfidence = (quick.confidence + ai.confidence) / 2;

  return {
    files: combinedFiles,
    confidence: avgConfidence,
    reasoning: `Combined: ${quick.reasoning} + ${ai.reasoning}`,
    method: 'combined'
  };
}

/**
 * Get file content preview
 */
export async function getFilePreview(filePath, lines = 50) {
  // This would integrate with GitHub Tools
  return {
    path: filePath,
    preview: '// File content preview...',
    lines
  };
}

export const detectTargetFiles.metadata = {
    name: "detectTargetFiles",
    description: "Uses AI to intelligently detect the most likely files that need to be modified based on a user's request. This is the first step before reading or writing any file.",
    parameters: {
        type: "object",
        properties: {
            userRequest: { type: "string", description: "The user's request for modification (e.g., 'Change the background color of the header to blue')." },
            repoStructure: { type: "string", description: "Optional: A string representing the current repository structure for better context." }
        },
        required: ["userRequest"]
    }
};

export const getFilePreview.metadata = {
    name: "getFilePreview",
    description: "Retrieves a content preview of a detected file to confirm its relevance before making modifications.",
    parameters: {
        type: "object",
        properties: {
            filePath: { type: "string", description: "The path to the file to preview." },
            lines: { type: "number", description: "The number of lines to retrieve for the preview (default 50)." }
        },
        required: ["filePath"]
    }
};

export default {
  detectTargetFiles,
  getFilePreview
};
