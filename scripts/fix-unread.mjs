import fs from 'node:fs';

const web = 'apps/web/src/main.tsx';
const server = 'apps/server/src/index.ts';

// ---------------------------------------------------------------------------
// Backend: calculate unread messages per member from ConversationMember.lastReadAt
// and push unread changes in real time. This keeps the badge on the chat row,
// not inside the message area.
// ---------------------------------------------------------------------------
let s = fs.readFileSync(server, 'utf8');

const oldConversations = `    return prisma.conversation.findMany({\n      where: {\n        members: {\n          some: {\n            userId: id\n          }\n        }\n      },\n\n      orderBy: {\n        updatedAt: 'desc'\n      },\n\n      include: conversationInclude\n    });`;

const newConversations = `    const conversations = await prisma.conversation.findMany({\n      where: {\n        members: {\n          some: {\n            userId: id\n          }\n        }\n      },\n      orderBy: {\n        updatedAt: 'desc'\n      },\n      include: conversationInclude\n    });\n\n    return Promise.all(\n      conversations.map(async conversation => {\n        const me = conversation.members.find(member => member.userId === id);\n        const unreadCount = await prisma.message.count({\n          where: {\n            conversationId: conversation.id,\n            senderId: { not: id },\n            ...(me?.lastReadAt ? { createdAt: { gt: me.lastReadAt } } : {})\n          }\n        });\n        return { ...conversation, unreadCount };\n      })\n    );`;

if (s.includes(oldConversations) && !s.includes('const unreadCount = await prisma.message.count')) {
  s = s.replace(oldConversations, newConversations);
}

const oldBroadcast = `          io\n            .to(\n              \`conversation:\${data.conversationId}\`\n            )\n            .emit(\n              'message:new',\n              {\n                ...message,\n\n                clientId:\n                  data.clientId\n              }\n            );`;

const newBroadcast = `          io\n            .to(\`conversation:\${data.conversationId}\`)\n            .emit('message:new', {\n              ...message,\n              clientId: data.clientId\n            });\n\n          // Update the recipient's chat-list badge immediately.\n          const recipients = await prisma.conversationMember.findMany({\n            where: {\n              conversationId: data.conversationId,\n              userId: { not: userId }\n            },\n            select: { userId: true }\n          });\n          for (const recipient of recipients) {\n            const recipientMember = await prisma.conversationMember.findUnique({\n              where: {\n                conversationId_userId: {\n                  conversationId: data.conversationId,\n                  userId: recipient.userId\n                }\n              },\n              select: { lastReadAt: true }\n            });\n            const unreadCount = await prisma.message.count({\n              where: {\n                conversationId: data.conversationId,\n                senderId: { not: recipient.userId },\n                ...(recipientMember?.lastReadAt\n                  ? { createdAt: { gt: recipientMember.lastReadAt } }\n                  : {})\n              }\n            });\n            io.to(\`user:\${recipient.userId}\`).emit('unread:update', {\n              conversationId: data.conversationId,\n              unreadCount\n            });\n          }`;

if (s.includes(oldBroadcast) && !s.includes("emit('unread:update'")) {
  s = s.replace(oldBroadcast, newBroadcast);
}

fs.writeFileSync(server, s);

// ---------------------------------------------------------------------------
// Frontend: render unread badge directly on the profile/avatar row, WhatsApp
// style. Opening the conversation marks it read and clears the badge.
// ---------------------------------------------------------------------------
let w = fs.readFileSync(web, 'utf8');

if (!w.includes('[unread,setUnread]')) {
  const marker = "[socketError,setSocketError]=useState(''),[presence,setPresence]=useState<Record<string,boolean>>({}),[conversationLoading,setConversationLoading]=useState(false);";
  const replacement = "[socketError,setSocketError]=useState(''),[presence,setPresence]=useState<Record<string,boolean>>({}),[conversationLoading,setConversationLoading]=useState(false),[unread,setUnread]=useState<Record<string,number>>({});";
  w = w.replace(marker, replacement);
}

const oldSocketConnect = "s.on('connect',()=>setSocketError(''));";
const newSocketConnect = "s.on('connect',()=>setSocketError(''));s.on('unread:update',(d:any)=>{if(!d?.conversationId)return;const id=String(d.conversationId);setUnread(p=>({...p,[id]:Math.max(0,Number(d.unreadCount)||0)}));});";
if (w.includes(oldSocketConnect) && !w.includes("s.on('unread:update'")) w = w.replace(oldSocketConnect, newSocketConnect);

const oldChatLoad = "setChats(Array.isArray(data)?data:[]);const next:Record<string,boolean>={};";
const newChatLoad = "const list=Array.isArray(data)?data:[];setChats(list);const initialUnread:Record<string,number>={};list.forEach((c:any)=>{initialUnread[String(c.id)]=Math.max(0,Number(c.unreadCount)||0)});setUnread(initialUnread);const next:Record<string,boolean>={};";
if (w.includes(oldChatLoad) && !w.includes('initialUnread')) w = w.replace(oldChatLoad, newChatLoad);

const oldRead = "api.read(id).catch(()=>{});setMobile(true);";
const newRead = "api.read(id).then(()=>setUnread(p=>({...p,[id]:0}))).catch(()=>{});setMobile(true);";
if (w.includes(oldRead)) w = w.replace(oldRead, newRead);

const oldChatButton = "<button key={c.id}onClick={()=>{setResults([]);setQuery('');setActive(c)}}className={`chat-item ${active?.id===c.id?'selected':''}`}><div className=\"avatar c1\">{initials(chatName(c,user.id))}</div>";
const newChatButton = "<button key={c.id}onClick={()=>{setResults([]);setQuery('');setActive(c)}}className={`chat-item ${active?.id===c.id?'selected':''}`}><div className=\"avatar c1 profile-avatar-wrap\">{initials(chatName(c,user.id))}{(unread[c.id]||0)>0&&<span className=\"unread-badge\">{unread[c.id]>99?'99+':unread[c.id]}</span>}</div>";
if (w.includes(oldChatButton) && !w.includes('profile-avatar-wrap')) w = w.replace(oldChatButton, newChatButton);

fs.writeFileSync(web, w);

console.log('[unread] WhatsApp-style profile unread badges applied');
