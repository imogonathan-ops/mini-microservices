import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      // Remplacer le port selon celui de ton API Gateway existant.
      '/api': { target: 'http://localhost:8080', changeOrigin: true },
      // Socket.IO doit être proxifié séparément ; ce n'est pas du WebSocket brut.
      '/socket.io': { target: 'http://localhost:3004', changeOrigin: true, ws: true }
    }
  }
})
