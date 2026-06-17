import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { createRequire } from 'module'
const _require = createRequire(import.meta.url)
const { getTasse } = _require('./api/tasse.js')

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'tasse-dev',
      configureServer(server) {
        server.middlewares.use('/api/tasse', async (req: any, res: any) => {
          const auth: string = req.headers.authorization ?? ''
          if (!auth) { res.statusCode = 401; res.end(JSON.stringify({ error: 'No auth' })); return }
          res.setHeader('Content-Type', 'application/json')
          const result = await getTasse(auth)
          if (result.debug) console.log('[tasse-dev] debug:', result.debug.slice(0, 500))
          res.end(JSON.stringify(result))
        })
      },
    },
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'UniTrack',
        short_name: 'UniTrack',
        description: 'Traccia i tuoi esami universitari',
        theme_color: '#4338ca',
        background_color: '#f9fafb',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        navigateFallbackDenylist: [/^\/e3rest/],
      },
    }),
  ],
  server: {
    proxy: {
      '/e3rest': {
        target: 'https://www.studenti.unipi.it',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
