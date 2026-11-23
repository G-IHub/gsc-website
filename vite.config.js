import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Local testing only: the Research Hub API runs from scripts/hub_dev_server.js (Vercel serves /api in production)
  server: { proxy: { "/api/hub": "http://localhost:8787" } },
})
