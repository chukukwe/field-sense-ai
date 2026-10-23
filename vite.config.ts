import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: process.env.BACKEND_URL || 'http://localhost:8787',
        changeOrigin: true,
        // The app is same-origin through this proxy; use its default local
        // origin so a 127.0.0.1 preview also passes the API's dev allowlist.
        headers: { origin: 'http://localhost:5173' },
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
      },
    }),
  ],
})
