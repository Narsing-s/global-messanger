import { installEnhancements } from './enhancements';
import { initPushNotifications } from './push';

let ctx: AudioContext | null = null;
let audioUnlocked = false;
let ringtoneTimer: number | undefined;

function audio() {
  if (!audioUnlocked) return null;
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(freq: number, duration = .12, volume = .035) {
  try {
    const c = audio();
    if (!c) return;
    const o = c.createOscillator();
    const g = c.createGain();
    o.frequency.value = freq;
    o.type = 'sine';
    g.gain.setValueAtTime(volume, c.currentTime);
    g.gain.exponentialRampToValueAtTime(.001, c.currentTime + duration);
    o.connect(g);
    g.connect(c.destination);
    o.start(c.currentTime);
    o.stop(c.currentTime + duration);
  } catch {}
}

export function enableSounds() {
  audioUnlocked = true;
  try {
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    tone(760, .04, .012);
  } catch {}
}

export function messagePing() {
  tone(880, .09);
  setTimeout(() => tone(1175, .12), 80);
}

export function typingTick() {
  tone(520, .055, .024);
}

export function stopRingtone() {
  if (ringtoneTimer) window.clearInterval(ringtoneTimer);
  ringtoneTimer = undefined;
}

export function startRingtone(video = false) {
  enableSounds();
  stopRingtone();
  const play = () => {
    tone(video ? 660 : 540, .25, .055);
    setTimeout(() => tone(video ? 880 : 680, .3, .055), 280);
  };
  play();
  ringtoneTimer = window.setInterval(play, 1800);
}

if (typeof document !== 'undefined') {
  const unlock = () => enableSounds();
  document.addEventListener('pointerdown', unlock, { passive: true, once: true });
  document.addEventListener('keydown', unlock, { passive: true, once: true });
  queueMicrotask(() => {
    installEnhancements();
    if (localStorage.getItem('gm_token')) void initPushNotifications();
  });
}
