import fs from 'node:fs';

const file = new URL('../src/main.tsx', import.meta.url).pathname;
let source = fs.readFileSync(file, 'utf8');

if (!source.includes('chat-message-display-v2')) {
  source = source.replace(
    "import{installEnhancements}from'./enhancements';",
    "import{installEnhancements}from'./enhancements';import{decryptMessageCompat}from'./e2ee-compat';"
  );

  const helpers = `
// chat-message-display-v2: keep transport/control payloads out of the human chat UI.
const INTERNAL_CALL_PREFIXES=['__GM_CALL__','_GM_CALL_','gm:call:'];
function isInternalChatMessage(message:any){
  const body=typeof message?.body==='string'?message.body:'';
  return message?.type==='call-signal'||INTERNAL_CALL_PREFIXES.some(prefix=>body.startsWith(prefix));
}
function isEncryptedChatMessage(message:any){return typeof message?.body==='string'&&(message.body.startsWith('gm:e2ee:v1:')||message.body.startsWith('gme2ee:v1:'));}
async function cleanIncomingMessage(message:any){
  if(!message||isInternalChatMessage(message))return null;
  if(isEncryptedChatMessage(message)){
    try{
      const normalized=message.body.startsWith('gme2ee:v1:')?'gm:e2ee:v1:'+message.body.slice('gme2ee:v1:'.length):message.body;
      return {...message,body:await decryptMessageCompat(String(message.conversationId),normalized)};
    }catch{return {...message,body:'🔒 Encrypted message (not available on this device)'};}
  }
  return message;
}
async function cleanMessageList(list:any[]){
  const cleaned=await Promise.all((Array.isArray(list)?list:[]).map(cleanIncomingMessage));
  return cleaned.filter(Boolean);
}
async function cleanConversation(conversation:any){
  if(!conversation||typeof conversation!=='object')return conversation;
  return {...conversation,messages:await cleanMessageList(conversation.messages)};
}
function messagePreview(message:any){
  if(!message)return 'Start a conversation';
  if(isInternalChatMessage(message))return '';
  if(isEncryptedChatMessage(message))return '🔒 Encrypted message';
  if(message.attachmentUrl)return message.body&&message.body!=='Image'?String(message.body):'📎 Attachment';
  return typeof message.body==='string'&&message.body.trim()?message.body:'Message';
}
`;
  source = source.replace('class GlobalMessengerErrorBoundary', helpers + '\nclass GlobalMessengerErrorBoundary');

  source = source.replace(
    "s.on('message:new',(m:Message)=>{if(m.senderId!==me.id)messagePing();setMessages(p=>p.some(x=>x.id===m.id)?p:[...p,m]);setChats(p=>p.map(c=>c.id===m.conversationId?{...c,messages:[m,...(c.messages||[])]}:c))});",
    "s.on('message:new',async(m:Message)=>{const clean=await cleanIncomingMessage(m);if(!clean)return;if(clean.senderId!==me.id)messagePing();setMessages(p=>p.some(x=>x.id===clean.id)?p:[...p,clean]);setChats(p=>p.map(c=>c.id===clean.conversationId?{...c,messages:[clean,...(c.messages||[]).filter((x:any)=>x.id!==clean.id)]}:c))});"
  );

  source = source.replace(
    "api.conversations().then(data=>{setChats(Array.isArray(data)?data:[]);const next:Record<string,boolean>={};",
    "api.conversations().then(async data=>{const cleaned=await Promise.all((Array.isArray(data)?data:[]).map(cleanConversation));setChats(cleaned);const next:Record<string,boolean>={};"
  );
  source = source.replace(
    "(Array.isArray(data)?data:[]).forEach((c:Chat)=>c.members?.forEach",
    "cleaned.forEach((c:Chat)=>c.members?.forEach"
  );

  source = source.replace(
    "api.messages(id).then(data=>{if(requestId!==messageRequest.current||active?.id!==id)return;setMessages(Array.isArray(data)?data.filter(m=>m?.conversationId===id):[])}).catch",
    "api.messages(id).then(async data=>{if(requestId!==messageRequest.current||active?.id!==id)return;setMessages(await cleanMessageList((Array.isArray(data)?data:[]).filter(m=>m?.conversationId===id)))}).catch"
  );

  source = source.replace(
    "<p>{c.messages?.[0]?.body||'Start a conversation'}</p>",
    "<p>{messagePreview(c.messages?.find((m:any)=>!isInternalChatMessage(m)))}</p>"
  );

  source = source.replace(
    "{messages.filter(m=>m.conversationId===active.id).map(m=><Bubble",
    "{messages.filter(m=>m.conversationId===active.id&&!isInternalChatMessage(m)).map(m=><Bubble"
  );

  source = source.replace(
    "{reply.body}</span>",
    "{messagePreview(reply)}</span>"
  );

  fs.writeFileSync(file, source);
  console.log('Chat message display patch applied');
}
