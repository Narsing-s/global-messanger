import fs from 'node:fs';

const path = 'src/features.ts';
if (!fs.existsSync(path)) throw new Error(`Missing ${path}`);
let s = fs.readFileSync(path, 'utf8');
const importLine = "import { getReliableScreenShare } from './call-media';";
if (!s.includes(importLine)) s = `${importLine}\n${s}`;
const marker = "window.addEventListener('beforeunload', reset);";
const block = `window.addEventListener('gm:screen-share', async () => {\n  if (!pc || !stream) {\n    alert('Start a voice or video call before sharing your screen.');\n    return;\n  }\n  try {\n    const screen = await getReliableScreenShare();\n    const screenTrack = screen.getVideoTracks()[0];\n    const sender = pc.getSenders().find(s => s.track?.kind === 'video') || null;\n    if (!screenTrack || !sender) {\n      screen.getTracks().forEach(t => t.stop());\n      alert('Screen sharing requires an active video-capable call.');\n      return;\n    }\n    const cameraTrack = stream.getVideoTracks()[0] || null;\n    await sender.replaceTrack(screenTrack);\n    screenTrack.onended = () => {\n      void sender.replaceTrack(cameraTrack);\n      screen.getTracks().forEach(t => t.stop());\n    };\n  } catch (e: any) {\n    if (e?.name !== 'AbortError') alert(e?.message || 'Unable to share your screen.');\n  }\n});\n`;
if (!s.includes("window.addEventListener('gm:screen-share'")) {
  if (!s.includes(marker)) throw new Error(`Expected marker missing in ${path}`);
  s = s.replace(marker, `${block}${marker}`);
}
fs.writeFileSync(path, s);
