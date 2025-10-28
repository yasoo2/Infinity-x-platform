import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// هون بنحدد الـ API تبع الباكند تبعنا
const API_BASE = 'https://api.xelitesolutions.com'

export default defineConfig({
  plugins: [react()],
  define: {
    __API_BASE__: JSON.stringify(API_BASE),
  }
})