/**
 * Build Tools - أدوات بناء المشاريع
 * يوفر قدرات بناء المواقع والتطبيقات لـ JOE
 */

import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * بناء مشروع ويب كامل
 */
export async function buildProject({ projectType, description, style, features }) {
  try {
    console.log(`🏗️ Building ${projectType} project...`);

    const projectName = `joe-project-${Date.now()}`;
    const projectPath = path.join('/tmp', projectName);

    // إنشاء مجلد المشروع
    await fs.mkdir(projectPath, { recursive: true });

    // إنشاء الملفات الأساسية
    const files = await generateProjectFiles(projectType, description, style, features);

    // كتابة الملفات
    for (const [filename, content] of Object.entries(files)) {
      await fs.writeFile(path.join(projectPath, filename), content, 'utf-8');
    }

    return {
      success: true,
      projectName,
      projectPath,
      files: Object.keys(files),
      message: `تم بناء المشروع بنجاح! المسار: ${projectPath}`
    };
  } catch (error) {
    console.error('Build project error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * توليد ملفات المشروع بناءً على النوع
 */
async function generateProjectFiles(projectType, description, style, features) {
  const files = {};

  // HTML الأساسي
  files['index.html'] = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${description}</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="container">
        <header>
            <h1>${description}</h1>
            <p>تم البناء بواسطة JOE AI</p>
        </header>
        
        <main>
            <section class="hero">
                <h2>مرحباً بك!</h2>
                <p>هذا موقع تم إنشاؤه بواسطة الذكاء الاصطناعي JOE</p>
                <button class="cta-button">ابدأ الآن</button>
            </section>
            
            <section class="features">
                <h3>المميزات</h3>
                <div class="feature-grid">
                    ${features.map(feature => `
                    <div class="feature-card">
                        <h4>${feature}</h4>
                        <p>ميزة رائعة من مميزات الموقع</p>
                    </div>
                    `).join('')}
                </div>
            </section>
        </main>
        
        <footer>
            <p>© 2025 - تم البناء بواسطة JOE AI</p>
        </footer>
    </div>
    <script src="script.js"></script>
</body>
</html>`;

  // CSS
  files['styles.css'] = `* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
    color: #333;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
}

header {
    text-align: center;
    color: white;
    padding: 40px 0;
}

header h1 {
    font-size: 3rem;
    margin-bottom: 10px;
    animation: fadeInDown 1s ease;
}

header p {
    font-size: 1.2rem;
    opacity: 0.9;
}

main {
    background: white;
    border-radius: 20px;
    padding: 40px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.2);
    animation: fadeInUp 1s ease;
}

.hero {
    text-align: center;
    padding: 40px 0;
}

.hero h2 {
    font-size: 2.5rem;
    color: #667eea;
    margin-bottom: 20px;
}

.cta-button {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    padding: 15px 40px;
    font-size: 1.1rem;
    border-radius: 50px;
    cursor: pointer;
    transition: transform 0.3s ease;
}

.cta-button:hover {
    transform: scale(1.05);
}

.features {
    margin-top: 60px;
}

.features h3 {
    text-align: center;
    font-size: 2rem;
    margin-bottom: 40px;
    color: #333;
}

.feature-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 30px;
}

.feature-card {
    background: #f8f9fa;
    padding: 30px;
    border-radius: 15px;
    text-align: center;
    transition: transform 0.3s ease;
}

.feature-card:hover {
    transform: translateY(-10px);
    box-shadow: 0 10px 30px rgba(0,0,0,0.1);
}

.feature-card h4 {
    color: #667eea;
    margin-bottom: 15px;
    font-size: 1.5rem;
}

footer {
    text-align: center;
    color: white;
    padding: 40px 0;
    margin-top: 40px;
}

@keyframes fadeInDown {
    from {
        opacity: 0;
        transform: translateY(-30px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(30px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@media (max-width: 768px) {
    header h1 {
        font-size: 2rem;
    }
    
    .hero h2 {
        font-size: 1.8rem;
    }
    
    .feature-grid {
        grid-template-columns: 1fr;
    }
}`;

  // JavaScript
  files['script.js'] = `// JOE AI Generated JavaScript
console.log('🤖 JOE AI Website - Powered by Artificial Intelligence');

// إضافة تفاعلية للأزرار
document.addEventListener('DOMContentLoaded', () => {
    const ctaButton = document.querySelector('.cta-button');
    
    if (ctaButton) {
        ctaButton.addEventListener('click', () => {
            alert('مرحباً! تم إنشاء هذا الموقع بواسطة JOE AI 🤖');
        });
    }
    
    // إضافة تأثيرات للبطاقات
    const featureCards = document.querySelectorAll('.feature-card');
    featureCards.forEach((card, index) => {
        card.style.animationDelay = \`\${index * 0.1}s\`;
        card.style.animation = 'fadeInUp 0.6s ease forwards';
    });
});`;

  // README
  files['README.md'] = `# ${description}

تم إنشاء هذا المشروع بواسطة **JOE AI** - الذكاء الاصطناعي المتقدم.

## المميزات
${features.map(f => `- ${f}`).join('\n')}

## نوع المشروع
${projectType}

## الأسلوب
${style}

## كيفية الاستخدام
1. افتح ملف \`index.html\` في المتصفح
2. استمتع بالموقع!

---
تم البناء بواسطة JOE AI 🤖
`;

  return files;
}

export const buildTools = {
  buildProject
};
