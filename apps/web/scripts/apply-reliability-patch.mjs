import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve(process.cwd(), 'src/main.tsx');
let source = fs.readFileSync(file, 'utf8');

const replaceOnce = (needle, replacement, label) => {
  if (!source.includes(needle)) throw new Error(`Web reliability patch anchor not found: ${label}`);
  source = source.replace(needle, replacement);
};

if (!source.includes('const OUTBOX_KEY=')) {
  replaceOnce(
    "type Message={id:string;conversationId:string;senderId:string;body:string;createdAt:string;editedAt?:string|null;deletedAt?:string|null;sender?:User;type?:string;attachmentUrl?:string|null;attachmentName?:string|null;attachmentMime?:string|null;attachmentSize?:number|null;replyToId?:string|null;clientId?:string};",
    "type Message={id:string;conversationId:string;senderId:string;body:string;createdAt:string;editedAt?:string|null;deletedAt?:string|null;sender?:User;type?:string;attachmentUrl?:string|null;attachmentName?:string|null;attachmentMime?:string|null;attachmentSize?:number|null;replyToId?:string|null;clientId?:string;receipts?:Array<{userId:string;deliveredAt?:string|null;readAt?:string|null}>;__delivered?:boolean;__read?:boolean};const OUTBOX_KEY='gm_message_outbox_v1';const OUTBOX_MAX=200;const readOutbox=():any[]=>{try{const v=JSON.parse(localStorage.getItem(OUTBOX_KEY)||'[]');return Array.isArray(v)?v.slice(-OUTBOX_MAX):[]}catch{return[]}};const writeOutbox=(v:any[])=>localStorage.setItem(OUTBOX_KEY,JSON.stringify(v.slice(-OUTBOX_MAX)));const queueMessage=(v:any)=>{const q=readOutbox();if(!q.some(x=>x.clientId===v.clientId)){q.push(v);writeOutbox(q)}};",
    'message type + outbox helpers'
  );
}

const connectHandler = "s.on('connect',()=>setSocketError(''));";
if (!source.includes('flush-outbox-on-connect')) {
  replaceOnce(
    connectHandler,
    "s.on('connect',()=>{setSocketError('');const q=readOutbox();if(q.length){q.forEach(item=>s.emit('message:send',item));writeOutbox([]);}if(active?.id)s.emit('conversation:sync',{conversationId:active.id});});",
    'flush-outbox-on-connect'
  );
}

replaceOnce(
  "s.on('message:new',(m:Message)=>{if(m.senderId!==me.id)messagePing();setMessages(p=>p.some(x=>x.id===m.id)?p:[...p,m]);setChats(p=>p.map(c=>c.id===m.conversationId?{...c,messages:[m,...(c.messages||[])]}:c))});",
  "s.on('message:new',(m:Message)=>{if(m.senderId!==me.id)messagePing();setMessages(p=>[...p.filter(x=>x.id!==m.id),m].sort((a,b)=>new Date(a.createdAt).getTime()-new Date(b.createdAt).getTime()));setChats(p=>p.map(c=>c.id===m.conversationId?{...c,messages:[m,...(c.messages||[]).filter(x=>x.id!==m.id)]}:c))});",
  'ordered message:new'
);

replaceOnce(
  "s.on('message:delivered',()=>setSocketError(''));",
  "s.on('message:delivered',(d:any)=>{setSocketError('');if(d?.messageId)setMessages(p=>p.map(x=>x.id===d.messageId?{...x,__delivered:true}:x));});s.on('message:read',(d:any)=>{const ids=new Set(Array.isArray(d?.messageIds)?d.messageIds:[]);if(ids.size)setMessages(p=>p.map(x=>ids.has(x.id)?{...x,__read:true,__delivered:true}:x));});",
  'delivery and read status'
);

const activeLoad = "api.messages(id).then(data=>{if(requestId!==messageRequest.current||active?.id!==id)return;setMessages(Array.isArray(data)?data.filter(m=>m?.conversationId===id):[])}).catch";
if (!source.includes('incremental-sync-on-open')) {
  replaceOnce(
    activeLoad,
    "api.messages(id).then(data=>{if(requestId!==messageRequest.current||active?.id!==id)return;const ordered=Array.isArray(data)?data.filter(m=>m?.conversationId===id).sort((a,b)=>new Date(a.createdAt).getTime()-new Date(b.createdAt).getTime()):[];setMessages(ordered);const last=ordered[ordered.length-1]?.createdAt;return api.syncMessages(id,last).then(extra=>{if(requestId!==messageRequest.current||active?.id!==id)return;setMessages(p=>[...p.filter(x=>x.conversationId!==id||!extra.some(y=>y.id===x.id)),...extra].sort((a,b)=>new Date(a.createdAt).getTime()-new Date(b.createdAt).getTime()));}).catch(()=>{});}).catch",
    'incremental-sync-on-open'
  );
}

const offlineBranch = "if(!socket?.connected){setSocketError('Realtime connection is not connected. Reconnecting…');socket?.connect();return}";
if (!source.includes('offline outbox saved')) {
  replaceOnce(
    offlineBranch,
    "if(!socket?.connected){const queued={conversationId:active.id,body,type:'text',replyToId:reply?.id||null,clientId:crypto.randomUUID(),queuedAt:new Date().toISOString()};queueMessage(queued);setSocketError('You are offline. Message saved and will send automatically when connection returns.');setText('');setReply(null);socket?.connect();return}",
    'offline outbox saved'
  );
}

replaceOnce(
  "{own&&<CheckCheck size={13}/>}",
  "{own&&<span className={`message-status ${message.__read?'read':(message.__delivered?'delivered':'sent')}`} aria-label={message.__read?'Read':(message.__delivered?'Delivered':'Sent')}>{message.__delivered||message.__read?'✓✓':'✓'}</span>}",
  'status UI'
);

fs.writeFileSync(file, source);
