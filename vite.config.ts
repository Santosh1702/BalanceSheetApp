import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), VitePWA({ registerType: 'autoUpdate', manifest: { name: 'Pocket Ledger', short_name: 'Pocket Ledger', description: 'A private family ledger for deposits and expenses.', theme_color: '#2563EB', background_color: '#F8FAFC', display: 'standalone', icons: [{ src: '/pwa.svg', sizes: '192x192', type: 'image/svg+xml' }] } })],
})
