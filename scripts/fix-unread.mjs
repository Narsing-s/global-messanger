import fs from 'node:fs';

const web = 'apps/web/src/main.tsx';
const css = 'apps/web/src/styles.css';
const server = 'apps/server/src/index.ts';

/*
 * Unread-count hardening.
 *
 * The badge belongs ONLY to the conversation avatar, like WhatsApp.
 * The source patch is intentionally regex/marker based because the
 * hardening scripts may run repeatedly and must remain idempotent.
 */

let s = fs.readFileSync(server, 'utf8');

// Add unreadCount to GET /api/conversations. Do not depend on exact whitespace.
if (!s.includes('/* unread-counts */')) {
  const marker = "    include: conversationInclude\n    });";
  const replacement = `    include: conversationInclude
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

  // Only patch the conversations route's first matching include by locating the route.
  const routeStart = s.indexOf("app.get(\n  '/api/conversations'");
  if (routeStart >= 0) {
    const routeEnd = s.indexOf("\n);", routeStart);
    if (routeEnd >= 0) {
      const route = s.slice(routeStart, routeEnd + 3);
      if (route.includes('return prisma.conversation.findMany({') && route.includes('include: conversationInclude')) {
        const patched = route.replace(marker, replacement);
        s = s.slice(0, routeStart) + patched + s.slice(routeEnd + 3);
      }
    }
  }
}

// Emit unread updates after a new message. Find the message:new broadcast block.
if (!s.includes("emit('unread:update'")) {
  const marker = ".emit(\n              'message:new',\n              {\n                ...message,\n\n                clientId:\n                  data.clientId\n              }\n            );";
  const replacement = `.emit(\n              'message:new',\n              {\n                ...message,\n                clientId: data.clientId\n              }\n            );

          // Update each recipient's chat-list badge in real time.
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
  if (s.includes(marker)) s = s.replace(marker, replacement);
}

// Make every socket join a private user room so unread:update reaches the user.
if (!s.includes("socket.join(`user:${userId}`)")) {
  const marker = 'io.on(\'connection\', socket => {';
  if (s.includes(marker)) {
    s = s.replace(marker, `${marker}\n  const userId = String(socket.data.user?.id ?? socket.handshake.auth?.userId ?? '');\n  if (userId) socket.join(\`user:\${userId}\`);`);
  }
}

fs.writeFileSync(server, s);

let w = fs.readFileSync(web, 'utf8');

// State for unread totals and a ref for the active conversation.
if (!w.includes('[unread,setUnread]')) {
  const marker = "[conversationLoading,setConversationLoading]=useState(false);";
  const replacement = "[conversationLoading,setConversationLoading]=useState(false),[unread,setUnread]=useState<Record<string,number>>({}),activeConversationRef=useRef('');";
  if (w.includes(marker)) w = w.replace(marker, replacement);
}

// Realtime unread badge updates.
if (!w.includes("s.on('unread:update'")) {
  const marker = "s.on('connect',()=>setSocketError(''));";
  const replacement = "s.on('connect',()=>setSocketError(''));s.on('unread:update',(d:any)=>{if(!d?.conversationId)return;const id=String(d.conversationId);setUnread(p=>({...p,[id]:id===activeConversationRef.current?0:Math.max(0,Number(d.unreadCount)||0)}));});";
  if (w.includes(marker)) w = w.replace(marker, replacement);
}

// Initialize badges from GET /api/conversations.
if (!w.includes('initialUnread')) {
  const marker = "setChats(Array.isArray(data)?data:[]);const next:Record<string,boolean>={};";
  const replacement = "const list=Array.isArray(data)?data:[];setChats(list);const initialUnread:Record<string,number>={};list.forEach((c:any)=>{initialUnread[String(c.id)]=Math.max(0,Number(c.unreadCount)||0)});setUnread(initialUnread);const next:Record<string,boolean>={};";
  if (w.includes(marker)) w = w.replace(marker, replacement);
}

// Track the active conversation and clear its badge after it is marked read.
if (!w.includes('activeConversationRef.current=id')) {
  const marker = "const id=active.id;const requestId=++messageRequest.current;";
  const replacement = "const id=active.id;activeConversationRef.current=id;const requestId=++messageRequest.current;";
  if (w.includes(marker)) w = w.replace(marker, replacement);
}

const readMarker = "api.read(id).catch(()=>{});setMobile(true);";
const readReplacement = "api.read(id).then(()=>setUnread(p=>({...p,[id]:0}))).catch(()=>{});setMobile(true);";
if (w.includes(readMarker)) w = w.replace(readMarker, readReplacement);

// Put the unread number on the avatar only.
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
