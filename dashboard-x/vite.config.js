import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// IMPORTANT:
// عدّل الـ URL تحت على عنوان الـ backend تبعك على Render
const BACKEND_BASE = 'https://infinity-x-platform.onrender.com'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: BACKEND_BASE,
        changeOrigin: true
      }
    }
  },
  preview: {
    port: 5173,
    strictPort: true
  }
})