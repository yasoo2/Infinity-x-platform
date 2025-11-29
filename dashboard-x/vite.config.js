import { defineConfig } from 'vite';
import path from 'path';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  define: {
   'import.meta.env.VITE_API_BASE_URL': JSON.stringify(process.env.VITE_API_BASE_URL || ''),
   'import.meta.env.VITE_WS_URL': JSON.stringify(process.env.VITE_WS_URL || ''),
  },
  plugins: [
    react(),
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
        target: 'http://localhost:4001',
        changeOrigin: true,
        secure: false,
      },
      '/ws': {
        target: 'ws://localhost:4001',
        ws: true,
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
