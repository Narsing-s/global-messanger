import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true
      },
      '/socket.io': {
        target: 'ws://127.0.0.1:4000',
        ws: true,
        changeOrigin: true
      }
    },
    hmr: {
      host: '127.0.0.1',
      port: 5173
    }
  }
});
