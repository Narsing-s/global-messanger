declare global {
  interface Window {
    __GM_CONFIG__?: { API_URL?: string };
  }
}

/**
 * One API origin for browser, PWA and Capacitor.
 * Production native builds must never fall back to localhost.
 */
const DEFAULT_PRODUCTION_API = 'https://global-messanger-backend.onrender.com';

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
