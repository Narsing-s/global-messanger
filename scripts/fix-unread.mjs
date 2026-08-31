import fs from 'node:fs';

const web = 'apps/web/src/main.tsx';
const css = 'apps/web/src/styles.css';
const server = 'apps/server/src/index.ts';

// Backend: calculate unread messages per member from ConversationMember.lastReadAt
// and push unread changes in real time.
let s = fs.readFileSync(server, 'utf8');

const oldConversations = `    return prisma.conversation.findMany({\n      where: {\n        members: {\n          some: {\n            userId: id\n          }\n        }\n      },\n\n      orderBy: {\n        updatedAt: 'desc'\n      },\n\n      include: conversationInclude\n    });`;
const newConversations = `    const conversations = await prisma.conversation.findMany({\n      where: {\n        members: {\n          some: {\n            userId: id\n          }\n        }\n      },\n      orderBy: { updatedAt: 'desc' },\n      include: conversationInclude\n    });\n\n    return Promise.all(\n      conversations.map(async conversation => {\n        const me = conversation.members.find(member => member.userId === id);\n        const unreadCount = await prisma.message.count({\n          where: {\n            conversationId: conversation.id,\n            senderId: { not: id },\n            ...(me?.lastReadAt ? { createdAt: { gt: me.lastReadAt } } : {})\n          }\n        });\n        return { ...conversation, unreadCount };\n      })\n    );`;
if (s.includes(oldConversations) && !s.includes('return Promise.all(\n      conversations.map(async conversation')) {
  s = s.replace(oldConversations, newConversations);
}

const oldBroadcast = `          io\n            .to(\n              \`conversation:\${data.conversationId}\`\n            )\n            .emit(\n              'message:new',\n              {\n                ...message,\n\n                clientId:\n                  data.clientId\n              }\n            );`;
const newBroadcast = `          io\n            .to(\`conversation:\${data.conversationId}\`)\n            .emit('message:new', { ...message, clientId: data.clientId });\n\n          // Push the current unread total to every recipient's chat-list badge.\n          const recipients = await prisma.conversationMember.findMany({\n            where: { conversationId: data.conversationId, userId: { not: userId } },\n            select: { userId: true }\n          });\n          for (const recipient of recipients) {\n            const recipientMember = await prisma.conversationMember.findUnique({\n              where: { conversationId_userId: { conversationId: data.conversationId, userId: recipient.userId } },\n              select: { lastReadAt: true }\n            });\n            const unreadCount = await prisma.message.count({\n              where: {\n                conversationId: data.conversationId,\n                senderId: { not: recipient.userId },\n                ...(recipientMember?.lastReadAt ? { createdAt: { gt: recipientMember.lastReadAt } } : {})\n              }\n            });\n            io.to(\`user:\${recipient.userId}\`).emit('unread:update', {\n              conversationId: data.conversationId,\n              unreadCount\n            });\n          }`;
if (s.includes(oldBroadcast) && !s.includes("emit('unread:update'")) s = s.replace(oldBroadcast, newBroadcast);
fs.writeFileSync(server, s);

// Frontend: unread state lives on the conversation avatar only.
let w = fs.readFileSync(web, 'utf8');
const stateMarker = "[socketError,setSocketError]=useState(''),[presence,setPresence]=useState<Record<string,boolean>>({}),[conversationLoading,setConversationLoading]=useState(false);";
const stateReplacement = "[socketError,setSocketError]=useState(''),[presence,setPresence]=useState<Record<string,boolean>>({}),[conversationLoading,setConversationLoading]=useState(false),[unread,setUnread]=useState<Record<string,number>>({}),activeConversationRef=useRef('');";
if (w.includes(stateMarker) && !w.includes('[unread,setUnread]')) w = w.replace(stateMarker, stateReplacement);

const socketMarker = "s.on('connect',()=>setSocketError(''));";
const socketReplacement = "s.on('connect',()=>setSocketError(''));s.on('unread:update',(d:any)=>{if(!d?.conversationId)return;const id=String(d.conversationId);setUnread(p=>({...p,[id]:id===activeConversationRef.current?0:Math.max(0,Number(d.unreadCount)||0)}));});";
if (w.includes(socketMarker) && !w.includes("s.on('unread:update'")) w = w.replace(socketMarker, socketReplacement);

const chatLoadMarker = "setChats(Array.isArray(data)?data:[]);const next:Record<string,boolean>={};";
const chatLoadReplacement = "const list=Array.isArray(data)?data:[];setChats(list);const initialUnread:Record<string,number>={};list.forEach((c:any)=>{initialUnread[String(c.id)]=Math.max(0,Number(c.unreadCount)||0)});setUnread(initialUnread);const next:Record<string,boolean>={};";
if (w.includes(chatLoadMarker) && !w.includes('initialUnread')) w = w.replace(chatLoadMarker, chatLoadReplacement);

const effectMarker = "const id=String(active.id);const requestId=++messageRequest.current;";
const effectReplacement = "const id=String(active.id);activeConversationRef.current=id;const requestId=++messageRequest.current;";
if (w.includes(effectMarker) && !w.includes('activeConversationRef.current=id')) w = w.replace(effectMarker, effectReplacement);

const readMarker = "api.read(id).catch(()=>{});setMobile(true);";
const readReplacement = "api.read(id).then(()=>setUnread(p=>({...p,[id]:0}))).catch(()=>{});setMobile(true);";
if (w.includes(readMarker)) w = w.replace(readMarker, readReplacement);

const chatButtonMarker = "<button key={c.id}onClick={()=>{setResults([]);setQuery('');setActive(c)}}className={`chat-item ${active?.id===c.id?'selected':''}`}><div className=\"avatar c1\">{initials(chatName(c,user.id))}</div>";
const chatButtonReplacement = "<button key={c.id}onClick={()=>{setResults([]);setQuery('');setActive(c)}}className={`chat-item ${active?.id===c.id?'selected':''}`}><div className=\"avatar c1 profile-avatar-wrap\">{initials(chatName(c,user.id))}{(unread[c.id]||0)>0&&<span className=\"unread-badge\">{unread[c.id]>99?'99+':unread[c.id]}</span>}</div>";
if (w.includes(chatButtonMarker) && !w.includes('profile-avatar-wrap')) w = w.replace(chatButtonMarker, chatButtonReplacement);
fs.writeFileSync(web, w);

// Badge styling is intentionally local to the avatar; no top/bottom message counter.
let c = fs.readFileSync(css, 'utf8');
if (!c.includes('.profile-avatar-wrap')) {
  c += `\n\n/* WhatsApp-style unread count: attached to the chat profile/avatar only. */\n.profile-avatar-wrap{position:relative;overflow:visible!important}\n.unread-badge{position:absolute;right:-5px;top:-5px;min-width:19px;height:19px;padding:0 5px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;line-height:1;background:#25d366;color:#fff;border:2px solid #fff;box-sizing:border-box;z-index:4}\n`;
}
fs.writeFileSync(css, c);

console.log('[unread] WhatsApp-style profile unread badges applied');
