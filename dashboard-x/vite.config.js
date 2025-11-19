import { defineConfig } from 'vite';
import path from 'path';
import react from '@vitejs/plugin-react';
import { viteStaticCopy } from 'vite-plugin-static-copy';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: 'landing.html',
          dest: '.'
        }
      ]
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  base: '//',
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        dashboard: path.resolve(__dirname, 'dashboard.html'),
      },
    },
    terserOptions: {
      compress: {
        drop_console: true,
      },
    },
  },
  server: {
    port: 5173,
    strictPort: false,
    // ✅ إضافة البروكسي للـ API والـ WebSocket أثناء التطوير
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false,
      },
      '/ws': {
        target: 'ws://localhost:4000',
        ws: true,
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
