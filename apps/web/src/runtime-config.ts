declare global {
  interface Window {
    __GM_CONFIG__?: { API_URL?: string };
  }
}

/**
 * Single production API origin for Cloudflare Pages, PWA and Capacitor.
 * The API is the Cloudflare Worker endpoint and uses Neon PostgreSQL.
 * Never fall back to Render, Vercel or localhost in production/native builds.
 */
const DEFAULT_PRODUCTION_API = 'https://global-messenger-api.narsingbeesetti006.workers.dev';

const configured =
  window.__GM_CONFIG__?.API_URL ||
  import.meta.env.VITE_API_URL ||
  localStorage.getItem('gm_api_url') ||
  '';

const loopback = (value: string) => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/i.test(value);
const native = ['capacitor:', 'ionic:', 'file:', 'null'].includes(window.location.protocol);

export const API = (configured && (!loopback(configured) || import.meta.env.DEV))
  ? configured.replace(/\/$/, '')
  : (import.meta.env.DEV && !native ? window.location.origin : DEFAULT_PRODUCTION_API);

export const isNativeRuntime = native;

export function apiUrl(path: string): string {
  return `${API}${path.startsWith('/') ? path : `/${path}`}`;
}
