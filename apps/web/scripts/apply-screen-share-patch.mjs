import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve(process.cwd(), 'src/features.ts');
if (!fs.existsSync(file)) process.exit(0);
let s = fs.readFileSync(file, 'utf8');

const helper = `\nasync function toggleScreenShare() {\n  if (!pc || callKind !== 'video' || !stream) { alert('Screen sharing is available during a video call.'); return; }\n  const sender = pc.getSenders().find((x: RTCRtpSender) => x.track?.kind === 'video');\n  if (!sender) return;\n  const activeScreen = sender.track?.label?.toLowerCase().includes('screen') || false;\n  if (activeScreen) {\n    const camera = stream.getVideoTracks().find(t => !t.label.toLowerCase().includes('screen'));\n    if (camera) await sender.replaceTrack(camera);\n    const b = document.getElementById('gm-share'); if (b) b.textContent = '🖥️';\n    return;\n  }\n  if (!navigator.mediaDevices?.getDisplayMedia) { alert('Screen sharing is not supported by this browser.'); return; }\n  try {\n    const screen = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });\n    const track = screen.getVideoTracks()[0];\n    await sender.replaceTrack(track);\n    const b = document.getElementById('gm-share'); if (b) b.textContent = '⏹️';\n    track.onended = async () => {\n      const camera = stream?.getVideoTracks().find(t => !t.label.toLowerCase().includes('screen'));\n      if (camera && pc) await pc.getSenders().find((x: RTCRtpSender) => x.track?.kind === 'video')?.replaceTrack(camera);\n      const button = document.getElementById('gm-share'); if (button) button.textContent = '🖥️';\n    };\n  } catch (e) { console.warn('[Global Messenger calls] screen share cancelled:', e); }\n}\n`;

if (!s.includes('async function toggleScreenShare()')) {
  const marker = 'function toggleCamera() {';
  if (s.includes(marker)) s = s.replace(marker, helper + '\n' + marker);
}

const oldButton = `<button id=\"gm-camera\" style=\"border:0;border-radius:50%;width:52px;height:52px;font-size:20px\">📷</button>`;
const newButton = oldButton + `<button id=\"gm-share\" style=\"border:0;border-radius:50%;width:52px;height:52px;font-size:20px\">🖥️</button>`;
if (!s.includes('id="gm-share"') && s.includes(oldButton)) s = s.replace(oldButton, newButton);

const oldRender = `document.getElementById('gm-camera')?.addEventListener('click', toggleCamera); localPreview();`;
const newRender = `document.getElementById('gm-camera')?.addEventListener('click', toggleCamera); document.getElementById('gm-share')?.addEventListener('click', () => void toggleScreenShare()); localPreview();`;
if (s.includes(oldRender) && !s.includes("gm-share')?.addEventListener")) s = s.replace(oldRender, newRender);

fs.writeFileSync(file, s);
