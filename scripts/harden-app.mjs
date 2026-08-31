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

patch('apps/web/src/main.tsx', [
  ["type Chat={id:string;isGroup:boolean;title?:string|null;members:Member[];messages?:Message[]};", "type Chat={id:string;isGroup:boolean;title?:string|null;members:Member[];messages?:Message[];unreadCount?:number};"],
  ["const fileRef=useRef<HTMLInputElement>(null),lastTypingSound=useRef(0),messageRequest=useRef(0);", "const fileRef=useRef<HTMLInputElement>(null),lastTypingSound=useRef(0),messageRequest=useRef(0),activeConversationId=useRef<string|null>(null);"],
  ["useEffect(()=>{if(!active||!socket)return;const id=active.id;const requestId=++messageRequest.current;setOtherTyping(false);", "useEffect(()=>{activeConversationId.current=active?String(active.id):null;if(!active||!socket)return;const id=active.id;const requestId=++messageRequest.current;setOtherTyping(false);"],
  ["setEditing(null);setEmojiOpen(false);socket.emit('conversation:join',id);api.messages(id).then(data=>{", "setEditing(null);setEmojiOpen(false);setChats(p=>p.map(c=>c.id===id?{...c,unreadCount:0}:c));socket.emit('conversation:join',id);api.read(id).catch(()=>{});api.messages(id).then(data=>{"],
  ["s.on('message:new',(m:Message)=>{if(m.senderId!==me.id)messagePing();setMessages(p=>p.some(x=>x.id===m.id)?p:[...p,m]);setChats(p=>p.map(c=>c.id===m.conversationId?{...c,messages:[m,...(c.messages||[])]}:c))});", "s.on('message:new',(m:Message)=>{if(!m?.id||!m?.conversationId)return;const incoming=m.senderId!==me.id;if(incoming)messagePing();setMessages(p=>m.conversationId===activeConversationId.current?(p.some(x=>x.id===m.id)?p:[...p,m]):p);setChats(p=>p.map(c=>c.id===m.conversationId?{...c,messages:[m,...(c.messages||[])],unreadCount:incoming&&activeConversationId.current!==m.conversationId?(c.unreadCount||0)+1:c.unreadCount}:c))});"],
  ["<div className=\"avatar c1\">{initials(chatName(c,user.id))}</div><div className=\"chat-copy\">", "<div className=\"avatar c1 chat-avatar\">{initials(chatName(c,user.id))}{Boolean(c.unreadCount)&&<span className=\"unread-badge\">{c.unreadCount!>99?'99+':c.unreadCount}</span>}</div><div className=\"chat-copy\">"],
  ["<p>{c.messages?.[0]?.body||'Start a conversation'}</p>{Boolean(c.unreadCount)&&<span className=\"unread-badge\">{c.unreadCount!>99?'99+':c.unreadCount}</span>}", "<p>{c.messages?.[0]?.body||'Start a conversation'}</p>"],
  ["onClick={()=>{setResults([]);setQuery('');setActive(c)}}", "onClick={()=>{setResults([]);setQuery('');setChats(p=>p.map(x=>x.id===c.id?{...x,unreadCount:0}:x));setActive(c)}}"]
]);

patch('apps/web/src/styles.css', [
  [".chat-item{", ".chat-item{position:relative;"],
  [".chat-copy{min-width:0;flex:1}", ".chat-avatar{position:relative}.unread-badge{position:absolute;right:-4px;bottom:-3px;min-width:20px;height:20px;padding:0 5px;border:2px solid #fbfcff;border-radius:999px;display:grid;place-items:center;background:#536dfe;color:#fff;font-size:10px;font-weight:800;line-height:1;box-shadow:0 2px 7px #18203330}.chat-item.selected .unread-badge{border-color:#f0f2f8}.chat-copy{min-width:0;flex:1}"]
]);

patch('apps/server/src/index.ts', [
  ["    return prisma.conversation.findMany({\n      where: {\n        members: {\n          some: {\n            userId: id\n          }\n        }\n      },\n\n      orderBy: {\n        updatedAt: 'desc'\n      },\n\n      include: conversationInclude\n    });", "    const conversations = await prisma.conversation.findMany({\n      where: { members: { some: { userId: id } } },\n      orderBy: { updatedAt: 'desc' },\n      include: conversationInclude\n    });\n\n    return Promise.all(conversations.map(async conversation => {\n      const me = conversation.members.find(member => member.userId === id);\n      const unreadCount = await prisma.message.count({\n        where: {\n          conversationId: conversation.id,\n          senderId: { not: id },\n          ...(me?.lastReadAt ? { createdAt: { gt: me.lastReadAt } } : {})\n        }\n      });\n      return { ...conversation, unreadCount };\n    }));"]
]);

console.log('[harden] runtime hardening complete');
