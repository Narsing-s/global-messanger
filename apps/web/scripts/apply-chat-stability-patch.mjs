import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve(process.cwd(), 'src/main.tsx');
let source = fs.readFileSync(file, 'utf8');

if (!source.includes('blockedSent')) {
  source = source.replace(
    "[socketError,setSocketError]=useState(''),[presence,setPresence]=useState<Record<string,boolean>>({}),[conversationLoading,setConversationLoading]=useState(false),[aiLoading,setAiLoading]=useState(false);",
    "[socketError,setSocketError]=useState(''),[presence,setPresence]=useState<Record<string,boolean>>({}),[conversationLoading,setConversationLoading]=useState(false),[aiLoading,setAiLoading]=useState(false),[blockedSent,setBlockedSent]=useState<Record<string,boolean>>({});"
  );
  source = source.replace(
    "s.on('message:delivered',()=>setSocketError(''));",
    "s.on('message:delivered',()=>setSocketError(''));s.on('message:blocked',(d:any)=>{if(d?.messageId)setBlockedSent(p=>({...p,[String(d.messageId)]:true}))});"
  );
  source = source.replace(
    "<Bubble key={m.id}message={m}own={m.senderId===user.id}",
    "<Bubble key={m.id}message={m}own={m.senderId===user.id}blocked={!!blockedSent[m.id]}"
  );
  source = source.replace(
    "function Bubble({message,own,onReply,onMenu,menu,onEdit,onDelete,onReact,reactOpen,onEmoji}",
    "function Bubble({message,own,blocked,onReply,onMenu,menu,onEdit,onDelete,onReact,reactOpen,onEmoji}"
  );
  source = source.replace(
    "own:boolean;onReply",
    "own:boolean;blocked:boolean;onReply"
  );
  source = source.replace(
    "{own&&<CheckCheck size={13}/>}",
    "{own&&(blocked?<span aria-label=\"Sent\" title=\"Sent\" style={{fontSize:'13px',lineHeight:1}}>✓</span>:<CheckCheck size={13}/>)}"
  );
}

fs.writeFileSync(file, source);
