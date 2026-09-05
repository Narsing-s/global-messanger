import { installEnhancements } from './enhancements';
import { initPushNotifications } from './push';

let ctx: AudioContext | null = null;
let audioUnlocked = false;
let ringtoneTimer: number | undefined;
let lastTypingAt = 0;

function settings() { try { return JSON.parse(localStorage.getItem('gm_settings') || '{}'); } catch { return {}; } }
function soundEnabled() { return settings().sound !== false; }
function browserNotificationsEnabled() { return settings().browserNotifications === true; }
function audio() {
  if (!audioUnlocked || !soundEnabled()) return null;
  try { if (!ctx) ctx = new AudioContext(); if (ctx.state === 'suspended') void ctx.resume(); return ctx; } catch { return null; }
}
function tone(freq: number, duration = 0.12, volume = 0.035) {
  try { const c = audio(); if (!c || c.state !== 'running') return; const o = c.createOscillator(); const g = c.createGain(); o.frequency.value = freq; o.type = 'sine'; g.gain.setValueAtTime(volume, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration); o.connect(g); g.connect(c.destination); o.start(c.currentTime); o.stop(c.currentTime + duration); } catch {}
}
export function enableSounds() {
  audioUnlocked = true; if (!soundEnabled()) return;
  try { if (!ctx) ctx = new AudioContext(); if (ctx.state === 'suspended') void ctx.resume(); } catch {}
}
export function messagePing() { if (!soundEnabled()) return; tone(880, 0.09); window.setTimeout(() => tone(1175, 0.12), 80); }
export function showMessageNotification(title: string, body: string) {
  if (!browserNotificationsEnabled() || !('Notification' in window) || Notification.permission !== 'granted' || !document.hidden) return;
  try { new Notification(title || 'Global Messenger', { body: body || 'New message' }); } catch {}
}
export function typingTick() { tone(520, 0.055, 0.024); }
export function stopRingtone() { if (ringtoneTimer !== undefined) window.clearInterval(ringtoneTimer); ringtoneTimer = undefined; }
export function startRingtone(video = false) {
  if (!soundEnabled()) return; enableSounds(); stopRingtone();
  const play = () => { if (!soundEnabled()) { stopRingtone(); return; } tone(video ? 660 : 540, 0.25, 0.055); window.setTimeout(() => tone(video ? 880 : 680, 0.3, 0.055), 280); };
  play(); ringtoneTimer = window.setInterval(play, 1800);
}
if (typeof document !== 'undefined') {
  const unlock = () => enableSounds();
  document.addEventListener('pointerdown', unlock, { passive: true, once: true });
  document.addEventListener('keydown', unlock, { passive: true, once: true });
  document.addEventListener('input', event => {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement | null;
    if (!target || target.type === 'file' || target.disabled || target.readOnly || !target.matches('input:not([type="hidden"]), textarea')) return;
    if (!audioUnlocked) enableSounds(); const now = Date.now(); if (now - lastTypingAt < 90) return; lastTypingAt = now; typingTick();
  });
  queueMicrotask(() => { installEnhancements(); if (localStorage.getItem('gm_token')) void initPushNotifications(); });
}
