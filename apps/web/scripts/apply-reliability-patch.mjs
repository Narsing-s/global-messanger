import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve(process.cwd(), 'src/main.tsx');
let source = fs.readFileSync(file, 'utf8');

const write = () => fs.writeFileSync(file, source);
const once = (marker, fn) => { if (source.includes(marker)) return false; fn(); return true; };

/* Durable client outbox + message status metadata. */
if (!source.includes("gm_message_outbox_v1")) {
  const typePattern = /type Message = \{([^}]+)\};/;
  const match = source.match(typePattern);
  if (!match) throw new Error('Web reliability patch: Message type anchor not found');
  const fields = match[1].trim();
  source = source.replace(typePattern, `type Message = {${fields}; __delivered?:boolean; __read?:boolean};`);
  const helpers = `\nconst OUTBOX_KEY='gm_message_outbox_v1';\nconst OUTBOX_MAX=200;\nconst readOutbox=():any[]=>{try{const v=JSON.parse(localStorage.getItem(OUTBOX_KEY)||'[]');return Array.isArray(v)?v.slice(-OUTBOX_MAX):[]}catch{return[]}};\nconst writeOutbox=(v:any[])=>localStorage.setItem(OUTBOX_KEY,JSON.stringify(v.slice(-OUTBOX_MAX)));\nconst queueMessage=(v:any)=>{const q=readOutbox();if(!q.some(x=>x.clientId===v.clientId)){q.push(v);writeOutbox(q)}};\n`;
  source = source.replace(/(const initials=)/, helpers + '$1');
}

/* Reconnect flushes queued sends. */
if (!source.includes('gm-outbox-flush')) {
  const connect = /s\.on\('connect',\(\)=>setSocketError\(''\)\);/;
  if (!connect.test(source)) throw new Error('Web reliability patch: connect anchor not found');
  source = source.replace(connect, "s.on('connect',()=>{setSocketError('');readOutbox().forEach(item=>s.emit('message:send',item));}); // gm-outbox-flush");
}

/* ACK removes an item from the durable outbox. */
if (!source.includes('gm-message-ack')) {
  const delivered = /s\.on\('message:delivered',\(\)=>setSocketError\(''\)\);/;
  if (!delivered.test(source)) throw new Error('Web reliability patch: delivery listener anchor not found');
  source = source.replace(delivered, "s.on('message:ack',(d:any)=>{if(d?.clientId)writeOutbox(readOutbox().filter(x=>x.clientId!==d.clientId));});s.on('message:delivered',()=>setSocketError('')); // gm-message-ack");
}

/* Ordered, duplicate-safe realtime events. */
if (!source.includes('gm-ordered-message-new')) {
  const event = /s\.on\('message:new',\(m:Message\)=>\{[^\n]+\}\);/;
  if (!event.test(source)) throw new Error('Web reliability patch: message:new anchor not found');
  source = source.replace(event, "s.on('message:new',(m:Message)=>{if(m.senderId!==me.id)messagePing();setMessages(p=>[...p.filter(x=>x.id!==m.id),m].sort((a,b)=>new Date(a.createdAt).getTime()-new Date(b.createdAt).getTime()));setChats(p=>p.map(c=>c.id===m.conversationId?{...c,messages:[m,...(c.messages||[]).filter(x=>x.id!==m.id)]}:c));}); // gm-ordered-message-new");
}

/* Persisted delivery/read receipt UI state. */
if (!source.includes('gm-receipt-events')) {
  const ack = "s.on('message:delivered',()=>setSocketError(''));";
  if (!source.includes(ack)) throw new Error('Web reliability patch: receipt anchor not found');
  source = source.replace(ack, "s.on('message:delivered',(d:any)=>{setSocketError('');if(d?.messageId)setMessages(p=>p.map(x=>x.id===d.messageId?{...x,__delivered:true}:x));});s.on('message:read',(d:any)=>{const ids=new Set(Array.isArray(d?.messageIds)?d.messageIds:[]);if(ids.size)setMessages(p=>p.map(x=>ids.has(x.id)?{...x,__read:true,__delivered:true}:x));}); // gm-receipt-events");
}

/* Offline sends become visible immediately and survive reloads/reconnects. */
if (!source.includes('gm-offline-send')) {
  const branch = "if(!socket?.connected){setSocketError('Reconnecting to Global Messenger…');socket?.connect();return}";
  if (!source.includes(branch)) throw new Error('Web reliability patch: send offline branch not found');
  const replacement = "if(!socket?.connected){const queued={conversationId:active.id,body,type:'text',replyToId:reply?.id||null,clientId:crypto.randomUUID(),queuedAt:new Date().toISOString()};queueMessage(queued);const optimistic:Message={id:`local-${queued.clientId}`,conversationId:active.id,senderId:user?.id||'',body,createdAt:new Date().toISOString(),type:'text',replyToId:queued.replyToId,clientId:queued.clientId};setMessages(p=>[...p,optimistic]);setText('');setReply(null);setSocketError('Offline — message saved and will send automatically when you reconnect.');socket?.connect();return} // gm-offline-send";
  source = source.replace(branch, replacement);
}

write();
console.log('Global Messenger web reliability patch applied.');
