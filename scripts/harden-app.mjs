import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function patch(file, replacements) {
  const full = path.join(root, file);
  let source = fs.readFileSync(full, 'utf8');
  let changed = false;
  for (const [from, to] of replacements) {
    if (source.includes(to)) continue;
    if (!source.includes(from)) {
      console.warn(`[harden] pattern not found: ${file}`);
      continue;
    }
    source = source.replace(from, to);
    changed = true;
  }
  if (changed) {
    fs.writeFileSync(full, source, 'utf8');
    console.log(`[harden] patched ${file}`);
  }
}

// Keep chat switching inside one guarded async transaction. Never blank the
// current message list while another conversation is being fetched.
patch('apps/web/src/main.tsx', [
  [
    'const requestId=++messageRequest.current;setOtherTyping(false);setMenu(null);setReaction(null);setReply(null);setEditing(null);setEmojiOpen(false);if(socket.connected)socket.emit(\'conversation:join\',id);api.messages(id).then(data=>{if(cancelled||requestId!==messageRequest.current)return;const next=Array.isArray(data)?data.filter(m=>m?.conversationId===id):[];setMessages(next);setSocketError(\'\')}).catch(e=>{if(cancelled||requestId!==messageRequest.current)return;setSocketError(e.message||\'Unable to load messages\')}).finally(()=>{if(!cancelled&&requestId===messageRequest.current)setConversationLoading(false)});',
    'const requestId=++messageRequest.current;setOtherTyping(false);setMenu(null);setReaction(null);setReply(null);setEditing(null);setEmojiOpen(false);setConversationLoading(true);if(socket.connected)socket.emit(\'conversation:join\',id);api.messages(id).then(data=>{if(cancelled||requestId!==messageRequest.current)return;const next=Array.isArray(data)?data.filter(m=>m?.conversationId===id):[];setMessages(next);setSocketError(\'\')}).catch(e=>{if(cancelled||requestId!==messageRequest.current)return;setSocketError(e.message||\'Unable to load messages\')}).finally(()=>{if(!cancelled&&requestId===messageRequest.current)setConversationLoading(false)});'
  ],
  [
    "s.on('message:new',(m:Message)=>{if(m.senderId!==me.id)messagePing();setMessages(p=>p.some(x=>x.id===m.id)?p:[...p,m]);setChats(p=>p.map(c=>c.id===m.conversationId?{...c,messages:[m,...(c.messages||[])]}:c))});",
    "s.on('message:new',(m:Message)=>{if(!m?.id||!m?.conversationId)return;if(m.senderId!==me.id)messagePing();setMessages(p=>m.conversationId===activeConversationId.current?(p.some(x=>x.id===m.id)?p:[...p,m]):p);setChats(p=>p.map(c=>c.id===m.conversationId?{...c,messages:[m,...(c.messages||[])]}:c))});"
  ],
  [
    'const fileRef=useRef<HTMLInputElement>(null),lastTypingSound=useRef(0),messageRequest=useRef(0);',
    'const fileRef=useRef<HTMLInputElement>(null),lastTypingSound=useRef(0),messageRequest=useRef(0),activeConversationId=useRef<string|null>(null);'
  ],
  [
    'useEffect(()=>{if(!active||!socket)return;const id=String(active.id);',
    'useEffect(()=>{activeConversationId.current=active?String(active.id):null;if(!active||!socket)return;const id=String(active.id);'
  ],
  [
    "function Bubble({message,own,onReply,onMenu,menu,onEdit,onDelete,onReact,reactOpen,onEmoji}:{message:Message;own:boolean;",
    "function Bubble({message,own,onReply,onMenu,menu,onEdit,onDelete,onReact,reactOpen,onEmoji}:{message:Message;own:boolean;"
  ],
  [
    "new Date(message.createdAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})",
    "(Number.isNaN(new Date(message.createdAt).getTime())?'':new Date(message.createdAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}))"
  ]
]);

// Prevent development Socket.IO websocket proxy churn. Polling is stable in
// Vite dev; production still uses websocket first.
patch('apps/web/src/main.tsx', [
  [
    "const s=io(API,{auth:{token},transports:['websocket','polling'],reconnection:true,reconnectionAttempts:Infinity,reconnectionDelay:1000});",
    "const s=io(API,{auth:{token},transports:import.meta.env.DEV?['polling']:['websocket','polling'],upgrade:!import.meta.env.DEV,reconnection:true,reconnectionAttempts:Infinity,reconnectionDelay:1000});"
  ]
]);

// When a new socket connects, send it a snapshot of users already online.
patch('apps/server/src/index.ts', [
  [
    "    io.emit(\n      'presence:update',\n      {\n        userId,\n        online: true\n      }\n    );",
    "    io.emit(\n      'presence:update',\n      {\n        userId,\n        online: true\n      }\n    );\n\n    for (const [onlineUserId] of online) {\n      if (onlineUserId !== userId) {\n        socket.emit('presence:update', {\n          userId: onlineUserId,\n          online: true\n        });\n      }\n    }"
  ],
  [
    "    /* ---------------------------- Typing ---------------------------------- */",
    "    socket.on('conversation:leave', (conversationId: string) => {\n      if (conversationId) socket.leave(`conversation:${conversationId}`);\n    });\n\n    /* ---------------------------- Typing ---------------------------------- */"
  ]
]);

console.log('[harden] runtime hardening complete');
