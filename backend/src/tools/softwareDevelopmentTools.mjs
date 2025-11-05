/**
 * Software Development Tools - أدوات تطوير البرمجيات المتقدمة
 * مجموعة شاملة من الأدوات لتطوير البرمجيات مثل Manus AI
 */

import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * إنشاء مشروع React كامل
 */
export async function createReactProject(projectName, features = []) {
  try {
    const projectPath = path.join('/tmp', projectName);
    
    console.log(`🚀 Creating React project: ${projectName}`);
    
    // إنشاء المجلد
    await fs.mkdir(projectPath, { recursive: true });
    
    // إنشاء package.json
    const packageJson = {
      name: projectName,
      version: '1.0.0',
      type: 'module',
      scripts: {
        dev: 'vite',
        build: 'vite build',
        preview: 'vite preview'
      },
      dependencies: {
        react: '^18.2.0',
        'react-dom': '^18.2.0'
      },
      devDependencies: {
        '@vitejs/plugin-react': '^4.0.0',
        vite: '^4.3.9'
      }
    };
    
    if (features.includes('router')) {
      packageJson.dependencies['react-router-dom'] = '^6.11.0';
    }
    
    if (features.includes('tailwind')) {
      packageJson.devDependencies['tailwindcss'] = '^3.3.0';
      packageJson.devDependencies['autoprefixer'] = '^10.4.14';
      packageJson.devDependencies['postcss'] = '^8.4.24';
    }
    
    await fs.writeFile(
      path.join(projectPath, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );
    
    // إنشاء vite.config.js
    const viteConfig = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})`;
    
    await fs.writeFile(path.join(projectPath, 'vite.config.js'), viteConfig);
    
    // إنشاء index.html
    const indexHtml = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${projectName}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`;
    
    await fs.writeFile(path.join(projectPath, 'index.html'), indexHtml);
    
    // إنشاء مجلد src
    await fs.mkdir(path.join(projectPath, 'src'), { recursive: true });
    
    // إنشاء main.jsx
    const mainJsx = `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`;
    
    await fs.writeFile(path.join(projectPath, 'src', 'main.jsx'), mainJsx);
    
    // إنشاء App.jsx
    const appJsx = `import React from 'react'

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
      <div className="text-center text-white">
        <h1 className="text-5xl font-bold mb-4">${projectName}</h1>
        <p className="text-xl">تم إنشاء هذا المشروع بواسطة JOE AI 🤖</p>
      </div>
    </div>
  )
}

export default App`;
    
    await fs.writeFile(path.join(projectPath, 'src', 'App.jsx'), appJsx);
    
    // إنشاء index.css
    const indexCss = `@tailwind base;
@tailwind components;
@tailwind utilities;

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}`;
    
    await fs.writeFile(path.join(projectPath, 'src', 'index.css'), indexCss);
    
    // إنشاء tailwind.config.js إذا كان مطلوباً
    if (features.includes('tailwind')) {
      const tailwindConfig = `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}`;
      
      await fs.writeFile(path.join(projectPath, 'tailwind.config.js'), tailwindConfig);
    }
    
    // إنشاء README.md
    const readme = `# ${projectName}

تم إنشاء هذا المشروع بواسطة **JOE AI** 🤖

## التشغيل

\`\`\`bash
npm install
npm run dev
\`\`\`

## البناء

\`\`\`bash
npm run build
\`\`\`

## المميزات

${features.map(f => `- ${f}`).join('\n')}

---
تم البناء بواسطة JOE AI من XElite Solutions
`;
    
    await fs.writeFile(path.join(projectPath, 'README.md'), readme);
    
    return {
      success: true,
      projectName,
      projectPath,
      features,
      message: `تم إنشاء مشروع React بنجاح في ${projectPath}`
    };
    
  } catch (error) {
    console.error('Create React project error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * إنشاء مشروع Node.js/Express API
 */
export async function createExpressAPI(projectName, features = []) {
  try {
    const projectPath = path.join('/tmp', projectName);
    
    console.log(`🚀 Creating Express API: ${projectName}`);
    
    await fs.mkdir(projectPath, { recursive: true });
    
    // package.json
    const packageJson = {
      name: projectName,
      version: '1.0.0',
      type: 'module',
      scripts: {
        start: 'node server.js',
        dev: 'node --watch server.js'
      },
      dependencies: {
        express: '^4.18.2',
        cors: '^2.8.5',
        dotenv: '^16.0.3'
      }
    };
    
    if (features.includes('mongodb')) {
      packageJson.dependencies.mongodb = '^5.6.0';
    }
    
    if (features.includes('auth')) {
      packageJson.dependencies.bcryptjs = '^2.4.3';
      packageJson.dependencies.jsonwebtoken = '^9.0.0';
    }
    
    await fs.writeFile(
      path.join(projectPath, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );
    
    // server.js
    const serverJs = `import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'مرحباً! تم إنشاء هذا API بواسطة JOE AI 🤖',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      api: '/api'
    }
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/api', (req, res) => {
  res.json({ message: 'API endpoint is working!' });
});

app.listen(PORT, () => {
  console.log(\`🚀 Server running on port \${PORT}\`);
});`;
    
    await fs.writeFile(path.join(projectPath, 'server.js'), serverJs);
    
    // .env
    const envFile = `PORT=3000
NODE_ENV=development
${features.includes('mongodb') ? 'MONGODB_URI=mongodb://localhost:27017/' + projectName : ''}
${features.includes('auth') ? 'JWT_SECRET=your-secret-key-here' : ''}`;
    
    await fs.writeFile(path.join(projectPath, '.env'), envFile);
    
    // README.md
    const readme = `# ${projectName} API

تم إنشاء هذا API بواسطة **JOE AI** 🤖

## التشغيل

\`\`\`bash
npm install
npm run dev
\`\`\`

## Endpoints

- \`GET /\` - معلومات عن API
- \`GET /health\` - فحص الصحة
- \`GET /api\` - endpoint تجريبي

## المميزات

${features.map(f => `- ${f}`).join('\n')}

---
تم البناء بواسطة JOE AI
`;
    
    await fs.writeFile(path.join(projectPath, 'README.md'), readme);
    
    return {
      success: true,
      projectName,
      projectPath,
      features,
      message: `تم إنشاء Express API بنجاح في ${projectPath}`
    };
    
  } catch (error) {
    console.error('Create Express API error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * تحليل كود وإعطاء اقتراحات للتحسين
 */
export async function analyzeCode(code, language = 'javascript') {
  try {
    const analysis = {
      language,
      linesOfCode: code.split('\n').length,
      issues: [],
      suggestions: [],
      complexity: 'low'
    };
    
    // تحليل بسيط
    if (code.includes('var ')) {
      analysis.issues.push('استخدام var بدلاً من let/const');
      analysis.suggestions.push('استخدم let أو const بدلاً من var');
    }
    
    if (code.includes('console.log') && code.split('console.log').length > 5) {
      analysis.issues.push('استخدام مفرط لـ console.log');
      analysis.suggestions.push('قم بإزالة console.log غير الضرورية في الإنتاج');
    }
    
    if (!code.includes('try') && !code.includes('catch')) {
      analysis.suggestions.push('أضف معالجة للأخطاء باستخدام try/catch');
    }
    
    // تحديد التعقيد
    const functionCount = (code.match(/function/g) || []).length;
    if (functionCount > 10) {
      analysis.complexity = 'high';
    } else if (functionCount > 5) {
      analysis.complexity = 'medium';
    }
    
    return {
      success: true,
      analysis
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

export const softwareDevelopmentTools = {
  createReactProject,
  createExpressAPI,
  analyzeCode
};
