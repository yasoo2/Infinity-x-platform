/**
 * E-Commerce Tools - أدوات بناء المتاجر الإلكترونية
 * مجموعة شاملة لبناء متاجر إلكترونية كاملة
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * إنشاء متجر إلكتروني كامل
 */
async function createEcommerceStore(storeName, config = {}) {
  try {
    const {
      currency = 'USD',
      language = 'ar',
      paymentMethods = ['stripe', 'paypal'],
      features = ['cart', 'wishlist', 'reviews']
    } = config;
    
    const projectPath = path.join('/tmp', storeName);
    
    console.log(`🛒 Creating E-commerce Store: ${storeName}`);
    
    await fs.mkdir(projectPath, { recursive: true });
    await fs.mkdir(path.join(projectPath, 'src'), { recursive: true });
    await fs.mkdir(path.join(projectPath, 'src', 'components'), { recursive: true });
    await fs.mkdir(path.join(projectPath, 'src', 'pages'), { recursive: true});
    
    // package.json
    const packageJson = {
      name: storeName,
      version: '1.0.0',
      type: 'module',
      scripts: {
        dev: 'vite',
        build: 'vite build',
        preview: 'vite preview'
      },
      dependencies: {
        react: '^18.2.0',
        'react-dom': '^18.2.0',
        'react-router-dom': '^6.11.0',
        '@stripe/stripe-js': '^1.54.0',
        '@stripe/react-stripe-js': '^2.1.0',
        axios: '^1.4.0',
        zustand: '^4.3.8'
      },
      devDependencies: {
        '@vitejs/plugin-react': '^4.0.0',
        vite: '^4.3.9',
        tailwindcss: '^3.3.0',
        autoprefixer: '^10.4.14',
        postcss: '^8.4.24'
      }
    };
    
    await fs.writeFile(
      path.join(projectPath, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );
    
    // Store component (Zustand)
    const storeJs = `import { create } from 'zustand'

export const useStore = create((set) => ({
  cart: [],
  wishlist: [],
  addToCart: (product) => set((state) => ({
    cart: [...state.cart, { ...product, quantity: 1 }]
  })),
  removeFromCart: (productId) => set((state) => ({
    cart: state.cart.filter(item => item.id !== productId)
  })),
  updateQuantity: (productId, quantity) => set((state) => ({
    cart: state.cart.map(item =>
      item.id === productId ? { ...item, quantity } : item
    )
  })),
  addToWishlist: (product) => set((state) => ({
    wishlist: [...state.wishlist, product]
  })),
  removeFromWishlist: (productId) => set((state) => ({
    wishlist: state.wishlist.filter(item => item.id !== productId)
  })),
  clearCart: () => set({ cart: [] })
}))`;
    
    await fs.writeFile(path.join(projectPath, 'src', 'store.js'), storeJs);
    
    // ProductCard component
    const productCard = `import React from 'react'
import { useStore } from '../store'

export default function ProductCard({ product }) {
  const addToCart = useStore((state) => state.addToCart)
  const addToWishlist = useStore((state) => state.addToWishlist)
  
  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
      <img 
        src={product.image} 
        alt={product.name}
        className="w-full h-64 object-cover"
      />
      <div className="p-4">
        <h3 className="text-xl font-bold mb-2">{product.name}</h3>
        <p className="text-gray-600 mb-4">{product.description}</p>
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold text-blue-600">
            {product.price}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => addToWishlist(product)}
              className="p-2 rounded-full hover:bg-gray-100"
            >
              ❤️
            </button>
            <button
              onClick={() => addToCart(product)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              أضف للسلة
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}`;
    
    await fs.writeFile(
      path.join(projectPath, 'src', 'components', 'ProductCard.jsx'),
      productCard
    );
    
    // Home page
    const homePage = `import React from 'react'
import ProductCard from '../components/ProductCard'

const products = [
  {
    id: 1,
    name: 'منتج رائع 1',
    description: 'وصف المنتج هنا',
    price: 99.99,
    image: 'https://via.placeholder.com/400'
  },
  {
    id: 2,
    name: 'منتج رائع 2',
    description: 'وصف المنتج هنا',
    price: 149.99,
    image: 'https://via.placeholder.com/400'
  },
  {
    id: 3,
    name: 'منتج رائع 3',
    description: 'وصف المنتج هنا',
    price: 199.99,
    image: 'https://via.placeholder.com/400'
  }
]

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-800">${storeName}</h1>
          <p className="text-gray-600">متجر إلكتروني متطور بواسطة JOE AI</p>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold mb-6">المنتجات المميزة</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </main>
      
      <footer className="bg-gray-800 text-white mt-12">
        <div className="container mx-auto px-4 py-6 text-center">
          <p>© 2025 ${storeName} - تم البناء بواسطة JOE AI 🤖</p>
        </div>
      </footer>
    </div>
  )
}`;
    
    await fs.writeFile(
      path.join(projectPath, 'src', 'pages', 'Home.jsx'),
      homePage
    );
    
    // App.jsx
    const appJsx = `import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App`;
    
    await fs.writeFile(path.join(projectPath, 'src', 'App.jsx'), appJsx);
    
    // main.jsx
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
    
    // index.css
    const indexCss = `@tailwind base;
@tailwind components;
@tailwind utilities;

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
}`;
    
    await fs.writeFile(path.join(projectPath, 'src', 'index.css'), indexCss);
    
    // index.html
    const indexHtml = `<!DOCTYPE html>
<html lang="${language}" dir="${language === 'ar' ? 'rtl' : 'ltr'}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${storeName}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`;
    
    await fs.writeFile(path.join(projectPath, 'index.html'), indexHtml);
    
    // vite.config.js
    const viteConfig = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})`;
    
    await fs.writeFile(path.join(projectPath, 'vite.config.js'), viteConfig);
    
    // tailwind.config.js
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
    
    // README.md
    const readme = `# ${storeName}

متجر إلكتروني متطور تم إنشاؤه بواسطة **JOE AI** 🤖

## المميزات

- 🛒 سلة تسوق ذكية
- ❤️ قائمة الأمنيات
- 💳 دعم طرق دفع متعددة (${paymentMethods.join(', ')})
- 📱 تصميم متجاوب
- 🌐 دعم متعدد اللغات

## التشغيل

\`\`\`bash
npm install
npm run dev
\`\`\`

## البناء

\`\`\`bash
npm run build
\`\`\`

---
تم البناء بواسطة JOE AI من XElite Solutions 🚀
`;
    
    await fs.writeFile(path.join(projectPath, 'README.md'), readme);
    
    return {
      success: true,
      storeName,
      projectPath,
      currency,
      language,
      paymentMethods,
      features,
      message: `تم إنشاء متجر إلكتروني كامل في ${projectPath}`
    };
    
  } catch (error) {
    console.error('Create ecommerce store error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

export default { createEcommerceStore };

// Metadata for Dynamic Discovery
createEcommerceStore.metadata = {
  name: "createEcommerceStore",
  description: "Creates a complete e-commerce store with React, Vite, Tailwind CSS, and Zustand for state management. Includes product cards, shopping cart, and wishlist features.",
  parameters: {
    type: "object",
    properties: {
      storeName: {
        type: "string",
        description: "The name of the e-commerce store to create."
      },
      config: {
        type: "object",
        description: "Optional configuration for the store.",
        properties: {
          currency: {
            type: "string",
            description: "Currency code (e.g., 'USD', 'EUR')."
          },
          language: {
            type: "string",
            description: "Language code (e.g., 'ar', 'en')."
          },
          paymentMethods: {
            type: "array",
            items: { type: "string" },
            description: "Payment methods to support (e.g., ['stripe', 'paypal'])."
          },
          features: {
            type: "array",
            items: { type: "string" },
            description: "Features to include (e.g., ['cart', 'wishlist', 'reviews'])."
          }
        }
      }
    },
    required: ["storeName"]
  }
};
