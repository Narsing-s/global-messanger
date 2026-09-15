declare global {
  interface Window {
    __GM_CONFIG__?: { API_URL?: string };
  }
}

/**
 * Runtime API routing for Global Messenger.
 *
 * Browser deployments use the injected API URL (or the production API).
 * A browser opened from localhost/127.0.0.1 always uses the same origin so
 * the self-hosted Docker stack works without stale localStorage/env values
 * sending requests to the public API and triggering CORS failures.
 * Native Capacitor/Ionic/file runtimes continue to use the configured API.
 */
const DEFAULT_PRODUCTION_API = 'https://global-messenger-api.narsingbeesetti006.workers.dev';
const native = ['capacitor:', 'ionic:', 'file:', 'null'].includes(window.location.protocol);
const localBrowser = !native && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const configured =
  window.__GM_CONFIG__?.API_URL ||
  import.meta.env.VITE_API_URL ||
  localStorage.getItem('gm_api_url') ||
  '';

const loopback = (value: string) => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/i.test(value);

export const API = localBrowser
  ? window.location.origin
  : (configured && (!loopback(configured) || import.meta.env.DEV)
      ? configured.replace(/\/$/, '')
      : DEFAULT_PRODUCTION_API);

export const isNativeRuntime = native;

export function apiUrl(path: string): string {
  return `${API}${path.startsWith('/') ? path : `/${path}`}`;
}
