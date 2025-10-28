import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// مهم: هون بنحط URL تبع الـ API تبعك
// حالياً: api.xelitesolutions.com
const API_BASE = 'https://api.xelitesolutions.com'

export default defineConfig({
  plugins: [react()],
  define: {
    __API_BASE__: JSON.stringify(API_BASE),
  }
})