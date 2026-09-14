import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const file = path.join(root, 'src', 'components', 'CompleteOperationsCenter.tsx');
let source = fs.readFileSync(file, 'utf8');
const replacements = [
  ["request('/api/notifications').then(x=>setStatus(JSON.stringify(x)))", "request('/api/notifications/history').then(x=>setStatus(JSON.stringify(x)))"],
  ["request('/api/notifications/preferences')", "request('/api/account/preferences').then(x=>setStatus(JSON.stringify(x)))"],
  ["run(()=>request('/api/media/export'),'Media export requested')", "run(()=>request('/api/media/export'),'Media export ready')"],
  ["setStatus('Open the conversation call controls for voice/video.')", "activeChat&&window.dispatchEvent(new CustomEvent('gm:call',{detail:{type:'audio',conversationId:activeChat.id}}))"],
  ["setStatus('Open the conversation call controls for video.')", "activeChat&&window.dispatchEvent(new CustomEvent('gm:call',{detail:{type:'video',conversationId:activeChat.id}}))"],
  ["setStatus('Screen sharing is available from the active call.')", "window.dispatchEvent(new CustomEvent('gm:screen-share',{detail:{conversationId:activeChat?.id}}))"],
];
for (const [from, to] of replacements) {
  if (source.includes(from)) source = source.replace(from, to);
}
fs.writeFileSync(file, source);
console.log('[operations-hardening] canonical operations center hardened');
