import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // In dev, /api is proxied to the local Express server (see ../server).
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
})
