import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname, '..');
const file = path.join(root, 'src', 'features.ts');
let source = fs.readFileSync(file, 'utf8');

if (source.includes('gm:screen-share-runtime')) process.exit(0);

const marker = "window.addEventListener('gm:call',";
const insert = `
// gm:screen-share-runtime: production screen sharing bridge for the active WebRTC peer.
let screenShareStream: MediaStream | null = null;
let cameraVideoTrack: MediaStreamTrack | null = null;

async function toggleScreenShare() {
  if (!pc || callKind !== 'video') throw new Error('Start a video call before sharing your screen.');
  if (screenShareStream) {
    const screenTrack = screenShareStream.getVideoTracks()[0];
    screenTrack?.stop();
    const sender = pc.getSenders().find(s => s.track?.kind === 'video');
    if (sender && cameraVideoTrack) await sender.replaceTrack(cameraVideoTrack);
    screenShareStream = null;
    const local = document.getElementById('gm-local-video') as HTMLVideoElement | null;
    if (local && stream) local.srcObject = stream;
    return false;
  }
  const media = await import('./call-media');
  screenShareStream = await media.getReliableScreenShare();
  const screenTrack = screenShareStream.getVideoTracks()[0];
  if (!screenTrack) throw new Error('No screen video track was created.');
  const sender = pc.getSenders().find(s => s.track?.kind === 'video');
  if (!sender) throw new Error('No video sender is available for this call.');
  cameraVideoTrack = stream?.getVideoTracks()[0] || null;
  await sender.replaceTrack(screenTrack);
  screenTrack.onended = () => { void toggleScreenShare(); };
  const local = document.getElementById('gm-local-video') as HTMLVideoElement | null;
  if (local) { local.srcObject = screenShareStream; void local.play().catch(() => {}); }
  return true;
}

function installScreenShareButton() {
  const footer = document.querySelector('.gm-call-card footer');
  if (!footer || document.getElementById('gm-call-share')) return;
  const button = document.createElement('button');
  button.id = 'gm-call-share';
  button.title = 'Share screen';
  button.textContent = '🖥️';
  button.addEventListener('click', async () => {
    try {
      const active = await toggleScreenShare();
      button.textContent = active ? '⏹️' : '🖥️';
      button.title = active ? 'Stop screen sharing' : 'Share screen';
    } catch (error) {
      alert(error?.message || 'Unable to share your screen.');
    }
  });
  footer.insertBefore(button, footer.lastElementChild);
}

`;
if (!source.includes(marker)) throw new Error('Call runtime marker not found');
source = source.replace(marker, insert + marker);
const renderMarker = "startTimer(); }";
if (!source.includes(renderMarker)) throw new Error('Call render marker not found');
source = source.replace(renderMarker, "startTimer(); if (localVideo) installScreenShareButton(); }");
source = source.replace("function reset() { stopRingtone();", "function reset() { screenShareStream?.getTracks().forEach(t => t.stop()); screenShareStream = null; cameraVideoTrack = null; stopRingtone();");
fs.writeFileSync(file, source);
