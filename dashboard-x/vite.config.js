import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    strictPort: true,
    port: 5173,
  },
  preview: {
    port: 4173,
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  }
});
