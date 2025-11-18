/**
 * 🛠️ JOE Advanced Project Tools - أدوات توليد المشاريع المتقدمة
 * نظام شامل لتوليد جميع أنواع المشاريع بذكاء اصطناعي
 * 
 * @module ProjectTools
 * @version 3.0.0
 * @description نظام متطور لتوليد المشاريع مع دعم AI وقوالب متعددة
 */

import { getDB } from '../db.mjs';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';

/**
 * 🎨 مدير أدوات المشاريع المتقدم
 */
export class AdvancedProjectTools extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.templates = new Map();
        this.generators = new Map();
        
        this.supportedTypes = new Set([
            'website', 'webapp', 'ecommerce', 'api', 'mobile', 'desktop',
            'chrome-extension', 'vscode-extension', 'npm-package',
            'wordpress-theme', 'wordpress-plugin'
        ]);
        
        this.supportedThemes = new Set([
            'professional', 'modern', 'minimal', 'creative', 'dark',
            'light', 'colorful', 'elegant', 'corporate', 'startup'
        ]);
        
        this.supportedFrameworks = new Map([
            ['react', { version: '^18.2.0', type: 'frontend' }],
            ['vue', { version: '^3.3.0', type: 'frontend' }],
            ['angular', { version: '^17.0.0', type: 'frontend' }],
            ['svelte', { version: '^4.0.0', type: 'frontend' }],
            ['next', { version: '^14.0.0', type: 'fullstack' }],
            ['nuxt', { version: '^3.8.0', type: 'fullstack' }],
            ['express', { version: '^4.18.0', type: 'backend' }],
            ['fastify', { version: '^4.24.0', type: 'backend' }],
            ['nest', { version: '^10.0.0', type: 'backend' }]
        ]);
        
        this.stats = {
            totalGenerated: 0,
            byType: {},
            byFramework: {},
            byTheme: {},
            avgGenerationTime: 0,
            totalGenerationTime: 0
        };
        
        this.config = {
            outputDir: options.outputDir || '/tmp/joe-projects',
            enableCache: options.enableCache !== false,
            enableMetrics: options.enableMetrics !== false,
            defaultTheme: options.defaultTheme || 'professional',
            defaultFramework: options.defaultFramework || 'react'
        };
        
        this.setupGenerators();
        this.loadTemplates();
        
        console.log('✅ Advanced Project Tools initialized');
    }

    setupGenerators() {
        this.generators.set('website', this.generateWebsite.bind(this));
        this.generators.set('webapp', this.generateWebApp.bind(this));
        this.generators.set('ecommerce', this.generateEcommerce.bind(this));
        this.generators.set('api', this.generateAPI.bind(this));
        this.generators.set('mobile', this.generateMobileApp.bind(this));
        this.generators.set('desktop', this.generateDesktopApp.bind(this));
        this.generators.set('chrome-extension', this.generateChromeExtension.bind(this));
        this.generators.set('vscode-extension', this.generateVSCodeExtension.bind(this));
        this.generators.set('npm-package', this.generateNPMPackage.bind(this));
        this.generators.set('wordpress-theme', this.generateWordPressTheme.bind(this));
        this.generators.set('wordpress-plugin', this.generateWordPressPlugin.bind(this));
        
        console.log(`🔧 Loaded ${this.generators.size} project generators`);
    }

    loadTemplates() {
        this.templates.set('html5-boilerplate', this.getHTML5Boilerplate());
        this.templates.set('react-boilerplate', this.getReactBoilerplate());
        this.templates.set('vue-boilerplate', this.getVueBoilerplate());
        this.templates.set('api-boilerplate', this.getAPIBoilerplate());
        
        console.log(`🎨 Loaded ${this.templates.size} templates`);
    }

    async generateProject(type, requirements, projectId = null) {
        const startTime = Date.now();
        
        try {
            projectId = projectId || uuidv4();
            
            console.log(`🚀 Generating ${type} project: ${projectId}`);
            this.emit('generation:started', { type, projectId });

            if (!this.supportedTypes.has(type)) {
                throw new Error(`Unsupported project type: ${type}. Supported types: ${Array.from(this.supportedTypes).join(', ')}`);
            }

            const generator = this.generators.get(type);
            if (!generator) {
                throw new Error(`Generator not found for type: ${type}`);
            }

            const project = await generator(requirements, projectId);

            await this.saveProject(projectId, type, requirements, project);

            const generationTime = Date.now() - startTime;
            this.updateStats(type, requirements.framework, requirements.theme, generationTime);

            console.log(`✅ Project generated successfully: ${projectId} in ${generationTime}ms`);
            this.emit('generation:completed', { type, projectId, generationTime });

            return {
                ...project,
                generationTime,
                timestamp: new Date()
            };

        } catch (error) {
            console.error('❌ Project generation error:', error);
            this.emit('generation:failed', { type, projectId, error });
            
            return {
                success: false,
                error: error.message,
                projectId
            };
        }
    }

    async generateWebsite(requirements, projectId) {
        const {
            title = 'My Website',
            description = 'A modern website',
            theme = this.config.defaultTheme,
            sections = ['home', 'about', 'services', 'contact'],
            features = [],
            seo = true,
            analytics = false,
            multiLanguage = false
        } = requirements;

        console.log(`🌐 Generating website with theme: ${theme}`);

        const files = {
            'index.html': this.generateHTML(title, description, theme, sections),
            'styles.css': this.generateCSS(theme),
            'script.js': this.generateJavaScript('website', features),
            'package.json': this.generatePackageJson(title, 'website'),
            'README.md': this.generateReadme(title, 'website', requirements),
            '.gitignore': this.generateGitignore('website')
        };

        if (seo) {
            files['robots.txt'] = this.generateRobotsTxt();
            files['sitemap.xml'] = this.generateSitemap(title, sections);
            files['manifest.json'] = this.generateManifest(title, description);
        }

        if (analytics) {
            files['analytics.js'] = this.generateAnalytics();
        }

        if (multiLanguage) {
            files['i18n/en.json'] = JSON.stringify({ title, description }, null, 2);
            files['i18n/ar.json'] = JSON.stringify({ title, description }, null, 2);
        }

        return {
            success: true,
            projectId,
            type: 'website',
            files,
            structure: this.generateProjectStructure('website'),
            deployment: {
                type: 'static',
                platforms: ['netlify', 'vercel', 'github-pages', 'cloudflare-pages'],
                recommended: 'netlify'
            },
            metadata: {
                theme,
                sections,
                features,
                seo,
                analytics,
                multiLanguage
            }
        };
    }

    async generateWebApp(requirements, projectId) {
        const {
            title = 'My Web App',
            description = 'A modern web application',
            framework = this.config.defaultFramework,
            features = [],
            routing = true,
            stateManagement = 'context',
            api = false,
            auth = false,
            database = false,
            pwa = false
        } = requirements;

        console.log(`📱 Generating web app with framework: ${framework}`);

        if (!this.supportedFrameworks.has(framework)) {
            throw new Error(`Unsupported framework: ${framework}`);
        }

        const files = {};

        switch (framework) {
            case 'react':
                Object.assign(files, this.generateReactApp(title, features, requirements));
                break;
            case 'vue':
                Object.assign(files, this.generateVueApp(title, features, requirements));
                break;
            case 'angular':
                Object.assign(files, this.generateAngularApp(title, features, requirements));
                break;
            case 'svelte':
                Object.assign(files, this.generateSvelteApp(title, features, requirements));
                break;
            case 'next':
                Object.assign(files, this.generateNextApp(title, features, requirements));
                break;
            default:
                Object.assign(files, this.generateReactApp(title, features, requirements));
        }

        files['package.json'] = this.generatePackageJson(title, 'webapp', framework, requirements);
        files['README.md'] = this.generateReadme(title, 'webapp', requirements);
        files['.gitignore'] = this.generateGitignore('webapp');
        files['.env.example'] = this.generateEnvExample(requirements);

        if (pwa) {
            files['public/manifest.json'] = this.generateManifest(title, description);
            files['public/service-worker.js'] = this.generateServiceWorker();
        }

        if (api) {
            files['src/api/client.js'] = this.generateAPIClient();
        }

        if (auth) {
            files['src/auth/AuthContext.js'] = this.generateAuthContext();
            files['src/auth/ProtectedRoute.js'] = this.generateProtectedRoute();
        }

        return {
            success: true,
            projectId,
            type: 'webapp',
            files,
            structure: this.generateProjectStructure('webapp', framework),
            deployment: {
                type: 'spa',
                platforms: ['netlify', 'vercel', 'render'],
                recommended: 'vercel'
            },
            metadata: {
                framework,
                features,
                routing,
                stateManagement,
                api,
                auth,
                database,
                pwa
            }
        };
    }

    async generateEcommerce(requirements, projectId) {
        const {
            title = 'My Store',
            description = 'An online store',
            framework = 'next',
            products = [],
            categories = [],
            payment = ['stripe', 'paypal'],
            shipping = true,
            inventory = true,
            reviews = true,
            wishlist = true,
            cart = true,
            admin = true
        } = requirements;

        console.log(`🛒 Generating e-commerce store: ${title}`);

        const files = {
            'src/pages/index.js': this.generateEcommerceHome(title, products),
            'src/pages/products/[id].js': this.generateProductPage(),
            'src/pages/cart.js': this.generateCartPage(),
            'src/pages/checkout.js': this.generateCheckoutPage(),
            'src/components/ProductCard.js': this.generateProductCard(),
            'src/components/Cart.js': this.generateCartComponent(),
            'src/components/Header.js': this.generateEcommerceHeader(),
            'src/components/Footer.js': this.generateEcommerceFooter(),
            'src/context/CartContext.js': this.generateCartContext(),
            'src/context/ProductContext.js': this.generateProductContext(),
            'src/api/products.js': this.generateProductsAPI(),
            'src/api/orders.js': this.generateOrdersAPI(),
            'src/utils/currency.js': this.generateCurrencyUtils(),
            'src/utils/validation.js': this.generateValidationUtils(),
            'package.json': this.generatePackageJson(title, 'ecommerce', framework, requirements),
            'README.md': this.generateReadme(title, 'ecommerce', requirements),
            '.env.example': this.generateEcommerceEnv(payment)
        };

        if (admin) {
            files['src/pages/admin/dashboard.js'] = this.generateAdminDashboard();
            files['src/pages/admin/products.js'] = this.generateAdminProducts();
            files['src/pages/admin/orders.js'] = this.generateAdminOrders();
        }

        return {
            success: true,
            projectId,
            type: 'ecommerce',
            files,
            structure: this.generateProjectStructure('ecommerce'),
            deployment: {
                type: 'fullstack',
                platforms: ['vercel', 'netlify', 'render'],
                recommended: 'vercel'
            },
            metadata: {
                framework,
                products: products.length,
                categories: categories.length,
                payment,
                features: { shipping, inventory, reviews, wishlist, cart, admin }
            }
        };
    }

    async generateAPI(requirements, projectId) {
        const {
            title = 'My API',
            description = 'A RESTful API',
            framework = 'express',
            database = 'mongodb',
            auth = 'jwt',
            endpoints = [],
            swagger = true,
            rateLimit = true,
            cors = true,
            logging = true
        } = requirements;

        console.log(`🔌 Generating API with framework: ${framework}`);

        const files = {
            'src/index.js': this.generateAPIIndex(framework),
            'src/config/database.js': this.generateDatabaseConfig(database),
            'src/config/auth.js': this.generateAuthConfig(auth),
            'src/middleware/auth.js': this.generateAuthMiddleware(),
            'src/middleware/errorHandler.js': this.generateErrorHandler(),
            'src/routes/index.js': this.generateAPIRoutes(endpoints),
            'src/controllers/index.js': this.generateAPIControllers(endpoints),
            'src/models/index.js': this.generateAPIModels(endpoints),
            'package.json': this.generatePackageJson(title, 'api', framework, requirements),
            'README.md': this.generateReadme(title, 'api', requirements),
            '.env.example': this.generateAPIEnv(database, auth)
        };

        if (swagger) {
            files['src/swagger.js'] = this.generateSwagger(title, description, endpoints);
        }

        return {
            success: true,
            projectId,
            type: 'api',
            files,
            structure: this.generateProjectStructure('api'),
            deployment: {
                type: 'backend',
                platforms: ['heroku', 'render', 'railway', 'fly.io'],
                recommended: 'render'
            },
            metadata: {
                framework,
                database,
                auth,
                endpoints: endpoints.length,
                features: { swagger, rateLimit, cors, logging }
            }
        };
    }

    async generateMobileApp(requirements, projectId) {
        const {
            title = 'My Mobile App',
            description = 'A mobile application',
            framework = 'react-native',
            platform = 'both',
            features = [],
            navigation = true,
            stateManagement = 'redux',
            api = false,
            push = false,
            maps = false,
            camera = false
        } = requirements;

        console.log(`📱 Generating mobile app with framework: ${framework}`);

        const files = {
            'App.js': this.generateMobileApp(title, features),
            'src/screens/HomeScreen.js': this.generateHomeScreen(),
            'src/navigation/AppNavigator.js': this.generateAppNavigator(),
            'src/components/Button.js': this.generateMobileButton(),
            'package.json': this.generatePackageJson(title, 'mobile', framework, requirements),
            'README.md': this.generateReadme(title, 'mobile', requirements),
            'app.json': this.generateAppJson(title, description)
        };

        return {
            success: true,
            projectId,
            type: 'mobile',
            files,
            structure: this.generateProjectStructure('mobile'),
            deployment: {
                type: 'mobile',
                platforms: ['app-store', 'play-store', 'expo'],
                recommended: 'expo'
            },
            metadata: {
                framework,
                platform,
                features,
                navigation,
                stateManagement
            }
        };
    }

    async generateDesktopApp(requirements, projectId) {
        const {
            title = 'My Desktop App',
            description = 'A desktop application',
            framework = 'electron',
            platform = 'all',
            features = []
        } = requirements;

        console.log(`🖥️ Generating desktop app with framework: ${framework}`);

        const files = {
            'main.js': this.generateElectronMain(),
            'src/index.html': this.generateElectronHTML(title),
            'src/renderer.js': this.generateElectronRenderer(),
            'package.json': this.generatePackageJson(title, 'desktop', framework, requirements),
            'README.md': this.generateReadme(title, 'desktop', requirements)
        };

        return {
            success: true,
            projectId,
            type: 'desktop',
            files,
            structure: this.generateProjectStructure('desktop'),
            deployment: {
                type: 'desktop',
                platforms: ['windows', 'mac', 'linux'],
                recommended: 'electron-builder'
            },
            metadata: {
                framework,
                platform,
                features
            }
        };
    }

    async generateChromeExtension(requirements, projectId) {
        const {
            title = 'My Extension',
            description = 'A Chrome extension',
            permissions = ['activeTab'],
            features = []
        } = requirements;

        const files = {
            'manifest.json': this.generateExtensionManifest(title, description, permissions),
            'popup.html': this.generateExtensionPopup(title),
            'popup.js': this.generateExtensionPopupJS(),
            'background.js': this.generateExtensionBackground(),
            'content.js': this.generateExtensionContent(),
            'styles.css': this.generateExtensionCSS(),
            'README.md': this.generateReadme(title, 'chrome-extension', requirements)
        };

        return {
            success: true,
            projectId,
            type: 'chrome-extension',
            files,
            structure: this.generateProjectStructure('chrome-extension'),
            deployment: {
                type: 'extension',
                platforms: ['chrome-web-store'],
                recommended: 'chrome-web-store'
            },
            metadata: {
                permissions,
                features
            }
        };
    }

    async generateVSCodeExtension(requirements, projectId) {
        const {
            title = 'My VS Code Extension',
            description = 'A VS Code extension',
            commands = [],
            features = []
        } = requirements;

        const files = {
            'package.json': this.generateVSCodePackageJson(title, description, commands),
            'extension.js': this.generateVSCodeExtension(commands),
            'README.md': this.generateReadme(title, 'vscode-extension', requirements)
        };

        return {
            success: true,
            projectId,
            type: 'vscode-extension',
            files,
            structure: this.generateProjectStructure('vscode-extension'),
            deployment: {
                type: 'extension',
                platforms: ['vscode-marketplace'],
                recommended: 'vscode-marketplace'
            },
            metadata: {
                commands,
                features
            }
        };
    }

    async generateNPMPackage(requirements, projectId) {
        const {
            title = 'my-package',
            description = 'An NPM package',
            type = 'library',
            features = []
        } = requirements;

        const files = {
            'src/index.js': this.generatePackageIndex(type),
            'test/index.test.js': this.generatePackageTests(),
            'package.json': this.generatePackageJson(title, 'npm-package', null, requirements),
            'README.md': this.generateReadme(title, 'npm-package', requirements),
            '.npmignore': this.generateNPMIgnore(),
            'LICENSE': this.generateLicense()
        };

        return {
            success: true,
            projectId,
            type: 'npm-package',
            files,
            structure: this.generateProjectStructure('npm-package'),
            deployment: {
                type: 'package',
                platforms: ['npm', 'yarn'],
                recommended: 'npm'
            },
            metadata: {
                packageType: type,
                features
            }
        };
    }

    async generateWordPressTheme(requirements, projectId) {
        const {
            title = 'My Theme',
            description = 'A WordPress theme',
            features = []
        } = requirements;

        const files = {
            'style.css': this.generateWPThemeStyle(title, description),
            'index.php': this.generateWPIndex(),
            'functions.php': this.generateWPFunctions(),
            'header.php': this.generateWPHeader(),
            'footer.php': this.generateWPFooter(),
            'sidebar.php': this.generateWPSidebar(),
            'README.md': this.generateReadme(title, 'wordpress-theme', requirements)
        };

        return {
            success: true,
            projectId,
            type: 'wordpress-theme',
            files,
            structure: this.generateProjectStructure('wordpress-theme'),
            deployment: {
                type: 'wordpress',
                platforms: ['wordpress.org', 'themeforest'],
                recommended: 'wordpress.org'
            },
            metadata: {
                features
            }
        };
    }

    async generateWordPressPlugin(requirements, projectId) {
        const {
            title = 'My Plugin',
            description = 'A WordPress plugin',
            features = []
        } = requirements;

        const files = {
            'plugin.php': this.generateWPPluginMain(title, description),
            'includes/class-plugin.php': this.generateWPPluginClass(),
            'admin/admin.php': this.generateWPPluginAdmin(),
            'public/public.php': this.generateWPPluginPublic(),
            'README.md': this.generateReadme(title, 'wordpress-plugin', requirements)
        };

        return {
            success: true,
            projectId,
            type: 'wordpress-plugin',
            files,
            structure: this.generateProjectStructure('wordpress-plugin'),
            deployment: {
                type: 'wordpress',
                platforms: ['wordpress.org'],
                recommended: 'wordpress.org'
            },
            metadata: {
                features
            }
        };
    }

    generateHTML(title, description, theme, sections) {
        const sectionsHTML = sections.map(section => {
            switch (section) {
                case 'home':
                    return `
    <section id="home" class="hero">
        <div class="hero-content">
            <h1>Welcome to ${title}</h1>
            <p>${description}</p>
            <button class="cta-button">Get Started</button>
        </div>
    </section>`;
                
                case 'about':
                    return `
    <section id="about" class="section">
        <div class="container">
            <h2>About Us</h2>
            <p>We are dedicated to providing excellent services and solutions.</p>
        </div>
    </section>`;
                
                case 'services':
                    return `
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
    </section>`;
                
                case 'contact':
                    return `
    <section id="contact" class="section">
        <div class="container">
            <h2>Contact Us</h2>
            <form class="contact-form">
                <input type="text" placeholder="Name" required>
                <input type="email" placeholder="Email" required>
                <textarea placeholder="Message" required></textarea>
                <button type="submit">Send Message</button>
            </form>
        </div>
    </section>`;
                
                default:
                    return '';
            }
        }).join('\n');

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="${description}">
    <meta name="keywords" content="${title}, modern website, professional">
    <meta name="author" content="Joe AI">
    <title>${title}</title>
    <link rel="stylesheet" href="styles.css">
    <link rel="manifest" href="manifest.json">
    <meta name="theme-color" content="#2563eb">
</head>
<body>
    <header class="header">
        <nav class="nav container">
            <div class="logo">${title}</div>
            <ul class="nav-links">
                ${sections.map(s => `<li><a href="#${s}">${s.charAt(0).toUpperCase() + s.slice(1)}</a></li>`).join('\n                ')}
            </ul>
            <button class="mobile-menu-toggle" aria-label="Toggle menu">
                <span></span>
                <span></span>
                <span></span>
            </button>
        </nav>
    </header>

    <main>
${sectionsHTML}
    </main>

    <footer class="footer">
        <div class="container">
            <p>&copy; ${new Date().getFullYear()} ${title}. All rights reserved.</p>
            <p>Built with ❤️ by <a href="https://joe-ai.com" target="_blank">Joe AI</a></p>
        </div>
    </footer>

    <script src="script.js"></script>
</body>
</html>`;
    }

    generateCSS(theme) {
        const themes = {
            professional: {
                primary: '#2563eb',
                secondary: '#64748b',
                text: '#1e293b',
                bg: '#ffffff',
                accent: '#3b82f6'
            },
            modern: {
                primary: '#8b5cf6',
                secondary: '#a78bfa',
                text: '#1f2937',
                bg: '#f9fafb',
                accent: '#7c3aed'
            },
            minimal: {
                primary: '#000000',
                secondary: '#6b7280',
                text: '#111827',
                bg: '#ffffff',
                accent: '#374151'
            },
            creative: {
                primary: '#f59e0b',
                secondary: '#ef4444',
                text: '#1f2937',
                bg: '#fef3c7',
                accent: '#dc2626'
            },
            dark: {
                primary: '#3b82f6',
                secondary: '#6b7280',
                text: '#f9fafb',
                bg: '#111827',
                accent: '#2563eb'
            }
        };

        const colors = themes[theme] || themes.professional;

        return `/* ${theme.toUpperCase()} THEME - Generated by Joe AI */

:root {
    --primary-color: ${colors.primary};
    --secondary-color: ${colors.secondary};
    --text-color: ${colors.text};
    --bg-color: ${colors.bg};
    --accent-color: ${colors.accent};
    --card-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

html {
    scroll-behavior: smooth;
}

body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.6;
    color: var(--text-color);
    background-color: var(--bg-color);
    overflow-x: hidden;
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
    backdrop-filter: blur(10px);
}

.nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 0;
}

.logo {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--primary-color);
    letter-spacing: -0.5px;
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
    transition: var(--transition);
    position: relative;
}

.nav-links a::after {
    content: '';
    position: absolute;
    bottom: -5px;
    left: 0;
    width: 0;
    height: 2px;
    background: var(--primary-color);
    transition: var(--transition);
}

.nav-links a:hover::after {
    width: 100%;
}

.mobile-menu-toggle {
    display: none;
    flex-direction: column;
    gap: 4px;
    background: none;
    border: none;
    cursor: pointer;
    padding: 8px;
}

.mobile-menu-toggle span {
    width: 25px;
    height: 3px;
    background: var(--text-color);
    border-radius: 2px;
    transition: var(--transition);
}

.hero {
    background: linear-gradient(135deg, var(--primary-color), var(--accent-color));
    color: white;
    padding: 8rem 0;
    text-align: center;
    position: relative;
    overflow: hidden;
}

.hero::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: url('data:image/svg+xml,<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="2" fill="white" opacity="0.1"/></svg>');
    opacity: 0.3;
}

.hero-content {
    position: relative;
    z-index: 1;
}

.hero-content h1 {
    font-size: clamp(2rem, 5vw, 3.5rem);
    margin-bottom: 1rem;
    font-weight: 800;
    letter-spacing: -1px;
}

.hero-content p {
    font-size: clamp(1rem, 2vw, 1.25rem);
    margin-bottom: 2rem;
    opacity: 0.95;
    max-width: 600px;
    margin-left: auto;
    margin-right: auto;
}

.cta-button {
    background: white;
    color: var(--primary-color);
    border: none;
    padding: 1rem 2.5rem;
    font-size: 1.1rem;
    font-weight: 600;
    border-radius: 50px;
    cursor: pointer;
    transition: var(--transition);
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
}

.cta-button:hover {
    transform: translateY(-3px);
    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3);
}

.cta-button:active {
    transform: translateY(-1px);
}

.section {
    padding: 5rem 0;
}

.section h2 {
    font-size: clamp(2rem, 4vw, 2.5rem);
    margin-bottom: 3rem;
    text-align: center;
    color: var(--text-color);
    font-weight: 700;
}

.services-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;
    margin-top: 3rem;
}

.service-card {
    background: var(--bg-color);
    padding: 2rem;
    border-radius: 16px;
    box-shadow: var(--card-shadow);
    transition: var(--transition);
    border: 1px solid rgba(0, 0, 0, 0.05);
}

.service-card:hover {
    transform: translateY(-8px);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
}

.service-card h3 {
    color: var(--primary-color);
    margin-bottom: 1rem;
    font-size: 1.5rem;
    font-weight: 600;
}

.service-card p {
    color: var(--secondary-color);
    line-height: 1.8;
}

.contact-form {
    max-width: 600px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.contact-form input,
.contact-form textarea {
    padding: 1rem;
    border: 2px solid rgba(0, 0, 0, 0.1);
    border-radius: 8px;
    font-size: 1rem;
    font-family: inherit;
    transition: var(--transition);
}

.contact-form input:focus,
.contact-form textarea:focus {
    outline: none;
    border-color: var(--primary-color);
}

.contact-form textarea {
    min-height: 150px;
    resize: vertical;
}

.contact-form button {
    background: var(--primary-color);
    color: white;
    border: none;
    padding: 1rem 2rem;
    font-size: 1.1rem;
    font-weight: 600;
    border-radius: 8px;
    cursor: pointer;
    transition: var(--transition);
}

.contact-form button:hover {
    background: var(--accent-color);
    transform: translateY(-2px);
}

.footer {
    background: var(--text-color);
    color: white;
    text-align: center;
    padding: 3rem 0;
    margin-top: 5rem;
}

.footer a {
    color: var(--primary-color);
    text-decoration: none;
    font-weight: 600;
}

@media (max-width: 768px) {
    .nav-links {
        display: none;
    }
    
    .mobile-menu-toggle {
        display: flex;
    }
    
    .hero {
        padding: 4rem 0;
    }
    
    .section {
        padding: 3rem 0;
    }
    
    .services-grid {
        grid-template-columns: 1fr;
    }
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.animate-in {
    animation: fadeIn 0.6s ease-out;
}

.text-center { text-align: center; }
.mt-1 { margin-top: 0.5rem; }
.mt-2 { margin-top: 1rem; }
.mt-3 { margin-top: 1.5rem; }
.mb-1 { margin-bottom: 0.5rem; }
.mb-2 { margin-bottom: 1rem; }
.mb-3 { margin-bottom: 1.5rem; }`;
    }

    generateJavaScript(type, features = []) {
        let code = `/**
 * ${type.toUpperCase()} JavaScript
 * Generated by Joe AI
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 ${type} loaded successfully');
    
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

    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    
    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', function() {
            navLinks.classList.toggle('active');
            this.classList.toggle('active');
        });
    }

    const ctaButton = document.querySelector('.cta-button');
    if (ctaButton) {
        ctaButton.addEventListener('click', function() {
            console.log('CTA button clicked');
        });
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, {
        threshold: 0.1
    });

    document.querySelectorAll('.service-card, .section').forEach(el => {
        observer.observe(el);
    });

    const contactForm = document.querySelector('.contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            console.log('Form submitted');
            alert('Thank you for your message! We will get back to you soon.');
            this.reset();
        });
    }
`;

        if (features.includes('dark-mode')) {
            code += `
    const darkModeToggle = document.createElement('button');
    darkModeToggle.textContent = '🌙';
    darkModeToggle.className = 'dark-mode-toggle';
    document.body.appendChild(darkModeToggle);
    
    darkModeToggle.addEventListener('click', function() {
        document.body.classList.toggle('dark-mode');
        this.textContent = document.body.classList.contains('dark-mode') ? '☀️' : '🌙';
    });
`;
        }

        if (features.includes('scroll-to-top')) {
            code += `
    const scrollToTop = document.createElement('button');
    scrollToTop.textContent = '↑';
    scrollToTop.className = 'scroll-to-top';
    document.body.appendChild(scrollToTop);
    
    window.addEventListener('scroll', function() {
        if (window.pageYOffset > 300) {
            scrollToTop.classList.add('visible');
        } else {
            scrollToTop.classList.remove('visible');
        }
    });
    
    scrollToTop.addEventListener('click', function() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
`;
        }

        code += `
});`;

        return code;
    }

    generatePackageJson(name, type, framework = null, requirements = {}) {
        const packageName = name.toLowerCase().replace(/\s+/g, '-');
        
        const base = {
            name: packageName,
            version: '1.0.0',
            description: requirements.description || `A modern ${type} built with Joe AI`,
            main: type === 'website' ? 'index.html' : 'src/index.js',
            scripts: {},
            keywords: [type, 'joe-ai', 'generated'],
            author: 'Joe AI',
            license: 'MIT'
        };

        switch (type) {
            case 'website':
                base.scripts = {
                    start: 'serve -s .',
                    build: 'echo "Static site - no build needed"'
                };
                base.devDependencies = {
                    'serve': '^14.2.0'
                };
                break;

            case 'webapp':
                if (framework === 'react') {
                    base.scripts = {
                        start: 'react-scripts start',
                        build: 'react-scripts build',
                        test: 'react-scripts test',
                        eject: 'react-scripts eject'
                    };
                    base.dependencies = {
                        'react': '^18.2.0',
                        'react-dom': '^18.2.0',
                        'react-router-dom': '^6.20.0'
                    };
                    base.devDependencies = {
                        'react-scripts': '5.0.1'
                    };
                } else if (framework === 'vue') {
                    base.scripts = {
                        start: 'vite',
                        build: 'vite build',
                        preview: 'vite preview'
                    };
                    base.dependencies = {
                        'vue': '^3.3.0',
                        'vue-router': '^4.2.0'
                    };
                    base.devDependencies = {
                        '@vitejs/plugin-vue': '^4.5.0',
                        'vite': '^5.0.0'
                    };
                }
                break;

            case 'api':
                base.scripts = {
                    start: 'node src/index.js',
                    dev: 'nodemon src/index.js',
                    test: 'jest'
                };
                base.dependencies = {
                    'express': '^4.18.0',
                    'cors': '^2.8.5',
                    'dotenv': '^16.3.0'
                };
                base.devDependencies = {
                    'nodemon': '^3.0.0',
                    'jest': '^29.7.0'
                };
                break;

            case 'ecommerce':
                base.scripts = {
                    dev: 'next dev',
                    build: 'next build',
                    start: 'next start'
                };
                base.dependencies = {
                    'next': '^14.0.0',
                    'react': '^18.2.0',
                    'react-dom': '^18.2.0'
                };
                break;
        }

        return JSON.stringify(base, null, 2);
    }

    generateReadme(name, type, requirements = {}) {
        const { framework, features = [], description } = requirements;

        return `# ${name}

${description || `A modern ${type} generated by Joe AI - Your Advanced Development Assistant.`}

## 🚀 Features

${features.length > 0 ? features.map(f => `- ✅ ${f}`).join('\n') : `- ✅ Modern design
- ✅ Responsive layout
- ✅ SEO optimized
- ✅ Performance optimized
- ✅ Cross-browser compatible`}

## 🛠️ Technologies

${framework ? `- **Framework:** ${framework}` : ''}
- **Generated by:** Joe AI
- **Type:** ${type}

## 📦 Installation

\`\`\`bash
npm install
npm start
npm run build
\`\`\`

## 🌐 Deployment

This project can be deployed to:
- Netlify
- Vercel
- GitHub Pages
- Cloudflare Pages
- Render

## 📄 License

MIT License - feel free to use this project for any purpose.

## 🤝 Support

Built with ❤️ by [Joe AI](https://joe-ai.com)

---

Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
Project ID: ${requirements.projectId || 'N/A'}
`;
    }

    generateGitignore(type) {
        const common = `node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.env
.env.local
.env.production
dist/
build/
.next/
out/
.vscode/
.idea/
*.swp
*.swo
*~
.DS_Store
Thumbs.db
logs/
*.log
coverage/
.nyc_output/`;

        if (type === 'webapp' || type === 'ecommerce') {
            return common + `
.cache/
public/static/`;
        }

        return common;
    }

    generateRobotsTxt() {
        return `User-agent: *
Allow: /

Sitemap: https://yourdomain.com/sitemap.xml`;
    }

    generateSitemap(title, sections) {
        const urls = sections.map(section => `
  <url>
    <loc>https://yourdomain.com/#${section}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <priority>0.8</priority>
  </url>`).join('');

        return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://yourdomain.com/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <priority>1.0</priority>
  </url>${urls}
</urlset>`;
    }

    generateManifest(title, description) {
        return JSON.stringify({
            name: title,
            short_name: title,
            description: description,
            start_url: '/',
            display: 'standalone',
            background_color: '#ffffff',
            theme_color: '#2563eb',
            icons: [
                {
                    src: '/icon-192.png',
                    sizes: '192x192',
                    type: 'image/png'
                },
                {
                    src: '/icon-512.png',
                    sizes: '512x512',
                    type: 'image/png'
                }
            ]
        }, null, 2);
    }

    generateEnvExample(requirements) {
        let env = `NODE_ENV=development
API_URL=http://localhost:3000
API_KEY=your_api_key_here
`;

        if (requirements.database) {
            env += `
DATABASE_URL=mongodb://localhost:27017/myapp
`;
        }

        if (requirements.auth) {
            env += `
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d
`;
        }

        return env;
    }

    generateReactApp(title, features, requirements) {
        return {
            'src/App.js': `import React from 'react';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>${title}</h1>
        <p>Welcome to your new React application!</p>
      </header>
      <main className="App-main">
        <section className="features">
          <h2>Features</h2>
          <ul>
            ${features.map(f => `<li>${f}</li>`).join('\n            ')}
          </ul>
        </section>
      </main>
    </div>
  );
}

export default App;`,

            'src/App.css': `.App {
  text-align: center;
}

.App-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 40vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: calc(10px + 2vmin);
  color: white;
}

.App-main {
  padding: 2rem;
}

.features {
  max-width: 800px;
  margin: 0 auto;
}

.features ul {
  list-style: none;
  padding: 0;
}

.features li {
  padding: 1rem;
  margin: 0.5rem 0;
  background: #f3f4f6;
  border-radius: 8px;
}`,

            'src/index.js': `import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,

            'src/index.css': `* {
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
}

code {
  font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',
    monospace;
}`,

            'public/index.html': `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#000000" />
    <meta name="description" content="${requirements.description || title}" />
    <title>${title}</title>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
  </body>
</html>`
        };
    }

    generateVueApp(title, features, requirements) {
        return {
            'src/App.vue': `<template>
  <div id="app">
    <header class="app-header">
      <h1>{{ title }}</h1>
      <p>Welcome to your new Vue application!</p>
    </header>
    <main class="app-main">
      <section class="features">
        <h2>Features</h2>
        <ul>
          <li v-for="feature in features" :key="feature">{{ feature }}</li>
        </ul>
      </section>
    </main>
  </div>
</template>

<script>
export default {
  name: 'App',
  data() {
    return {
      title: '${title}',
      features: ${JSON.stringify(features)}
    }
  }
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  text-align: center;
  color: #2c3e50;
}

.app-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 40vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
}

.app-main {
  padding: 2rem;
}

.features ul {
  list-style: none;
  padding: 0;
}

.features li {
  padding: 1rem;
  margin: 0.5rem 0;
  background: #f3f4f6;
  border-radius: 8px;
}
</style>`,

            'src/main.js': `import { createApp } from 'vue'
import App from './App.vue'

createApp(App).mount('#app')`,

            'index.html': `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>`
        };
    }

    generateAngularApp(title, features, requirements) {
        return {
            'src/app/app.component.ts': `import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  template: \`
    <h1>{{ title }}</h1>
    <p>Welcome to your Angular app!</p>
  \`,
  styles: []
})
export class AppComponent {
  title = '${title}';
}`,
            'src/main.ts': `import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));`
        };
    }

    generateSvelteApp(title, features, requirements) {
        return {
            'src/App.svelte': `<script>
  let title = '${title}';
</script>

<main>
  <h1>{title}</h1>
  <p>Welcome to your Svelte app!</p>
</main>

<style>
  main {
    text-align: center;
    padding: 1em;
    max-width: 240px;
    margin: 0 auto;
  }

  h1 {
    color: #ff3e00;
    font-size: 4em;
    font-weight: 100;
  }
</style>`,
            'src/main.js': `import App from './App.svelte';

const app = new App({
  target: document.body
});

export default app;`
        };
    }

    generateNextApp(title, features, requirements) {
        return {
            'pages/index.js': `export default function Home() {
  return (
    <div>
      <h1>${title}</h1>
      <p>Welcome to your Next.js app!</p>
    </div>
  );
}`,
            'pages/_app.js': `export default function App({ Component, pageProps }) {
  return <Component {...pageProps} />;
}`
        };
    }

    generateProjectStructure(type, framework = null) {
        const structures = {
            website: {
                type: 'static',
                files: ['index.html', 'styles.css', 'script.js', 'package.json', 'README.md'],
                directories: []
            },
            webapp: {
                type: 'spa',
                files: ['src/App.js', 'src/index.js', 'public/index.html', 'package.json'],
                directories: ['src', 'public', 'src/components', 'src/utils']
            },
            ecommerce: {
                type: 'fullstack',
                files: ['src/pages/index.js', 'package.json'],
                directories: ['src/pages', 'src/components', 'src/context', 'src/api', 'src/utils']
            },
            api: {
                type: 'backend',
                files: ['src/index.js', 'package.json'],
                directories: ['src', 'src/routes', 'src/controllers', 'src/models', 'src/middleware']
            },
            mobile: {
                type: 'mobile',
                files: ['App.js', 'package.json', 'app.json'],
                directories: ['src', 'src/screens', 'src/components', 'src/navigation']
            },
            desktop: {
                type: 'desktop',
                files: ['main.js', 'package.json'],
                directories: ['src']
            }
        };

        return structures[type] || structures.website;
    }

    generateEcommerceHome(title, products) {
        return `import React from 'react';
import ProductCard from '../components/ProductCard';

export default function Home() {
  const products = ${JSON.stringify(products, null, 2)};

  return (
    <div className="home">
      <h1>${title}</h1>
      <div className="products-grid">
        {products.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}`;
    }

    generateProductPage() {
        return `import React from 'react';
import { useRouter } from 'next/router';

export default function ProductPage() {
  const router = useRouter();
  const { id } = router.query;

  return (
    <div className="product-page">
      <h1>Product {id}</h1>
      <button>Add to Cart</button>
    </div>
  );
}`;
    }

    generateCartPage() {
        return `import React from 'react';
import Cart from '../components/Cart';

export default function CartPage() {
  return (
    <div className="cart-page">
      <h1>Shopping Cart</h1>
      <Cart />
    </div>
  );
}`;
    }

    generateCheckoutPage() {
        return `import React from 'react';

export default function CheckoutPage() {
  return (
    <div className="checkout-page">
      <h1>Checkout</h1>
      <form>
        <input type="text" placeholder="Name" required />
        <input type="email" placeholder="Email" required />
        <button type="submit">Complete Purchase</button>
      </form>
    </div>
  );
}`;
    }

    generateProductCard() {
        return `import React from 'react';

export default function ProductCard({ product }) {
  return (
    <div className="product-card">
      <img src={product.image} alt={product.name} />
      <h3>{product.name}</h3>
      <p>{product.price}</p>
      <button>Add to Cart</button>
    </div>
  );
}`;
    }

    generateCartComponent() {
        return `import React from 'react';

export default function Cart() {
  return (
    <div className="cart">
      <p>Your cart is empty</p>
    </div>
  );
}`;
    }

    generateEcommerceHeader() {
        return `import React from 'react';
import Link from 'next/link';

export default function Header() {
  return (
    <header>
      <nav>
        <Link href="/">Home</Link>
        <Link href="/cart">Cart</Link>
      </nav>
    </header>
  );
}`;
    }

    generateEcommerceFooter() {
        return `import React from 'react';

export default function Footer() {
  return (
    <footer>
      <p>&copy; 2025 My Store. All rights reserved.</p>
    </footer>
  );
}`;
    }

    generateCartContext() {
        return `import React, { createContext, useState } from 'react';

export const CartContext = createContext();

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);

  const addToCart = (product) => {
    setCart([...cart, product]);
  };

  return (
    <CartContext.Provider value={{ cart, addToCart }}>
      {children}
    </CartContext.Provider>
  );
}`;
}`;
    }

    generateProductsAPI() {
        return `export async function getProducts() {
  const res = await fetch('/api/products');
  return res.json();
}

export async function getProduct(id) {
  const res = await fetch(\`/api/products/\${id}\`);
  return res.json();
}`;
    }

    generateOrdersAPI() {
        return `export async function createOrder(order) {
  const res = await fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(order)
  });
  return res.json();
}`;
    }

    generateCurrencyUtils() {
        return `export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}`;
    }

    generateValidationUtils() {
        return `export function validateEmail(email) {
  return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email);
}

export function validatePhone(phone) {
  return /^[0-9]{10}$/.test(phone);
}`;
    }

    generateAdminDashboard() {
        return `import React from 'react';

export default function AdminDashboard() {
  return (
    <div className="admin-dashboard">
      <h1>Admin Dashboard</h1>
      <div className="stats">
        <div className="stat-card">
          <h3>Total Orders</h3>
          <p>0</p>
        </div>
        <div className="stat-card">
          <h3>Total Products</h3>
          <p>0</p>
        </div>
      </div>
    </div>
  );
}`;
    }

    generateAdminProducts() {
        return `import React from 'react';

export default function AdminProducts() {
  return (
    <div className="admin-products">
      <h1>Manage Products</h1>
      <button>Add New Product</button>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Price</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colSpan="3">No products yet</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}`;
    }

    generateAdminOrders() {
        return `import React from 'react';

export default function AdminOrders() {
  return (
    <div className="admin-orders">
      <h1>Manage Orders</h1>
      <table>
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Customer</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colSpan="4">No orders yet</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}`;
    }

    generateEcommerceEnv(payment) {
        return `NEXT_PUBLIC_SITE_URL=http://localhost:3000
${payment.includes('stripe') ? 'STRIPE_SECRET_KEY=sk_test_...\nNEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_test_...' : ''}
${payment.includes('paypal') ? '\nPAYPAL_CLIENT_ID=...\nPAYPAL_SECRET=...' : ''}
DATABASE_URL=mongodb://localhost:27017/ecommerce
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-password`;
    }

    generateAPIIndex(framework) {
        if (framework === 'express') {
            return `const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'API is running' });
});

app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});`;
        }
        return '';
    }

    generateDatabaseConfig(database) {
        if (database === 'mongodb') {
            return `const { MongoClient } = require('mongodb');

const client = new MongoClient(process.env.DATABASE_URL);

async function connectDB() {
  await client.connect();
  return client.db();
}

module.exports = { connectDB };`;
        }
        return '';
    }

    generateAuthConfig(auth) {
        if (auth === 'jwt') {
            return `const jwt = require('jsonwebtoken');

function generateToken(user) {
  return jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
    expiresIn: '7d'
  });
}

function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

module.exports = { generateToken, verifyToken };`;
        }
        return '';
    }

    generateAuthMiddleware() {
        return `const { verifyToken } = require('../config/auth');

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = authMiddleware;`;
    }

    generateErrorHandler() {
        return `function errorHandler(err, req, res, next) {
  console.error(err.stack);
  
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
}

module.exports = errorHandler;`;
    }

    generateAPIRoutes(endpoints) {
        return `const express = require('express');
const router = express.Router();

${endpoints.map(e => `router.${e.method || 'get'}('${e.path}', (req, res) => {
  res.json({ message: '${e.name}' });
});`).join('\n\n')}

module.exports = router;`;
    }

    generateAPIControllers(endpoints) {
        return `${endpoints.map(e => `
exports.${e.name} = async (req, res) => {
  try {
    res.json({ message: '${e.name} controller' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};`).join('\n')}`;
    }

    generateAPIModels(endpoints) {
        return `// Database models\n// Add your models here`;
    }

    generateSwagger(title, description, endpoints) {
        return `const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: '${title}',
      version: '1.0.0',
      description: '${description}'
    }
  },
  apis: ['./src/routes/*.js']
};

module.exports = swaggerJsdoc(options);`;
    }

    generateAPIEnv(database, auth) {
        return `PORT=3000
NODE_ENV=development
DATABASE_URL=${database === 'mongodb' ? 'mongodb://localhost:27017/myapi' : 'postgresql://localhost:5432/myapi'}
${auth === 'jwt' ? 'JWT_SECRET=your-secret-key-here\nJWT_EXPIRES_IN=7d' : ''}
CORS_ORIGIN=http://localhost:3000`;
    }

    generateMobileApp(title, features) {
        return `import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>${title}</Text>
      <Text>Welcome to your mobile app!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20
  }
});`;
    }

    generateHomeScreen() {
        return `import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Home Screen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold'
  }
});`;
    }

    generateAppNavigator() {
        return `import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from '../screens/HomeScreen';

const Stack = createStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}`;
    }

    generateMobileButton() {
        return `import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

export default function Button({ title, onPress }) {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress}>
      <Text style={styles.text}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#2563eb',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center'
  },
  text: {
    color: 'white',
    fontWeight: 'bold'
  }
});`;
    }

    generateAppJson(title, description) {
        return JSON.stringify({
            expo: {
                name: title,
                slug: title.toLowerCase().replace(/\s+/g, '-'),
                version: '1.0.0',
                orientation: 'portrait',
                icon: './assets/icon.png',
                splash: {
                    image: './assets/splash.png',
                    resizeMode: 'contain',
                    backgroundColor: '#ffffff'
                },
                updates: {
                    fallbackToCacheTimeout: 0
                },
                assetBundlePatterns: ['**/*'],
                ios: {
                    supportsTablet: true
                },
                android: {
                    adaptiveIcon: {
                        foregroundImage: './assets/adaptive-icon.png',
                        backgroundColor: '#FFFFFF'
                    }
                }
            }
        }, null, 2);
    }

    generateElectronMain() {
        return `const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true
    }
  });

  win.loadFile('src/index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});`;
    }

    generateElectronHTML(title) {
        return `<!DOCTYPE html>
<html>
<head>
    <title>${title}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            padding: 20px;
        }
    </style>
</head>
<body>
    <h1>${title}</h1>
    <p>Welcome to your desktop application!</p>
    <script src="renderer.js"></script>
</body>
</html>`;
    }

    generateElectronRenderer() {
        return `console.log('Electron app loaded');

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM ready');
});`;
    }

    generateExtensionManifest(title, description, permissions) {
        return JSON.stringify({
            manifest_version: 3,
            name: title,
            version: '1.0.0',
            description: description,
            permissions: permissions,
            action: {
                default_popup: 'popup.html',
                default_icon: {
                    16: 'icons/icon16.png',
                    48: 'icons/icon48.png',
                    128: 'icons/icon128.png'
                }
            },
            background: {
                service_worker: 'background.js'
            },
            content_scripts: [{
                matches: ['<all_urls>'],
                js: ['content.js']
            }]
        }, null, 2);
    }

    generateExtensionPopup(title) {
        return `<!DOCTYPE html>
<html>
<head>
    <title>${title}</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <h1>${title}</h1>
    <button id="action-btn">Click Me</button>
    <script src="popup.js"></script>
</body>
</html>`;
    }

    generateExtensionPopupJS() {
        return `document.getElementById('action-btn').addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { action: 'doSomething' });
  });
});`;
    }

    generateExtensionBackground() {
        return `chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received:', request);
  sendResponse({ status: 'ok' });
});`;
    }

    generateExtensionContent() {
        return `chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'doSomething') {
    console.log('Doing something...');
    sendResponse({ status: 'done' });
  }
});`;
    }

    generateExtensionCSS() {
        return `body {
  width: 300px;
  padding: 20px;
  font-family: Arial, sans-serif;
}

button {
  width: 100%;
  padding: 10px;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

button:hover {
  background: #1d4ed8;
}`;
    }

    generatePackageIndex(type) {
        if (type === 'library') {
            return `/**
 * My Package
 * A useful library
 */

function hello(name) {
  return \`Hello, \${name}!\`;
}

module.exports = { hello };`;
        }
        return '';
    }

    generatePackageTests() {
        return `const { hello } = require('../src/index');

test('hello function works', () => {
  expect(hello('World')).toBe('Hello, World!');
});`;
    }

    generateNPMIgnore() {
        return `node_modules/
test/
*.test.js
.env
.DS_Store`;
    }

    generateLicense() {
        return `MIT License

Copyright (c) ${new Date().getFullYear()}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;
    }

    generateWPThemeStyle(title, description) {
        return `/*
Theme Name: ${title}
Theme URI: https://example.com
Description: ${description}
Author: Joe AI
Author URI: https://joe-ai.com
Version: 1.0.0
License: GNU General Public License v2 or later
License URI: http://www.gnu.org/licenses/gpl-2.0.html
Text Domain: ${title.toLowerCase().replace(/\s+/g, '-')}
*/`;
    }

    generateWPIndex() {
        return `<?php get_header(); ?>

<main>
    <?php if (have_posts()) : while (have_posts()) : the_post(); ?>
        <article>
            <h2><?php the_title(); ?></h2>
            <?php the_content(); ?>
        </article>
    <?php endwhile; endif; ?>
</main>

<?php get_footer(); ?>`;
    }

    generateWPFunctions() {
        return `<?php
function theme_setup() {
    add_theme_support('title-tag');
    add_theme_support('post-thumbnails');
    register_nav_menus(array(
        'primary' => __('Primary Menu')
    ));
}
add_action('after_setup_theme', 'theme_setup');
?>`;
    }

    generateWPHeader() {
        return `<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo('charset'); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<header>
    <h1><?php bloginfo('name'); ?></h1>
    <?php wp_nav_menu(array('theme_location' => 'primary')); ?>
</header>`;
    }

    generateWPFooter() {
        return `<footer>
    <p>&copy; <?php echo date('Y'); ?> <?php bloginfo('name'); ?></p>
</footer>
<?php wp_footer(); ?>
</body>
</html>`;
    }

    generateWPSidebar() {
        return `<aside>
    <?php if (is_active_sidebar('sidebar-1')) : ?>
        <?php dynamic_sidebar('sidebar-1'); ?>
    <?php endif; ?>
</aside>`;
    }

    generateWPPluginMain(title, description) {
        return `<?php
/**
 * Plugin Name: ${title}
 * Description: ${description}
 * Version: 1.0.0
 * Author: Joe AI
 */

if (!defined('ABSPATH')) {
    exit;
}

require_once plugin_dir_path(__FILE__) . 'includes/class-plugin.php';

function activate_plugin() {
    // Activation code
}
register_activation_hook(__FILE__, 'activate_plugin');
?>`;
    }

    generateWPPluginClass() {
        return `<?php
class MyPlugin {
    public function __construct() {
        add_action('init', array($this, 'init'));
    }
    
    public function init() {
        // Plugin initialization
    }
}

new MyPlugin();
?>`;
    }

    generateWPPluginAdmin() {
        return `<?php
add_action('admin_menu', 'plugin_admin_menu');

function plugin_admin_menu() {
    add_menu_page(
        'Plugin Settings',
        'My Plugin',
        'manage_options',
        'my-plugin',
        'plugin_settings_page'
    );
}

function plugin_settings_page() {
    echo '<h1>Plugin Settings</h1>';
}
?>`;
    }

    generateWPPluginPublic() {
        return `<?php
add_shortcode('my_shortcode', 'my_shortcode_handler');

function my_shortcode_handler($atts) {
    return '<div>Shortcode output</div>';
}
?>`;
    }

    generateServiceWorker() {
        return `self.addEventListener('install', (event) => {
  console.log('Service Worker installing');
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating');
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});`;
    }

    generateAnalytics() {
        return `(function() {
  const script = document.createElement('script');
  script.src = 'https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID';
  script.async = true;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
})();`;
    }

    generateAPIClient() {
        return `const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

export async function apiCall(endpoint, options = {}) {
  const response = await fetch(\`\${API_URL}\${endpoint}\`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  if (!response.ok) {
    throw new Error(\`API Error: \${response.statusText}\`);
  }

  return response.json();
}

export const api = {
  get: (endpoint) => apiCall(endpoint),
  post: (endpoint, data) => apiCall(endpoint, { method: 'POST', body: JSON.stringify(data) }),
  put: (endpoint, data) => apiCall(endpoint, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (endpoint) => apiCall(endpoint, { method: 'DELETE' })
};`;
    }

    generateAuthContext() {
        return `import React, { createContext, useState, useContext } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const login = async (credentials) => {
    setUser({ id: 1, name: 'User' });
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}`;
    }

    generateProtectedRoute() {
        return `import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

export function ProtectedRoute({ children }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}`;
    }

    generateVSCodePackageJson(title, description, commands) {
        return JSON.stringify({
            name: title.toLowerCase().replace(/\s+/g, '-'),
            displayName: title,
            description: description,
            version: '0.0.1',
            engines: {
                vscode: '^1.80.0'
            },
            categories: ['Other'],
            activationEvents: commands.map(c => `onCommand:${c.id}`),
            main: './extension.js',
            contributes: {
                commands: commands.map(c => ({
                    command: c.id,
                    title: c.title
                }))
            }
        }, null, 2);
    }

    generateVSCodeExtension(commands) {
        return `const vscode = require('vscode');

function activate(context) {
  console.log('Extension activated');

  ${commands.map(c => `
  let ${c.id.replace(/\./g, '_')} = vscode.commands.registerCommand('${c.id}', function () {
    vscode.window.showInformationMessage('${c.title} executed!');
  });
  context.subscriptions.push(${c.id.replace(/\./g, '_')});
  `).join('\n')}
}

function deactivate() {}

module.exports = {
  activate,
  deactivate
};`;
    }

    async saveProject(projectId, type, requirements, project) {
        try {
            const db = getDB();
            
            await db.collection('joe_projects').insertOne({
                _id: projectId,
                type,
                requirements,
                project: {
                    ...project,
                    files: Object.keys(project.files || {})
                },
                createdAt: new Date(),
                updatedAt: new Date(),
                status: 'completed',
                metadata: {
                    generatedBy: 'Joe AI',
                    version: '3.0.0'
                }
            });
            
            console.log(`💾 Project saved to database: ${projectId}`);
            
        } catch (error) {
            console.error('❌ Save project error:', error);
            throw error;
        }
    }

    updateStats(type, framework, theme, generationTime) {
        this.stats.totalGenerated++;
        this.stats.totalGenerationTime += generationTime;
        this.stats.avgGenerationTime = this.stats.totalGenerationTime / this.stats.totalGenerated;
        
        this.stats.byType[type] = (this.stats.byType[type] || 0) + 1;
        
        if (framework) {
            this.stats.byFramework[framework] = (this.stats.byFramework[framework] || 0) + 1;
        }
        
        if (theme) {
            this.stats.byTheme[theme] = (this.stats.byTheme[theme] || 0) + 1;
        }
        
        this.emit('stats:updated', this.stats);
    }

    getStats() {
        return {
            ...this.stats,
            supportedTypes: Array.from(this.supportedTypes),
            supportedThemes: Array.from(this.supportedThemes),
            supportedFrameworks: Array.from(this.supportedFrameworks.keys())
        };
    }

    getHTML5Boilerplate() {
        return {
            name: 'HTML5 Boilerplate',
            description: 'A professional front-end template',
            files: ['index.html', 'styles.css', 'script.js']
        };
    }

    getReactBoilerplate() {
        return {
            name: 'React Boilerplate',
            description: 'A modern React starter',
            files: ['src/App.js', 'src/index.js']
        };
    }

    getVueBoilerplate() {
        return {
            name: 'Vue Boilerplate',
            description: 'A modern Vue starter',
            files: ['src/App.vue', 'src/main.js']
        };
    }

    getAPIBoilerplate() {
        return {
            name: 'API Boilerplate',
            description: 'A RESTful API starter',
            files: ['src/index.js', 'src/routes/index.js']
        };
    }
}

export const projectTools = new AdvancedProjectTools();

export default AdvancedProjectTools;

    }

    generateProductContext() {
        return `import React, { createContext, useState } from 'react';

export const ProductContext = createContext();

export function ProductProvider({ children }) {
  const [products, setProducts] = useState([]);

  return (
    <ProductContext.Provider value={{ products, setProducts }}>
      {children}
    </ProductContext.Provider>
  );
}`;
