import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  publicDir: 'src/public',
  server: {
    host: true,
    proxy: {
      '/api': {
        target: 'http://ticket-api:8000',
        changeOrigin: true,
      },
      '/media': {
        target: 'http://ticket-api:8000',
        changeOrigin: true,
      },
    },
  }
})