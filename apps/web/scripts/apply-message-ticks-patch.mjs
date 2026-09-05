import fs from 'node:fs';

const file = new URL('../src/main.tsx', import.meta.url).pathname;
let source = fs.readFileSync(file, 'utf8');

// v2: keep generated content valid TSX. Styling belongs in styles.css.
if (!source.includes('message-ticks-v2')) {
  const mapAnchor = "{messages.filter(m=>m.conversationId===active.id&&!isInternalChatMessage(m)).map(m=><Bubble";
  if (!source.includes(mapAnchor)) throw new Error('Message ticks patch: message map anchor not found');
  source = source.replace(mapAnchor, "{messages.filter(m=>m.conversationId===active.id&&!isInternalChatMessage(m)).map(m=><Bubble delivered={m.senderId===user.id&&active&&!active.isGroup?isOnline(active.members.find(x=>x.user.id!==user.id)?.user.id):false}");

  const signature = "function Bubble({message,own,blocked,onReply,onMenu,menu,onEdit,onDelete,onReact,reactOpen,onEmoji}";
  if (!source.includes(signature)) throw new Error('Message ticks patch: Bubble signature anchor not found');
  source = source.replace(signature, "function Bubble({message,own,blocked,delivered,onReply,onMenu,menu,onEdit,onDelete,onReact,reactOpen,onEmoji}");

  const typeAnchor = "{message:Message;own:boolean;blocked:boolean;onReply";
  if (!source.includes(typeAnchor)) throw new Error('Message ticks patch: Bubble type anchor not found');
  source = source.replace(typeAnchor, "{message:Message;own:boolean;blocked:boolean;delivered:boolean;onReply");

  const status = "{own&&(blocked?<span aria-label=\"Sent\" title=\"Sent\" style={{fontSize:'13px',lineHeight:1}}>✓</span>:<CheckCheck size={13}/>)}";
  if (!source.includes(status)) throw new Error('Message ticks patch: status anchor not found');
  source = source.replace(status, "{own&&(delivered&&!blocked?<span className=\"message-status delivered\" aria-label=\"Delivered\" title=\"Delivered\">✓✓</span>:<span className=\"message-status sent\" aria-label=\"Sent\" title=\"Sent\">✓</span>)}");

  source = source.replace('function App(){', 'function App(){/* message-ticks-v2 */');
  fs.writeFileSync(file, source);
  console.log('Message ticks patch v2 applied');
}
