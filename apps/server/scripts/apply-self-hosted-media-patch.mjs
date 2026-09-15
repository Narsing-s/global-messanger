import fs from 'node:fs';
import path from 'node:path';

const file=path.resolve(process.cwd(),'src/production-capabilities.ts');
if(!fs.existsSync(file))process.exit(0);
let text=fs.readFileSync(file,'utf8');
const before=text;
text=text.replace("const servers: any[] = [{ urls: ['stun:stun.l.google.com:19302'] }];","const servers: any[] = [];\n    // Self-hosted only: configure TURN_URL/TURN_USERNAME/TURN_CREDENTIAL on your own infrastructure.\n    // Never silently fall back to a third-party STUN/TURN provider.");
text=text.replace("iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }, ...(process.env.TURN_URL ? [{ urls: process.env.TURN_URL.split(',').map(x=>x.trim()), username: process.env.TURN_USERNAME, credential: process.env.TURN_CREDENTIAL }] : [])]","iceServers: process.env.TURN_URL ? [{ urls: process.env.TURN_URL.split(',').map(x=>x.trim()), username: process.env.TURN_USERNAME, credential: process.env.TURN_CREDENTIAL }] : []");
if(text!==before)fs.writeFileSync(file,text);
