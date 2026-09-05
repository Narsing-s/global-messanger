import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve(process.cwd(), 'src/features.ts');
if (!fs.existsSync(file)) process.exit(0);

let source = fs.readFileSync(file, 'utf8');
const oldValue = "const API = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';";
const newValue = "const API = (window as any).__GM_CONFIG__?.API_URL || import.meta.env.VITE_API_URL || (import.meta.env.DEV ? window.location.origin : 'https://global-messanger-backend.onrender.com');";
if (source.includes(oldValue)) source = source.replace(oldValue, newValue);

// Calls: ring the caller only while the recipient is online, keep the calling screen
// open while waiting, and start the elapsed timer only after the call is answered.
if (!source.includes('gm-call-behavior-v3')) {
  source = source.replace(
    "function renderCall(title: string, showLocal: boolean) {",
    "// gm-call-behavior-v3\nlet gmOutgoingPresenceTimer: number | undefined;\nfunction isCallPeerOnline(c: any) { const me = JSON.parse(localStorage.getItem('gm_user') || '{}'); const member = c?.members?.find((m: any) => String(m.user?.id) !== String(me.id)); const uid = member?.user?.id; const presence = (window as any).__gmPresence || {}; return uid ? Boolean(presence[String(uid)]) : false; }\nfunction setConnectedTitle(title: string) { const head = document.querySelector('#gm-feature-overlay b'); if (head) head.textContent = title; }\nfunction stopCallPresenceWatch() { if (gmOutgoingPresenceTimer !== undefined) window.clearInterval(gmOutgoingPresenceTimer); gmOutgoingPresenceTimer = undefined; stopRingtone(); }\nfunction watchCallPeerPresence(c: any, video: boolean) { stopCallPresenceWatch(); const sync = () => { if (!document.getElementById('gm-feature-overlay')) { stopCallPresenceWatch(); return; } if (isCallPeerOnline(c)) startRingtone(video); else stopRingtone(); }; sync(); gmOutgoingPresenceTimer = window.setInterval(sync, 700); }\n\nfunction renderCall(title: string, showLocal: boolean) {"
  );
  source = source.replace(
    "localPreview(); startTimer(); }",
    "localPreview(); }"
  );
  source = source.replace(
    "renderCall(`Calling ${chatLabel()}`, kind === 'video'); hideSignalMessages();",
    "renderCall(`Calling ${chatLabel()}`, kind === 'video'); hideSignalMessages(); watchCallPeerPresence(c, kind === 'video');"
  );
  source = source.replace(
    "async function answer(d: any) { if (pc) { await pc.setRemoteDescription(d.answer);",
    "async function answer(d: any) { if (pc) { stopCallPresenceWatch(); setConnectedTitle(`Connected with ${chatLabel()}`); startTimer(); await pc.setRemoteDescription(d.answer);"
  );
  source = source.replace(
    "renderCall(`Connected with ${esc(d.fromName || 'Contact')}`, d.callKind === 'video'); hideSignalMessages();",
    "renderCall(`Connected with ${esc(d.fromName || 'Contact')}`, d.callKind === 'video'); startTimer(); hideSignalMessages();"
  );
}

fs.writeFileSync(file, source);
