import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'global-messenger-reset-page',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const pathname = (req.url || '').split('?')[0];
          if (pathname === '/reset-password' || pathname === '/reset-password/') {
            const file = path.resolve(process.cwd(), 'public/reset-password/index.html');
            res.statusCode = 200;
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.end(fs.readFileSync(file));
            return;
          }
          next();
        });
      }
    }
  ],
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
