import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 3000,
    proxy: {
      '/login': {
        target: 'http://localhost:1337',
        changeOrigin: true,
      },
      '/register': {
        target: 'http://localhost:1337',
        changeOrigin: true,
      },
      '/auth': {
        target: 'http://localhost:1337',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://localhost:1337',
        changeOrigin: true,
      },
      '/kong': {
        target: 'http://localhost:1337',
        changeOrigin: true,
      },
    },
  },
})
