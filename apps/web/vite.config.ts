import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Always use apps/web as Vite's root, even when `vite` is started from the
// monorepo root. This is important because reset-password.html lives here.
const WEB_ROOT = path.dirname(fileURLToPath(import.meta.url));
const RESET_PAGE = path.resolve(WEB_ROOT, 'reset-password.html');
const RESET_PAGE_PUBLIC = path.resolve(WEB_ROOT, 'public/reset-password.html');

function resetPageHtml(): string {
  const candidates = [RESET_PAGE, RESET_PAGE_PUBLIC];
  for (const file of candidates) {
    if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8');
  }
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Reset password — Global Messenger</title></head><body><main style="font-family:system-ui;max-width:520px;margin:15vh auto;padding:32px"><h1>Password reset</h1><p>The reset page asset is missing from this web build. Pull the latest repository and restart Vite.</p></main></body></html>`;
}

export default defineConfig({
  // Without this, starting Vite from the repository root makes
  // /reset-password.html resolve against the wrong directory and returns 404.
  root: WEB_ROOT,
  plugins: [
    react(),
    {
      name: 'global-messenger-reset-page',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const pathname = (req.url || '').split('?')[0].replace(/\/$/, '');
          if (pathname === '/reset-password' || pathname === '/reset-password.html') {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
            res.end(resetPageHtml());
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
