import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB_ROOT = path.dirname(fileURLToPath(import.meta.url));
const RESET_PAGE = path.resolve(WEB_ROOT, 'reset-password.html');
const RESET_PAGE_PUBLIC = path.resolve(WEB_ROOT, 'public/reset-password.html');

function resetPageHtml(): string {
  for (const file of [RESET_PAGE, RESET_PAGE_PUBLIC]) {
    if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8');
  }
  return '<!doctype html><html><body><h1>Global Messenger</h1><p>Reset page asset is missing.</p></body></html>';
}

export default defineConfig({
  root: WEB_ROOT,
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': { target: 'http://127.0.0.1:4000', changeOrigin: true },
      '/socket.io': { target: 'ws://127.0.0.1:4000', ws: true, changeOrigin: true }
    },
    hmr: { host: '127.0.0.1', port: 5173 }
  },
  // Vite 6 does not reliably serve a root-level public HTML file through
  // middleware when another dev process/config is involved. Explicitly map
  // the reset URL before Vite's normal HTML handling.
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const pathname = new URL(req.url || '/', 'http://127.0.0.1').pathname;
      if (pathname === '/reset-password.html' || pathname === '/reset-password') {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.end(resetPageHtml());
        return;
      }
      next();
    });
  }
});
