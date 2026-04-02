import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import fs from 'fs'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'serve-uploads',
      configureServer(server) {
        server.middlewares.use('/uploads', (req, res, next) => {
          const decoded = decodeURIComponent(req.url?.replace(/^\//, '') ?? '')
          const filePath = path.resolve(__dirname, '../uploads', decoded)
          if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            const ext = path.extname(filePath).toLowerCase()
            const mime = ext === '.pdf' ? 'application/pdf' : 'application/octet-stream'
            res.setHeader('Content-Type', mime)
            res.setHeader('Content-Disposition', 'inline')
            fs.createReadStream(filePath).pipe(res)
          } else {
            next()
          }
        })
      },
    },
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
  }
})
