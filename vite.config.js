import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 5173,
    open: true
  },
  optimizeDeps: {
    entries: ['src/main.jsx']
  },
  build: {
    rollupOptions: {
      input: 'index.html'
    }
  }
})
