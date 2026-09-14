import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const file=fileURLToPath(new URL('../src/main.tsx',import.meta.url));
let source=fs.readFileSync(file,'utf8');
const marker='// e2ee-send-v2';
if(!source.includes(marker)){
  if(!source.includes("from './e2ee'")){
    const apiImport=source.match(/import\s*\{\s*api,\s*API\s*\}\s*from\s*['\"]\.\/api['\"];?/);
    if(apiImport) source=source.replace(apiImport[0],`${apiImport[0]}\nimport { encryptMessage } from './e2ee';`);
    else throw new Error('E2EE send patch: API import anchor not found');
  }

  // Support both the durable-outbox send shape and the current direct Socket.IO send shape.
  const offlineStart="  function send(){const body=text.trim();if(!body||!active)return;const clientId=crypto.randomUUID();const queued={conversationId:active.id,body,type:'text',replyToId:reply?.id||null,clientId,createdAt:Date.now()};";
  if(source.includes(offlineStart)){
    source=source.replace(offlineStart,"  async function send(){const body=text.trim();if(!body||!active)return;const encryptedBody=await encryptMessage(String(active.id),body);const clientId=crypto.randomUUID();const queued={conversationId:active.id,body:encryptedBody,type:'text',replyToId:reply?.id||null,clientId,createdAt:Date.now()};");
  } else {
    const currentSend="  function send(){const body=text.trim();if(!body||!active)return;if(editing){api.editMessage(editing.id,body).catch(e=>setSocketError(e.message));setEditing(null);setText('');return}if(!socket?.connected){setSocketError('Reconnecting to Global Messenger…');socket?.connect();return}socket.emit('message:send',{conversationId:active.id,body,type:'text',replyToId:reply?.id||null,clientId:crypto.randomUUID()});setText('');setReply(null);setEmojiOpen(false);socket.emit('typing',{conversationId:active.id,typing:false})}"
    if(source.includes(currentSend)){
      const replacement="  async function send(){const body=text.trim();if(!body||!active)return;if(editing){api.editMessage(editing.id,body).catch(e=>setSocketError(e.message));setEditing(null);setText('');return}if(!socket?.connected){setSocketError('Reconnecting to Global Messenger…');socket?.connect();return}const encryptedBody=await encryptMessage(String(active.id),body);socket.emit('message:send',{conversationId:active.id,body:encryptedBody,type:'text',replyToId:reply?.id||null,clientId:crypto.randomUUID()});setText('');setReply(null);setEmojiOpen(false);socket.emit('typing',{conversationId:active.id,typing:false})}";
      source=source.replace(currentSend,replacement);
    } else {
      const generic=/  function send\(\)\{const body=text\.trim\(\);if\(!body\|\|!active\)return;[\s\S]*?socket\.emit\('typing',\{conversationId:active\.id,typing:false\}\)\}/;
      if(!generic.test(source)) throw new Error('E2EE send patch: send anchor not found');
      source=source.replace(generic,match=>match.replace('  function send()','  async function send()').replace("socket.emit('message:send',{conversationId:active.id,body,type:'text'","const encryptedBody=await encryptMessage(String(active.id),body);socket.emit('message:send',{conversationId:active.id,body:encryptedBody,type:'text'"));
    }
  }

  source=source.replace(/\n  async function send\(\)/,`\n  ${marker}\n  async function send()`);
  fs.writeFileSync(file,source);
  console.log('E2EE send patch applied');
}
