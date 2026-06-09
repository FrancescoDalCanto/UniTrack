import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
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
