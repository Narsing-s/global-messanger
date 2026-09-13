import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve('src/main.tsx');
let source = fs.readFileSync(file, 'utf8');
if (!source.includes("from './offline-outbox'")) {
  source = source.replace("import { installEnhancements } from './enhancements';", "import { installEnhancements } from './enhancements';\nimport { installOfflineOutbox, queueOfflineMessage, removeOfflineMessage, pendingOfflineMessages } from './offline-outbox';");
}

if (!source.includes('const flushOfflineMessage =')) {
  const anchor = "  const fileRef=useRef<HTMLInputElement>(null),typingTimer=useRef<number|undefined>(undefined);";
  const injected = `${anchor}\n  const flushOfflineMessage = (message:any) => { if (!socket?.connected) return; socket.emit('message:send', message); };\n  useEffect(()=>{ const flush=installOfflineOutbox((message:any)=>flushOfflineMessage(message)); if(socket?.connected) flush(); return ()=>{}; },[socket]);`;
  source = source.replace(anchor, injected);
}

if (!source.includes('pendingOfflineMessages().forEach')) {
  source = source.replace("s.on('connect',()=>setSocketError(''));", "s.on('connect',()=>{setSocketError(''); pendingOfflineMessages().forEach(message=>s.emit('message:send',message));});");
}

const oldStart = "  function send(){const body=text.trim();if(!body||!active)return;";
if (source.includes(oldStart) && !source.includes('queueOfflineMessage({clientId')) {
  source = source.replace(oldStart, "  function send(){const body=text.trim();if(!body||!active)return;const clientId=crypto.randomUUID();const queued={conversationId:active.id,body,type:'text',replyToId:reply?.id||null,clientId,createdAt:Date.now()};if(!navigator.onLine||!socket?.connected){queueOfflineMessage(queued);setSocketError('Message saved offline. It will send automatically when connection returns.');setText('');setReply(null);return;}");
  source = source.replace("socket.emit('message:send',{conversationId:active.id,body,type:'text',replyToId:reply?.id||null,clientId:crypto.randomUUID()});", "socket.emit('message:send',queued);removeOfflineMessage(clientId);");
}
fs.writeFileSync(file, source);
console.log('[P0] offline outbox patch applied');
