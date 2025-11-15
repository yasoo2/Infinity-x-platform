// backend/src/lib/projectTools.mjs - أدوات توليد المشاريع المتقدمة
import { getDB } from '../db.mjs';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export class ProjectTools {
    constructor() {
        this.templates = new Map();
        this.generators = new Map();
        this.setupGenerators();
    }

    setupGenerators() {
        this.generators.set('website', this.generateWebsite.bind(this));
        this.generators.set('webapp', this.generateWebApp.bind(this));
        this.generators.set('ecommerce', this.generateEcommerce.bind(this));
        this.generators.set('api', this.generateAPI.bind(this));
        this.generators.set('mobile', this.generateMobileApp.bind(this));
    }

    async generateProject(type, requirements, projectId) {
        try {
            console.log(`🚀 Generating ${type} project: ${projectId}`);
            
            const generator = this.generators.get(type);
            if (!generator) {
                throw new Error(`Unknown project type: ${type}`);
            }

            const project = await generator(requirements, projectId);
            
            // حفظ في قاعدة البيانات
            await this.saveProject(projectId, type, requirements, project);
            
            console.log(`✅ Project generated successfully: ${projectId}`);
            return project;

        } catch (error) {
            console.error('❌ Project generation error:', error);
            return { success: false, error: error.message };
        }
    }

    async generateWebsite(requirements, projectId) {
        const { title = 'My Website', description = 'A modern website', theme = 'professional' } = requirements;

        const files = {
            'index.html': this.generateHTML(title, description, theme),
            'styles.css': this.generateCSS(theme),
            'script.js': this.generateJavaScript('website'),
            'package.json': this.generatePackageJson(title, 'website'),
            'README.md': this.generateReadme(title, 'website')
        };

        return {
            success: true,
            projectId,
            type: 'website',
            files,
            structure: this.generateProjectStructure('website'),
            deployment: {
                type: 'static',
                platforms: ['netlify', 'vercel', 'github-pages']
            }
        };
    }

    async generateWebApp(requirements, projectId) {
        const { title = 'My Web App', framework = 'react', features = [] } = requirements;

        const files = {
            'src/App.js': this.generateReactApp(title, features),
            'src/App.css': this.generateAppCSS(),
            'src/index.js': this.generateReactIndex(),
            'public/index.html': this.generateReactHTML(title),
            'package.json': this.generatePackageJson(title, 'webapp', framework),
            'README.md': this.generateReadme(title, 'webapp')
        };

        return {
            success: true,
            projectId,
            type: 'webapp',
            files,
            structure: this.generateProjectStructure('webapp'),
            deployment: {
                type: 'spa',
                platforms: ['netlify', 'vercel']
            }
        };
    }

    generateHTML(title, description, theme) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <meta name="description" content="${description}">
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <header class="header">
        <nav class="nav">
            <div class="logo">${title}</div>
            <ul class="nav-links">
                <li><a href="#home">Home</a></li>
                <li><a href="#about">About</a></li>
                <li><a href="#services">Services</a></li>
                <li><a href="#contact">Contact</a></li>
            </ul>
        </nav>
    </header>

    <main>
        <section id="home" class="hero">
            <div class="hero-content">
                <h1>Welcome to ${title}</h1>
                <p>${description}</p>
                <button class="cta-button">Get Started</button>
            </div>
        </section>

        <section id="about" class="section">
            <div class="container">
                <h2>About Us</h2>
                <p>We are dedicated to providing excellent services and solutions.</p>
            </div>
        </section>

        <section id="services" class="section">
            <div class="container">
                <h2>Our Services</h2>
                <div class="services-grid">
                    <div class="service-card">
                        <h3>Service 1</h3>
                        <p>Professional service description</p>
                    </div>
                    <div class="service-card">
                        <h3>Service 2</h3>
                        <p>Another great service</p>
                    </div>
                    <div class="service-card">
                        <h3>Service 3</h3>
                        <p>Exceptional quality service</p>
                    </div>
                </div>
            </div>
        </section>
    </main>

    <footer class="footer">
        <div class="container">
            <p>&copy; 2025 ${title}. All rights reserved.</p>
        </div>
    </footer>

    <script src="script.js"></script>
</body>
</html>`;
    }

    generateCSS(theme) {
        const themes = {
            professional: `
:root {
    --primary-color: #2563eb;
    --secondary-color: #64748b;
    --text-color: #1e293b;
    --bg-color: #ffffff;
    --card-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    line-height: 1.6;
    color: var(--text-color);
    background-color: var(--bg-color);
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
}

.header {
    background: var(--bg-color);
    box-shadow: var(--card-shadow);
    position: sticky;
    top: 0;
    z-index: 100;
}

.nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 0;
}

.logo {
    font-size: 1.5rem;
    font-weight: bold;
    color: var(--primary-color);
}

.nav-links {
    display: flex;
    list-style: none;
    gap: 2rem;
}

.nav-links a {
    text-decoration: none;
    color: var(--text-color);
    font-weight: 500;
    transition: color 0.3s ease;
}

.nav-links a:hover {
    color: var(--primary-color);
}

.hero {
    background: linear-gradient(135deg, var(--primary-color), #3b82f6);
    color: white;
    padding: 6rem 0;
    text-align: center;
}

.hero-content h1 {
    font-size: 3rem;
    margin-bottom: 1rem;
}

.hero-content p {
    font-size: 1.2rem;
    margin-bottom: 2rem;
    opacity: 0.9;
}

.cta-button {
    background: white;
    color: var(--primary-color);
    border: none;
    padding: 1rem 2rem;
    font-size: 1.1rem;
    font-weight: 600;
    border-radius: 8px;
    cursor: pointer;
    transition: transform 0.2s ease;
}

.cta-button:hover {
    transform: translateY(-2px);
}

.section {
    padding: 4rem 0;
}

.section h2 {
    font-size: 2.5rem;
    margin-bottom: 2rem;
    text-align: center;
    color: var(--text-color);
}

.services-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;
    margin-top: 3rem;
}

.service-card {
    background: white;
    padding: 2rem;
    border-radius: 12px;
    box-shadow: var(--card-shadow);
    transition: transform 0.2s ease;
}

.service-card:hover {
    transform: translateY(-4px);
}

.service-card h3 {
    color: var(--primary-color);
    margin-bottom: 1rem;
}

.footer {
    background: var(--text-color);
    color: white;
    text-align: center;
    padding: 2rem 0;
}

@media (max-width: 768px) {
    .nav-links {
        display: none;
    }
    
    .hero-content h1 {
        font-size: 2rem;
    }
    
    .services-grid {
        grid-template-columns: 1fr;
    }
}`
        };

        return themes.professional;
    }

    generateJavaScript(type) {
        return `
// ${type} JavaScript
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Website loaded successfully');
    
    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // CTA button interaction
    const ctaButton = document.querySelector('.cta-button');
    if (ctaButton) {
        ctaButton.addEventListener('click', function() {
            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = 'scale(1)';
            }, 150);
        });
    }

    // Add animation classes
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    });

    document.querySelectorAll('.service-card').forEach(card => {
        observer.observe(card);
    });
});
`;
    }

    generatePackageJson(name, type, framework = 'none') {
        return JSON.stringify({
            name: name.toLowerCase().replace(/\s+/g, '-'),
            version: '1.0.0',
            description: `A modern ${type} built with Joe`,
            main: type === 'website' ? 'index.html' : 'src/index.js',
            scripts: {
                start: type === 'website' ? 'serve -s .' : 'react-scripts start',
                build: type === 'website' ? 'echo "Static site"' : 'react-scripts build',
                test: 'echo "No tests specified"'
            },
            dependencies: this.getDependencies(type, framework),
            devDependencies: this.getDevDependencies(type, framework)
        }, null, 2);
    }

    getDependencies(type, framework) {
        const deps = {};
        
        if (type === 'webapp') {
            if (framework === 'react') {
                deps.react = '^18.2.0';
                deps['react-dom'] = '^18.2.0';
                deps['react-scripts'] = '5.0.1';
            }
        }
        
        return deps;
    }

    getDevDependencies(type, framework) {
        return {};
    }

    generateReadme(name, type) {
        return `# ${name}

A modern ${type} generated by Joe - Your AI Development Assistant.

## Features
- ✅ Responsive design
- ✅ Modern UI/UX
- ✅ SEO optimized
- ✅ Performance optimized
- ✅ Cross-browser compatible

## Technologies Used
- HTML5
- CSS3
- JavaScript (ES6+)
- Modern build tools

## Getting Started
1. Clone or download this project
2. Open \`index.html\` in your browser
3. Start customizing!

## Deployment
This project can be deployed to:
- Netlify
- Vercel
- GitHub Pages
- Any static hosting service

## Support
Built with ❤️ by Joe AI

---
Generated on ${new Date().toLocaleDateString()}
`;
    }

    generateProjectStructure(type) {
        const structures = {
            website: {
                type: 'static',
                files: ['index.html', 'styles.css', 'script.js', 'package.json', 'README.md'],
                directories: []
            },
            webapp: {
                type: 'spa',
                files: ['src/App.js', 'src/App.css', 'src/index.js', 'public/index.html'],
                directories: ['src', 'public']
            }
        };
        return structures[type] || structures.website;
    }

    async saveProject(projectId, type, requirements, project) {
        try {
            const db = getDB();
            await db.collection('joe_projects').insertOne({
                projectId,
                type,
                requirements,
                project,
                createdAt: new Date(),
                status: 'completed'
            });
        } catch (error) {
            console.error('❌ Save project error:', error);
        }
    }
}

export default ProjectTools;
