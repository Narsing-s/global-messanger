import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Resolve from this config file, NOT process.cwd(). The root `npm run dev`
// starts Vite with apps/web as its cwd today, but this must also work when
// Vite is started from the monorepo root or another working directory.
const WEB_ROOT = path.dirname(fileURLToPath(import.meta.url));
const RESET_PAGE = path.resolve(WEB_ROOT, 'public/reset-password.html');

function resetPageHtml(): string {
  if (fs.existsSync(RESET_PAGE)) return fs.readFileSync(RESET_PAGE, 'utf8');
  // Never allow a missing static asset to turn a valid password-reset link
  // into a Vite 404. This fallback keeps the route usable and tells the user
  // what is wrong instead of showing the browser's generic Not Found page.
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Reset password — Global Messenger</title></head><body><main style="font-family:system-ui;max-width:520px;margin:15vh auto;padding:32px"><h1>Password reset</h1><p>The reset page asset is missing from this web build. Restart the development server after pulling the latest code.</p></main></body></html>`;
}

export default defineConfig({
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
