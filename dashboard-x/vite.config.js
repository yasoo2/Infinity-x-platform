import { defineConfig } from 'vite';
import path from 'path';
import react from '@vitejs/plugin-react';
import { viteStaticCopy } from 'vite-plugin-static-copy';

// https://vitejs.dev/config/
export default defineConfig({
  define: {
   'import.meta.env.VITE_API_BASE_URL': JSON.stringify('http://4000-iavhwtgdu2snl4ndzssze-a66a9dda.manus-asia.computer/api/v1'),
  },
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
  base: '/',
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',

    terserOptions: {
      compress: {
        drop_console: true,
      },
    },
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
    allowedHosts: ['*'],
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
