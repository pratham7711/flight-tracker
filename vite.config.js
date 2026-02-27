import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api/opensky': {
        target: 'https://opensky-network.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/opensky/, '/api'),
        headers: {
          'Origin': 'https://opensky-network.org'
        }
      }
    }
  },
  optimizeDeps: {
    include: ['globe.gl']
  },
  build: {
    chunkSizeWarningLimit: 2500,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'globe-vendor': ['globe.gl'],
        }
      }
    }
  }
})
