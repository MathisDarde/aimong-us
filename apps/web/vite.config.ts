import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Les appels /api/* sont redirigés vers le serveur Hono en dev
      '/api': 'http://localhost:3000',
    },
  },
})
