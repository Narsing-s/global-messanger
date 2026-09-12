import fs from 'node:fs';
import path from 'node:path';

const file=path.resolve(process.cwd(),'src/features.ts');
if(!fs.existsSync(file))process.exit(0);
let s=fs.readFileSync(file,'utf8');
const helper=`\nfunction configuredIceServers(): RTCIceServer[] {\n  const raw = String(import.meta.env.VITE_TURN_URLS || '').trim();\n  const urls = raw ? raw.split(',').map((x: string) => x.trim()).filter(Boolean) : [];\n  const username = String(import.meta.env.VITE_TURN_USERNAME || '').trim();\n  const credential = String(import.meta.env.VITE_TURN_CREDENTIAL || '').trim();\n  const servers: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];\n  if (urls.length) servers.push({ urls, ...(username ? { username } : {}), ...(credential ? { credential } : {}) });\n  return servers;\n}\n`;
if(!s.includes('function configuredIceServers()'))s=s.replace('function sendSignal(conversationId: string, data: any) {',helper+'\nfunction sendSignal(conversationId: string, data: any) {');
s=s.replace("iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]","iceServers: configuredIceServers()");
fs.writeFileSync(file,s);
