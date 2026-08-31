import fs from 'node:fs';

const web = 'apps/web/src/main.tsx';
const css = 'apps/web/src/styles.css';
const server = 'apps/server/src/index.ts';

let s = fs.readFileSync(server, 'utf8');

// GET /api/conversations: return an unreadCount for every conversation.
if (!s.includes('/* unread-counts */')) {
  const routeStart = s.indexOf("app.get(\n  '/api/conversations'");
  if (routeStart >= 0) {
    const routeEnd = s.indexOf("\n);", routeStart);
    if (routeEnd >= 0) {
      const route = s.slice(routeStart, routeEnd + 3);
      const find = /return prisma\.conversation\.findMany\(\{[\s\S]*?include:\s*conversationInclude\s*\}\);/;
      const replacement = `const conversations = await prisma.conversation.findMany({
      where: { members: { some: { userId: id } } },
      orderBy: { updatedAt: 'desc' },
      include: conversationInclude
    });

    /* unread-counts */
    return Promise.all(conversations.map(async conversation => {
      const me = conversation.members.find(member => member.userId === id);
      const unreadCount = await prisma.message.count({
        where: {
          conversationId: conversation.id,
          senderId: { not: id },
          ...(me?.lastReadAt ? { createdAt: { gt: me.lastReadAt } } : {})
        }
      });
      return { ...conversation, unreadCount };
    }));`;
      if (find.test(route)) {
        const patched = route.replace(find, replacement);
        s = s.slice(0, routeStart) + patched + s.slice(routeEnd + 3);
      }
    }
  }
}

// Realtime unread badge update after message persistence/broadcast.
if (!s.includes("emit('unread:update'")) {
  const marker = `              clientId:
                  data.clientId
              }
            );`;
  const replacement = `              clientId:
                  data.clientId
              }
            );

          const recipients = await prisma.conversationMember.findMany({
            where: { conversationId: data.conversationId, userId: { not: userId } },
            select: { userId: true, lastReadAt: true }
          });
          for (const recipient of recipients) {
            const unreadCount = await prisma.message.count({
              where: {
                conversationId: data.conversationId,
                senderId: { not: recipient.userId },
                ...(recipient.lastReadAt ? { createdAt: { gt: recipient.lastReadAt } } : {})
              }
            });
            io.to(\`user:\${recipient.userId}\`).emit('unread:update', {
              conversationId: data.conversationId,
              unreadCount
            });
          }`;
  // This exact block occurs in the message:new broadcast in the current server.
  if (s.includes(marker)) s = s.replace(marker, replacement);
}
fs.writeFileSync(server, s);

let w = fs.readFileSync(web, 'utf8');

if (!w.includes('[unread,setUnread]')) {
  const marker = "[conversationLoading,setConversationLoading]=useState(false);";
  const replacement = "[conversationLoading,setConversationLoading]=useState(false),[unread,setUnread]=useState<Record<string,number>>({}),activeConversationRef=useRef('');";
  if (w.includes(marker)) w = w.replace(marker, replacement);
}

if (!w.includes("s.on('unread:update'")) {
  const marker = "s.on('connect',()=>setSocketError(''));";
  const replacement = "s.on('connect',()=>setSocketError(''));s.on('unread:update',(d:any)=>{if(!d?.conversationId)return;const id=String(d.conversationId);setUnread(p=>({...p,[id]:id===activeConversationRef.current?0:Math.max(0,Number(d.unreadCount)||0)}));});";
  if (w.includes(marker)) w = w.replace(marker, replacement);
}

if (!w.includes('initialUnread')) {
  const marker = "setChats(Array.isArray(data)?data:[]);const next:Record<string,boolean>={};";
  const replacement = "const list=Array.isArray(data)?data:[];setChats(list);const initialUnread:Record<string,number>={};list.forEach((c:any)=>{initialUnread[String(c.id)]=Math.max(0,Number(c.unreadCount)||0)});setUnread(initialUnread);const next:Record<string,boolean>={};";
  if (w.includes(marker)) w = w.replace(marker, replacement);
}

if (!w.includes('activeConversationRef.current=id')) {
  const marker = "const id=active.id;const requestId=++messageRequest.current;";
  const replacement = "const id=active.id;activeConversationRef.current=id;const requestId=++messageRequest.current;";
  if (w.includes(marker)) w = w.replace(marker, replacement);
}

const readMarker = "api.read(id).catch(()=>{});setMobile(true);";
const readReplacement = "api.read(id).then(()=>setUnread(p=>({...p,[id]:0}))).catch(()=>{});setMobile(true);";
if (w.includes(readMarker)) w = w.replace(readMarker, readReplacement);

if (!w.includes('profile-avatar-wrap')) {
  const marker = '<div className="avatar c1">{initials(chatName(c,user.id))}</div><div className="chat-copy">';
  const replacement = '<div className="avatar c1 profile-avatar-wrap">{initials(chatName(c,user.id))}{(unread[c.id]||0)>0&&<span className="unread-badge">{unread[c.id]>99?\'99+\':unread[c.id]}</span>}</div><div className="chat-copy">';
  if (w.includes(marker)) w = w.replace(marker, replacement);
}
fs.writeFileSync(web, w);

let c = fs.readFileSync(css, 'utf8');
if (!c.includes('.profile-avatar-wrap')) {
  c += `\n\n/* WhatsApp-style unread count: attached to the chat profile/avatar only. */\n.profile-avatar-wrap{position:relative;overflow:visible!important}\n.unread-badge{position:absolute;right:-5px;top:-5px;min-width:19px;height:19px;padding:0 5px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;line-height:1;background:#25d366;color:#fff;border:2px solid #fff;box-sizing:border-box;z-index:4}\n`;
}
fs.writeFileSync(css, c);

console.log('[unread] WhatsApp-style profile unread badges applied');
