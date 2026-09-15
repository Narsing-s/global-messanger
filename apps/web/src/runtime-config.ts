declare global {
  interface Window {
    __GM_CONFIG__?: { API_URL?: string };
  }
}

/**
 * Runtime API routing for Global Messenger.
 *
 * The browser always talks to the API through the same public origin. This
 * keeps the application self-hosted: Docker/nginx can serve both the web UI
 * and /api from the same server without a Cloudflare, Render, Vercel or other
 * hosted API dependency. Native runtimes may provide an explicit API URL.
 */
const native = ['capacitor:', 'ionic:', 'file:', 'null'].includes(window.location.protocol);
const configured =
  window.__GM_CONFIG__?.API_URL ||
  import.meta.env.VITE_API_URL ||
  localStorage.getItem('gm_api_url') ||
  '';

export const API = native
  ? configured.replace(/\/$/, '')
  : window.location.origin;

export const isNativeRuntime = native;

export function apiUrl(path: string): string {
  return `${API}${path.startsWith('/') ? path : `/${path}`}`;
}
