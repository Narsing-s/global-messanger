import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve('src/main.tsx');
let source = fs.readFileSync(file, 'utf8');
if (!source.includes("from './offline-outbox'")) {
  source = source.replace(
    "import { installEnhancements } from './enhancements';",
    "import { installEnhancements } from './enhancements';\nimport { installOfflineOutbox, queueOfflineMessage, removeOfflineMessage, pendingOfflineMessages } from './offline-outbox';\n"
  );
}
if (!source.includes('const flushOfflineMessage =')) {
  const anchor = "  const fileRef=useRef<HTMLInputElement>(null),typingTimer=useRef<number|undefined>(undefined);";
  const injected = `${anchor}\n  const flushOfflineMessage = (message:any) => { if (!socket?.connected) return; socket.emit('message:send', message); };\n  useEffect(()=>{ const flush=installOfflineOutbox((message:any)=>flushOfflineMessage(message)); if(socket?.connected) flush(); return ()=>{}; },[socket]);`;
  if (!source.includes(anchor)) throw new Error('Offline outbox patch: composer anchor not found');
  source = source.replace(anchor, injected);
}
if (!source.includes('pendingOfflineMessages().forEach')) {
  source = source.replace("s.on('connect',()=>setSocketError(''));", "s.on('connect',()=>{setSocketError('');pendingOfflineMessages().forEach(message=>s.emit('message:send',message));});");
}
// The reliability patch already installs the canonical message:ack handler.
// Do not add a second listener: duplicate handlers caused duplicate outbox
// cleanup work and made delivery behavior harder to reason about.
if (!source.includes('gm-message-ack') && !source.includes('gm-offline-outbox-ack')) {
  const ack = "s.on('message:ack',(d:any)=>{if(d?.clientId)removeOfflineMessage(String(d.clientId));}); // gm-offline-outbox-ack\n";
  const deliveredAnchor = "s.on('message:delivered',()=>setSocketError(''));";
  if (source.includes(deliveredAnchor)) {
    source = source.replace(deliveredAnchor, ack + deliveredAnchor);
  } else {
    const connectAnchor = "s.on('connect_error',e=>setSocketError(e.message||'Realtime connection failed'));";
    if (!source.includes(connectAnchor)) throw new Error('Offline outbox patch: socket event anchor not found');
    source = source.replace(connectAnchor, connectAnchor + ack);
  }
}
const oldStart = "  function send(){const body=text.trim();if(!body||!active)return;";
if (source.includes(oldStart) && !source.includes('queueOfflineMessage({clientId')) {
  source = source.replace(oldStart, "  function send(){const body=text.trim();if(!body||!active)return;const clientId=crypto.randomUUID();const queued={conversationId:active.id,body,type:'text',replyToId:reply?.id||null,clientId,createdAt:Date.now()};if(!navigator.onLine||!socket?.connected){queueOfflineMessage(queued);setSocketError('Message saved offline. It will send automatically when connection returns.');setText('');setReply(null);return;}");
  source = source.replace("socket.emit('message:send',{conversationId:active.id,body,type:'text',replyToId:reply?.id||null,clientId:crypto.randomUUID()});", "socket.emit('message:send',queued);");
}
fs.writeFileSync(file, source);
console.log('[P0] durable offline outbox patch applied');
