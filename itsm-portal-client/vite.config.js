import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite config for the client package
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    watch: {
      ignored: ["**/public/*.mp4"]
    },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5069',
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err)
          })
        }
      }
    }
  }
})
